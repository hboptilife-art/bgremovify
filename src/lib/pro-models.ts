// Pro Model library — professional studio "empty body" scenes onto which
// products (watch, hat, shirt, shoe, outfit) are auto-snapped.
//
// Matrix: 5 body parts × 5 demographics × 3 skin tones = 75 slots.
// Only a subset is generated in the current wave; missing variants fall back
// to the closest available asset (adult_female · wheat by default).
//
// The output plugs directly into the existing SnapTemplate pipeline in
// snap-templates.ts — no separate applyTemplate path needed.

import type { SnapTemplate } from "./snap-templates";

// -- Generated pro-model asset pointers --
// Adult female (wave 1)
import wristFemaleLight from "@/assets/pro-models/wrist_female_light.jpg.asset.json";
import wristFemaleWheat from "@/assets/pro-models/wrist_female_wheat.jpg.asset.json";
import wristFemaleDark from "@/assets/pro-models/wrist_female_dark.jpg.asset.json";
import headFemaleLight from "@/assets/pro-models/head_female_light.jpg.asset.json";
import headFemaleWheat from "@/assets/pro-models/head_female_wheat.jpg.asset.json";
import headFemaleDark from "@/assets/pro-models/head_female_dark.jpg.asset.json";
import torsoFemaleLight from "@/assets/pro-models/torso_female_light.jpg.asset.json";
import torsoFemaleWheat from "@/assets/pro-models/torso_female_wheat.jpg.asset.json";
import torsoFemaleDark from "@/assets/pro-models/torso_female_dark.jpg.asset.json";
import footFemaleDark from "@/assets/pro-models/foot_female_dark.jpg.asset.json";
import fullFemaleLight from "@/assets/pro-models/full_female_light.jpg.asset.json";
import fullFemaleWheat from "@/assets/pro-models/full_female_wheat.jpg.asset.json";
import fullFemaleDark from "@/assets/pro-models/full_female_dark.jpg.asset.json";
// Adult male (wave 2)
import wristMaleLight from "@/assets/pro-models/wrist_adult_male_light.jpg.asset.json";
import wristMaleWheat from "@/assets/pro-models/wrist_adult_male_wheat.jpg.asset.json";
import wristMaleDark from "@/assets/pro-models/wrist_adult_male_dark.jpg.asset.json";
import headMaleLight from "@/assets/pro-models/head_adult_male_light.jpg.asset.json";
import headMaleWheat from "@/assets/pro-models/head_adult_male_wheat.jpg.asset.json";
import headMaleDark from "@/assets/pro-models/head_adult_male_dark.jpg.asset.json";
import torsoMaleLight from "@/assets/pro-models/torso_adult_male_light.jpg.asset.json";
import torsoMaleWheat from "@/assets/pro-models/torso_adult_male_wheat.jpg.asset.json";
import torsoMaleDark from "@/assets/pro-models/torso_adult_male_dark.jpg.asset.json";
import footMaleLight from "@/assets/pro-models/foot_adult_male_light.jpg.asset.json";
import footMaleWheat from "@/assets/pro-models/foot_adult_male_wheat.jpg.asset.json";
import footMaleDark from "@/assets/pro-models/foot_adult_male_dark.jpg.asset.json";
import fullMaleLight from "@/assets/pro-models/full_adult_male_light.jpg.asset.json";
import fullMaleWheat from "@/assets/pro-models/full_adult_male_wheat.jpg.asset.json";
import fullMaleDark from "@/assets/pro-models/full_adult_male_dark.jpg.asset.json";
// Girl (wave 3)
import wristGirlLight from "@/assets/pro-models/wrist_girl_light.jpg.asset.json";
import wristGirlWheat from "@/assets/pro-models/wrist_girl_wheat.jpg.asset.json";
import wristGirlDark from "@/assets/pro-models/wrist_girl_dark.jpg.asset.json";
import headGirlLight from "@/assets/pro-models/head_girl_light.jpg.asset.json";
import headGirlWheat from "@/assets/pro-models/head_girl_wheat.jpg.asset.json";
import headGirlDark from "@/assets/pro-models/head_girl_dark.jpg.asset.json";
import torsoGirlLight from "@/assets/pro-models/torso_girl_light.jpg.asset.json";
import torsoGirlWheat from "@/assets/pro-models/torso_girl_wheat.jpg.asset.json";
import torsoGirlDark from "@/assets/pro-models/torso_girl_dark.jpg.asset.json";
import footGirlLight from "@/assets/pro-models/foot_girl_light.jpg.asset.json";
import footGirlWheat from "@/assets/pro-models/foot_girl_wheat.jpg.asset.json";
import footGirlDark from "@/assets/pro-models/foot_girl_dark.jpg.asset.json";
import fullGirlLight from "@/assets/pro-models/full_girl_light.jpg.asset.json";
import fullGirlWheat from "@/assets/pro-models/full_girl_wheat.jpg.asset.json";
import fullGirlDark from "@/assets/pro-models/full_girl_dark.jpg.asset.json";
// Boy (wave 4)
import wristBoyLight from "@/assets/pro-models/wrist_boy_light.jpg.asset.json";
import wristBoyWheat from "@/assets/pro-models/wrist_boy_wheat.jpg.asset.json";
import wristBoyDark from "@/assets/pro-models/wrist_boy_dark.jpg.asset.json";
import headBoyLight from "@/assets/pro-models/head_boy_light.jpg.asset.json";
import headBoyWheat from "@/assets/pro-models/head_boy_wheat.jpg.asset.json";
import headBoyDark from "@/assets/pro-models/head_boy_dark.jpg.asset.json";
import torsoBoyLight from "@/assets/pro-models/torso_boy_light.jpg.asset.json";
import torsoBoyWheat from "@/assets/pro-models/torso_boy_wheat.jpg.asset.json";
import torsoBoyDark from "@/assets/pro-models/torso_boy_dark.jpg.asset.json";
import footBoyLight from "@/assets/pro-models/foot_boy_light.jpg.asset.json";
import footBoyWheat from "@/assets/pro-models/foot_boy_wheat.jpg.asset.json";
import footBoyDark from "@/assets/pro-models/foot_boy_dark.jpg.asset.json";
import fullBoyLight from "@/assets/pro-models/full_boy_light.jpg.asset.json";
import fullBoyWheat from "@/assets/pro-models/full_boy_wheat.jpg.asset.json";
import fullBoyDark from "@/assets/pro-models/full_boy_dark.jpg.asset.json";
// Infant (wave 5)
import wristInfantLight from "@/assets/pro-models/wrist_infant_light.jpg.asset.json";
import wristInfantWheat from "@/assets/pro-models/wrist_infant_wheat.jpg.asset.json";
import wristInfantDark from "@/assets/pro-models/wrist_infant_dark.jpg.asset.json";
import headInfantLight from "@/assets/pro-models/head_infant_light.jpg.asset.json";
import headInfantWheat from "@/assets/pro-models/head_infant_wheat.jpg.asset.json";
import headInfantDark from "@/assets/pro-models/head_infant_dark.jpg.asset.json";
import torsoInfantLight from "@/assets/pro-models/torso_infant_light.jpg.asset.json";
import torsoInfantWheat from "@/assets/pro-models/torso_infant_wheat.jpg.asset.json";
import torsoInfantDark from "@/assets/pro-models/torso_infant_dark.jpg.asset.json";
import footInfantLight from "@/assets/pro-models/foot_infant_light.jpg.asset.json";
import footInfantWheat from "@/assets/pro-models/foot_infant_wheat.jpg.asset.json";
import footInfantDark from "@/assets/pro-models/foot_infant_dark.jpg.asset.json";
import fullInfantLight from "@/assets/pro-models/full_infant_light.jpg.asset.json";
import fullInfantWheat from "@/assets/pro-models/full_infant_wheat.jpg.asset.json";
import fullInfantDark from "@/assets/pro-models/full_infant_dark.jpg.asset.json";
// Wave 6 — realistic wrists (replace flat mannequin renders) + full-body outfit variants
import wristMaleRealisticLight from "@/assets/pro-models/wrist_male_realistic_light.jpg.asset.json";
import wristMaleRealisticDark from "@/assets/pro-models/wrist_male_realistic_dark.jpg.asset.json";
import wristFemaleRealisticLight from "@/assets/pro-models/wrist_female_realistic_light.jpg.asset.json";
import wristFemaleRealisticDark from "@/assets/pro-models/wrist_female_realistic_dark.jpg.asset.json";
import fullMaleJeansLight from "@/assets/pro-models/full_male_jeans_light.jpg.asset.json";
import fullMaleShortsWheat from "@/assets/pro-models/full_male_shorts_wheat.jpg.asset.json";
import fullFemaleJeansLight from "@/assets/pro-models/full_female_jeans_light.jpg.asset.json";
import fullFemaleShortsWheat from "@/assets/pro-models/full_female_shorts_wheat.jpg.asset.json";

