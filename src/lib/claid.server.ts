// Claid.ai API server-only client.
// Docs: https://docs.claid.ai/
// Auth: Bearer <CLAID_API_KEY>. Endpoints used:
//   - POST /v1-beta1/image/edit  → sync image editing (bg removal, upscale, etc.)
// Response shape: { data: { output: { tmp_url: string, ... } } }

const CLAID_BASE = "https://api.claid.ai/v1-beta1";

export function getClaidKey(): string {
  const key = process.env.CLAID_API_KEY;
  if (!key) throw new Error("claid_not_configured");
  return key;
}

type ClaidEditResponse = {
  data?: {
    output?: {
      tmp_url?: string;
      url?: string;
    };
  };
  errors?: unknown;
  message?: string;
};

/** Data URL → base64 payload accepted by Claid `input`. */
function dataUrlToBase64(dataUrl: string): string {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("invalid_image_payload");
  return match[2];
}

async function claidEdit(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${CLAID_BASE}/image/edit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getClaidKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: ClaidEditResponse;
  try {
    json = JSON.parse(text) as ClaidEditResponse;
  } catch {
    throw new Error(`claid_bad_json:${res.status}:${text.slice(0, 240)}`);
  }
  if (!res.ok) {
    throw new Error(`claid_http_${res.status}:${json.message || text.slice(0, 240)}`);
  }
  const url = json.data?.output?.tmp_url || json.data?.output?.url;
  if (!url) throw new Error(`claid_no_output:${text.slice(0, 240)}`);
  return url;
}

/** Remove background with Claid. Input = base64 image; returns processed PNG data URL. */
export async function claidRemoveBackground(imageDataUrl: string): Promise<string> {
  const base64 = dataUrlToBase64(imageDataUrl);
  const url = await claidEdit({
    input: `data:image/png;base64,${base64}`,
    operations: {
      background: { remove: true },
    },
    output: {
      format: { type: "png" },
      metadata: { dpi: 72 },
    },
  });
  return fetchAsPngDataUrl(url);
}

/** Fetch remote image URL and return as data URL (so client renders without CORS). */
export async function fetchAsPngDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`claid_fetch_${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(buf).toString("base64");
  return `data:image/png;base64,${b64}`;
}
