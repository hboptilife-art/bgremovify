// Server-only Replicate helper for the Pro background removal tier.
// Calls the Replicate HTTP API directly using REPLICATE_API_TOKEN.

const REPLICATE_API = "https://api.replicate.com/v1";

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export interface Prediction {
  id: string;
  status: PredictionStatus;
  output: unknown;
  error: string | null;
  urls?: { get?: string };
}

/**
 * Fire-and-return: create a Replicate prediction and return immediately with its ID.
 * Caller polls status via `getReplicatePrediction(id)` on its own schedule.
 * This is the polling-friendly variant that avoids holding the Cloudflare Worker
 * fetch open during long cold starts (~50s on FLUX Fill Pro, etc.).
 */
export async function createReplicatePrediction(
  modelSlug: string,
  input: Record<string, unknown>,
  opts: { official?: boolean; version?: string } = {},
): Promise<Prediction> {
  const url = opts.official
    ? `${REPLICATE_API}/models/${modelSlug}/predictions`
    : `${REPLICATE_API}/predictions`;

  const body: Record<string, unknown> = { input };
  if (!opts.official) {
    const version = opts.version ?? (await resolveLatestVersion(modelSlug));
    body.version = version;
  }

  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as Prediction;
    lastStatus = res.status;
    lastBody = await res.text();
    if (res.status !== 429) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    await wait((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5) * 1000);
  }
  throw new Error(`replicate_create_failed:${lastStatus}:${lastBody.slice(0, 200)}`);
}

/**
 * Get current status/output of a Replicate prediction by ID. Non-blocking — one HTTP call.
 */
export async function getReplicatePrediction(id: string): Promise<Prediction> {
  const res = await fetch(`${REPLICATE_API}/predictions/${id}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`replicate_poll_failed:${res.status}:${body.slice(0, 200)}`);
  }
  return (await res.json()) as Prediction;
}


function authHeaders() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("replicate_token_missing");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVersionUnavailable(status: number, body: string) {
  return (
    status === 404 ||
    status === 410 ||
    (status === 422 && /invalid version|does not exist|permission/i.test(body))
  );
}

async function resolveLatestVersion(modelSlug: string): Promise<string> {
  const metaRes = await fetch(`${REPLICATE_API}/models/${modelSlug}`, {
    headers: authHeaders(),
  });
  if (!metaRes.ok) {
    const body = await metaRes.text();
    throw new Error(`replicate_model_lookup_failed:${metaRes.status}:${body.slice(0, 200)}`);
  }
  const meta = (await metaRes.json()) as { latest_version?: { id?: string } };
  const versionId = meta.latest_version?.id;
  if (!versionId) throw new Error("replicate_no_version");
  return versionId;
}

async function createPredictionWithRetry(
  body: Record<string, unknown>,
): Promise<{ prediction: Prediction } | { errorStatus: number; errorBody: string }> {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const createRes = await fetch(`${REPLICATE_API}/predictions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (createRes.ok) {
      return { prediction: (await createRes.json()) as Prediction };
    }

    lastStatus = createRes.status;
    lastBody = await createRes.text();

    if (createRes.status !== 429 || attempt === 3) break;

    const retryAfter = Number(createRes.headers.get("retry-after"));
    const retryAfterFromBody = (() => {
      try {
        const parsed = JSON.parse(lastBody) as { retry_after?: unknown };
        const n = Number(parsed.retry_after);
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch {
        return null;
      }
    })();
    const delaySeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : retryAfterFromBody;
    await wait((delaySeconds ?? 15) * 1000);
  }

  return { errorStatus: lastStatus, errorBody: lastBody };
}

/**
 * Run a Replicate model and wait for it to finish.
 * Uses an official-model endpoint shape: /v1/models/{owner}/{name}/predictions
 */
export async function runReplicateModel(
  modelSlug: string,
  input: Record<string, unknown>,
  opts: { timeoutMs?: number; version?: string } = {},
): Promise<Prediction> {
  const timeoutMs = opts.timeoutMs ?? 120_000;

  // Resolve candidates dynamically. If a pinned hash is revoked/deprecated,
  // retry once with the current latest_version before failing the user flow.
  const versionCandidates: string[] = [];
  if (opts.version) versionCandidates.push(opts.version);
  const latestVersion = await resolveLatestVersion(modelSlug);
  if (!versionCandidates.includes(latestVersion)) versionCandidates.push(latestVersion);

  let prediction: Prediction | null = null;
  let lastCreateStatus = 0;
  let lastCreateBody = "";

  for (const version of versionCandidates) {
    const created = await createPredictionWithRetry({ version, input });
    if ("prediction" in created) {
      prediction = created.prediction;
      break;
    }

    lastCreateStatus = created.errorStatus;
    lastCreateBody = created.errorBody;

    if (!isVersionUnavailable(created.errorStatus, created.errorBody)) break;
    console.warn(`[replicate] version unavailable for ${modelSlug}, trying fallback`, {
      status: created.errorStatus,
    });
  }

  if (!prediction) {
    throw new Error(`replicate_create_failed:${lastCreateStatus}:${lastCreateBody.slice(0, 200)}`);
  }

  const deadline = Date.now() + timeoutMs;

  while (
    (prediction.status === "starting" || prediction.status === "processing") &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 1200));
    const pollRes = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
      headers: authHeaders(),
    });
    if (!pollRes.ok) {
      const body = await pollRes.text();
      throw new Error(`replicate_poll_failed:${pollRes.status}:${body.slice(0, 200)}`);
    }
    prediction = (await pollRes.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`replicate_status_${prediction.status}:${prediction.error ?? ""}`);
  }

  return prediction;
}

/**
 * Run an official Replicate model by slug without resolving a version first.
 * Some official partner models (for example BRIA Eraser) are exposed through
 * the model endpoint but block /models/{owner}/{name} metadata lookups for the
 * current token, so version-based prediction creation fails before the model
 * even gets a chance to run.
 */
export async function runReplicateOfficialModel(
  modelSlug: string,
  input: Record<string, unknown>,
  opts: { timeoutMs?: number } = {},
): Promise<Prediction> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let prediction: Prediction | null = null;
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const createRes = await fetch(`${REPLICATE_API}/models/${modelSlug}/predictions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ input }),
    });

    if (createRes.ok) {
      prediction = (await createRes.json()) as Prediction;
      break;
    }

    lastStatus = createRes.status;
    lastBody = await createRes.text();
    if (createRes.status !== 429 || attempt === 3) break;

    const retryAfter = Number(createRes.headers.get("retry-after"));
    await wait((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 15) * 1000);
  }

  if (!prediction) {
    throw new Error(`replicate_model_create_failed:${lastStatus}:${lastBody.slice(0, 200)}`);
  }

  const deadline = Date.now() + timeoutMs;
  while (
    (prediction.status === "starting" || prediction.status === "processing") &&
    Date.now() < deadline
  ) {
    await wait(1200);
    const pollRes = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
      headers: authHeaders(),
    });
    if (!pollRes.ok) {
      const body = await pollRes.text();
      throw new Error(`replicate_poll_failed:${pollRes.status}:${body.slice(0, 200)}`);
    }
    prediction = (await pollRes.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`replicate_status_${prediction.status}:${prediction.error ?? ""}`);
  }

  return prediction;
}

/**
 * Fetch a Replicate output URL and return a base64-encoded data URL.
 */
export async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`replicate_download_failed:${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buf = new Uint8Array(await res.arrayBuffer());
  // Worker-runtime safe base64 encoding.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  return `data:${contentType};base64,${base64}`;
}