export type BodyPart = "wrist" | "head" | "torso" | "foot" | "full";
export type Demographic =
  | "adult_female"
  | "adult_male"
  | "girl"
  | "boy"
  | "infant";
export type SkinTone = "light" | "wheat" | "dark";

export const BODY_PARTS: {
  id: BodyPart;
  label: string;
  emoji: string;
  slot: { xPct: number; yPct: number; wPct: number; hPct: number; rotation: number };
  productHint: string;
}[] = [
  {
    id: "wrist",
    label: "Wrist",
    emoji: "⌚",
    slot: { xPct: 34, yPct: 40, wPct: 30, hPct: 24, rotation: -8 },
    productHint: "Watch · bracelet",
  },
  {
    id: "head",
    label: "Head",
    emoji: "🧢",
    slot: { xPct: 22, yPct: 4, wPct: 56, hPct: 36, rotation: 0 },
    productHint: "Hat · eyewear",
  },
  {
    id: "torso",
    label: "Torso",
    emoji: "👕",
    slot: { xPct: 22, yPct: 12, wPct: 56, hPct: 66, rotation: 0 },
    productHint: "Shirt · belt · necklace",
  },
  {
    id: "foot",
    label: "Foot",
    emoji: "👟",
    slot: { xPct: 20, yPct: 40, wPct: 60, hPct: 38, rotation: 0 },
    productHint: "Sneaker · shoe",
  },
  {
    id: "full",
    label: "Full body",
    emoji: "🧍",
    slot: { xPct: 26, yPct: 14, wPct: 48, hPct: 68, rotation: 0 },
    productHint: "Full outfit",
  },
];

