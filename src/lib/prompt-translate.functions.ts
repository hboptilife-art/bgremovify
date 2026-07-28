import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Doğal Dil Orkestra Şefi: Kullanıcının kendi dilinde yazdığı serbest metni
// Lovable AI Gateway (Google Gemini) ile analiz edip FLUX Fill Pro için
// kusursuz, kısa ve İngilizce bir inpainting prompt'una çevirir.

type TranslateResult =
  | { ok: true; prompt: string }
  | { ok: false; reason: "empty" | "gateway_error" | "no_output"; detail?: string };

const SYSTEM_PROMPT = [
  "ROLE & OBJECTIVE: You are the Multilingual AI Orchestration Layer for FLUX Fill Pro inpainting.",
  "Take raw user prompts in ANY language (Turkish, Russian, Dutch, Arabic, French, German, Spanish, etc.), accurately interpret intent, and translate/expand into ONE highly detailed, professional descriptive prompt in ENGLISH.",
  "",
  "CRITICAL ARCHITECTURAL RULES:",
  "1) MULTILINGUAL TRANSLATION: Auto-detect input language and always output strictly in English. Convert local nuances, slang, or mixed-language terms into clear professional design terminology.",
  "2) PRESERVE OBJECT GEOMETRY: Instruct the model to strictly maintain the exact structural geometry, original silhouettes, proportions, and intrinsic boundaries of the masked object. Do not alter fundamental shape or industrial design lines.",
  "3) FORBID DEFORMATION & WRINKLES: When adding textures, patterns, embroideries, prints, or design elements, explicitly command a seamless overlay/embroidery that conforms perfectly to the existing surface. Strictly forbid artificial wrinkles, unexpected folds, fabric puckering, bunching, or distortions that compromise the original smooth, rigid, or high-end factory finish.",
  "4) PRISTINE PRODUCT QUALITY: Direct the model to treat the modification with extreme precision — keep the object pristine, professionally manufactured, defect-free, with accurate lighting, shadows, and material fidelity matching the source photo.",
  "",
  "OUTPUT FORMAT: Return ONLY the final English prompt — no quotes, no prefixes, no explanations, no markdown. Max ~60 words. If the user asks to remove/clean something, describe the clean background/surface that should replace it while preserving surrounding geometry and lighting.",
].join(" ");


export const translateInpaintPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => ({
    text: String(input?.text ?? "").slice(0, 1000).trim(),
  }))
  .handler(async ({ data }): Promise<TranslateResult> => {
    if (!data.text) return { ok: false, reason: "empty" };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, reason: "gateway_error", detail: "missing_key" };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: data.text },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("[translateInpaintPrompt] gateway failed", res.status, body.slice(0, 300));
        return { ok: false, reason: "gateway_error", detail: `${res.status}` };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
      const clean = raw
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/^prompt:\s*/i, "")
        .trim();

      if (!clean) return { ok: false, reason: "no_output" };
      return { ok: true, prompt: clean.slice(0, 500) };
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown";
      console.error("[translateInpaintPrompt] threw", detail);
      return { ok: false, reason: "gateway_error", detail };
    }
  });