export const DEMOGRAPHICS: { id: Demographic; label: string; emoji: string }[] = [
  { id: "adult_female", label: "Woman", emoji: "👩" },
  { id: "adult_male", label: "Man", emoji: "👨" },
  { id: "girl", label: "Girl", emoji: "👧" },
  { id: "boy", label: "Boy", emoji: "👦" },
  { id: "infant", label: "Infant", emoji: "👶" },
];

export const SKIN_TONES: { id: SkinTone; label: string; swatch: string }[] = [
  { id: "light", label: "Fair", swatch: "#f0d5b4" },
  { id: "wheat", label: "Wheat", swatch: "#c99a6b" },
  { id: "dark", label: "Dark", swatch: "#6b3d24" },
];

// -- Asset registry with fallback chain --
// Each key: `${part}_${demographic}_${tone}` → asset URL.
// Missing entries fall back through:
//   exact → same part+demographic wheat → same part adult_female tone → adult_female wheat
const RAW_ASSETS: Partial<Record<string, string>> = {
  // Adult female
  wrist_adult_female_light: wristFemaleRealisticLight.url,
  wrist_adult_female_wheat: wristFemaleLight.url,
  wrist_adult_female_dark: wristFemaleRealisticDark.url,
  head_adult_female_light: headFemaleLight.url,
  head_adult_female_wheat: headFemaleWheat.url,
  head_adult_female_dark: headFemaleDark.url,
  torso_adult_female_light: torsoFemaleLight.url,
  torso_adult_female_wheat: torsoFemaleWheat.url,
  torso_adult_female_dark: torsoFemaleDark.url,
  foot_adult_female_light: footFemaleDark.url,
  foot_adult_female_wheat: footFemaleDark.url,
  foot_adult_female_dark: footFemaleDark.url,
  full_adult_female_light: fullFemaleLight.url,
  full_adult_female_wheat: fullFemaleWheat.url,
  full_adult_female_dark: fullFemaleDark.url,
  // Adult male
  wrist_adult_male_light: wristMaleRealisticLight.url,
  wrist_adult_male_wheat: wristMaleLight.url,
  wrist_adult_male_dark: wristMaleRealisticDark.url,
  head_adult_male_light: headMaleLight.url,
  head_adult_male_wheat: headMaleWheat.url,
  head_adult_male_dark: headMaleDark.url,
  torso_adult_male_light: torsoMaleLight.url,
  torso_adult_male_wheat: torsoMaleWheat.url,
  torso_adult_male_dark: torsoMaleDark.url,
  foot_adult_male_light: footMaleLight.url,
  foot_adult_male_wheat: footMaleWheat.url,
  foot_adult_male_dark: footMaleDark.url,
  full_adult_male_light: fullMaleLight.url,
  full_adult_male_wheat: fullMaleWheat.url,
  full_adult_male_dark: fullMaleDark.url,
  // Girl
  wrist_girl_light: wristGirlLight.url,
  wrist_girl_wheat: wristGirlWheat.url,
  wrist_girl_dark: wristGirlDark.url,
  head_girl_light: headGirlLight.url,
  head_girl_wheat: headGirlWheat.url,
  head_girl_dark: headGirlDark.url,
  torso_girl_light: torsoGirlLight.url,
  torso_girl_wheat: torsoGirlWheat.url,
  torso_girl_dark: torsoGirlDark.url,
  foot_girl_light: footGirlLight.url,
  foot_girl_wheat: footGirlWheat.url,
  foot_girl_dark: footGirlDark.url,
  full_girl_light: fullGirlLight.url,
  full_girl_wheat: fullGirlWheat.url,
  full_girl_dark: fullGirlDark.url,
  // Boy
  wrist_boy_light: wristBoyLight.url,
  wrist_boy_wheat: wristBoyWheat.url,
  wrist_boy_dark: wristBoyDark.url,
  head_boy_light: headBoyLight.url,
  head_boy_wheat: headBoyWheat.url,
  head_boy_dark: headBoyDark.url,
  torso_boy_light: torsoBoyLight.url,
  torso_boy_wheat: torsoBoyWheat.url,
  torso_boy_dark: torsoBoyDark.url,
  foot_boy_light: footBoyLight.url,
  foot_boy_wheat: footBoyWheat.url,
  foot_boy_dark: footBoyDark.url,
  full_boy_light: fullBoyLight.url,
  full_boy_wheat: fullBoyWheat.url,
  full_boy_dark: fullBoyDark.url,
  // Infant
  wrist_infant_light: wristInfantLight.url,
  wrist_infant_wheat: wristInfantWheat.url,
  wrist_infant_dark: wristInfantDark.url,
  head_infant_light: headInfantLight.url,
  head_infant_wheat: headInfantWheat.url,
  head_infant_dark: headInfantDark.url,
  torso_infant_light: torsoInfantLight.url,
  torso_infant_wheat: torsoInfantWheat.url,
  torso_infant_dark: torsoInfantDark.url,
  foot_infant_light: footInfantLight.url,
  foot_infant_wheat: footInfantWheat.url,
  foot_infant_dark: footInfantDark.url,
  full_infant_light: fullInfantLight.url,
  full_infant_wheat: fullInfantWheat.url,
  full_infant_dark: fullInfantDark.url,
};

function resolveAsset(part: BodyPart, demo: Demographic, tone: SkinTone): string {
  const exact = RAW_ASSETS[`${part}_${demo}_${tone}`];
  if (exact) return exact;
  const sameDemoWheat = RAW_ASSETS[`${part}_${demo}_wheat`];
  if (sameDemoWheat) return sameDemoWheat;
  const adultFemaleTone = RAW_ASSETS[`${part}_adult_female_${tone}`];
  if (adultFemaleTone) return adultFemaleTone;
  return RAW_ASSETS[`${part}_adult_female_wheat`]!;
}

/** True when this exact (part, demo, tone) combo has a generated asset. */
export function proModelHasExactAsset(
  part: BodyPart,
  demo: Demographic,
  tone: SkinTone,
): boolean {
  return Boolean(RAW_ASSETS[`${part}_${demo}_${tone}`]);
}

/** Deterministic template id used across templates + thumbs registry. */
export function proModelId(part: BodyPart, demo: Demographic, tone: SkinTone): string {
  return `pro-${part}-${demo}-${tone}`;
}

// -- Generate SnapTemplate entries for the full 75-slot matrix --
function buildOne(part: BodyPart, demo: Demographic, tone: SkinTone): SnapTemplate {
  const meta = BODY_PARTS.find((p) => p.id === part)!;
  const demoMeta = DEMOGRAPHICS.find((d) => d.id === demo)!;
  const toneMeta = SKIN_TONES.find((t) => t.id === tone)!;
  const url = resolveAsset(part, demo, tone);
  const safe = url.replace(/"/g, "%22");
  return {
    id: proModelId(part, demo, tone),
    name: `${meta.label} · ${demoMeta.label} · ${toneMeta.label}`,
    emoji: meta.emoji,
    category: "humans",
    // `contain` keeps the model fully in-frame (no cropped heads); the solid
    // fill acts as automatic letterbox padding around the figure.
    background: `url("${safe}") center / contain no-repeat, #edeae4`,
    slot: meta.slot,
    swatch: `linear-gradient(180deg, ${toneMeta.swatch} 0%, #edeae4 100%)`,
  };
}

// Only expose full-body adult clothed models in the public matrix.
// Cropped body parts (wrist / head / torso / foot) and child variants read as
// mannequin placeholders and "cut leg" shots — hide them from the picker until
// dedicated realistic photography replaces them.
// Wrist crops read as awkward "cut arm" mock-ups in the picker — hide them
// until proper editorial wrist photography lands. Full-body models stay.
const EXPOSED_PARTS: BodyPart[] = ["full"];
const EXPOSED_DEMOS: Demographic[] = ["adult_female", "adult_male"];

const BASE_PRO_MODELS: SnapTemplate[] = BODY_PARTS
  .filter((p) => EXPOSED_PARTS.includes(p.id))
  .flatMap((p) =>
    DEMOGRAPHICS.filter((d) => EXPOSED_DEMOS.includes(d.id)).flatMap((d) =>
      SKIN_TONES.map((t) => buildOne(p.id, d.id, t.id)),
    ),
  );

// Outfit variants — extra full-body poses with jeans / shorts on top of the
// plain default full-body render. These share the "full" slot geometry so
// snapping keeps working; they're just extra scene choices in the picker.
const OUTFIT_VARIANTS: {
  id: string;
  label: string;
  url: string;
  swatch: string;
}[] = [
  { id: "pro-full-adult_male-jeans-light", label: "Man · Jeans · Fair", url: fullMaleJeansLight.url, swatch: "#f0d5b4" },
  { id: "pro-full-adult_male-shorts-wheat", label: "Man · Shorts · Wheat", url: fullMaleShortsWheat.url, swatch: "#c99a6b" },
  { id: "pro-full-adult_female-jeans-light", label: "Woman · Jeans · Fair", url: fullFemaleJeansLight.url, swatch: "#f0d5b4" },
  { id: "pro-full-adult_female-shorts-wheat", label: "Woman · Shorts · Wheat", url: fullFemaleShortsWheat.url, swatch: "#c99a6b" },
];

const fullMeta = BODY_PARTS.find((p) => p.id === "full")!;
const OUTFIT_TEMPLATES: SnapTemplate[] = OUTFIT_VARIANTS.map((v) => {
  const safe = v.url.replace(/"/g, "%22");
  return {
    id: v.id,
    name: v.label,
    emoji: "🧍",
    category: "humans",
    background: `url("${safe}") center / contain no-repeat, #edeae4`,
    slot: fullMeta.slot,
    swatch: `linear-gradient(180deg, ${v.swatch} 0%, #edeae4 100%)`,
  };
});

export const PRO_MODEL_TEMPLATES: SnapTemplate[] = [...BASE_PRO_MODELS, ...OUTFIT_TEMPLATES];

export const PRO_MODEL_THUMBS: Record<string, string> = Object.fromEntries(
  PRO_MODEL_TEMPLATES.map((tpl) => {
    // Reuse the asset URL from the background as the picker thumbnail.
    const match = tpl.background.match(/url\("([^"]+)"\)/);
    return [tpl.id, match?.[1] ?? ""];
  }),
);
