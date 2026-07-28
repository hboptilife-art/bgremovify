// Snap templates — zero-AI-cost scene compositor.
//
// Each template defines:
//   • A CSS `background` for the locked backdrop layer.
//   • A `slot` rectangle (in canvas %) where the current product image is
//     dropped, aspect-preserved.
//   • Optional `textOverlays` (in canvas %) that are inserted as editable
//     TextLayers on the canvas (used for watch/jewelry price tags — the user
//     can double-click on the canvas or edit in the sidebar).
//
// Categories: fashion · jewelry · cosmetics · watches.

export type TemplateCategory =
  | "humans"
  | "bust"
  | "popular"
  | "nature"
  | "flatlays"
  | "minimal"
  | "platforms"
  | "stones"
  | "kitchen"
  | "spa"
  | "fabric"
  | "walls"
  | "city"
  | "office"
  | "kids";


export type TemplateTextOverlay = {
  /** Stable key within the template (for React keys / debugging). */
  key: string;
  /** Default text — user can edit live on canvas. */
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  fontSize: number;
  color: string;
  /** CSS font-weight numeric. */
  weight: number;
  rotation: number;
  /** Marks the primary editable price/label field (UX hints). */
  isPriceTag?: boolean;
};

export type TintPartId = "top" | "bottom" | "shoes" | "hat" | "bag" | "accessory";

export type TintPartRegion = {
  id: TintPartId;
  label: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

export type SnapTemplate = {
  id: string;
  name: string;
  emoji: string;
  category: TemplateCategory;
  /** CSS background shorthand for the backdrop layer. */
  background: string;
  slot: {
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    rotation: number;
  };
  /** Preview swatch (small CSS gradient) shown in the picker. */
  swatch: string;
  /** Optional editable text overlays baked into the template. */
  textOverlays?: TemplateTextOverlay[];
  /**
   * Optional sub-part regions used by the tint / recolor pipeline so a
   * user can paint only a shirt / pants / shoes area instead of the
   * whole scene (skin, face and background stay untouched).
   * Coordinates are canvas percentages.
   */
  tintParts?: TintPartRegion[];
};

/**
 * Default coarse regions for full-length humanoid mannequin templates.
 * They are intentionally conservative rectangles — enough to keep skin,
 * face and background out of the tint while still covering the garment.
 */
export const FASHION_MODEL_TINT_PARTS: TintPartRegion[] = [
  { id: "hat",    label: "Hat",    xPct: 34, yPct: 0,  wPct: 32, hPct: 20 },
  { id: "top",    label: "Top",    xPct: 22, yPct: 22, wPct: 56, hPct: 30 },
  { id: "bottom", label: "Bottom", xPct: 28, yPct: 52, wPct: 44, hPct: 34 },
  { id: "shoes",  label: "Shoes",  xPct: 30, yPct: 86, wPct: 40, hPct: 14 },
  { id: "bag",    label: "Bag",    xPct: 60, yPct: 42, wPct: 36, hPct: 28 },
];

// ---------------------------------------------------------------------------
// Realistic wrist / bracelet close-up assets — light-toned real hands
// used by watch & jewelry categories (fair male/female + wheat female).
// ---------------------------------------------------------------------------
import wristFemaleRealisticLight from "@/assets/pro-models/wrist_female_realistic_light.jpg.asset.json";
import wristMaleRealisticLight from "@/assets/pro-models/wrist_male_realistic_light.jpg.asset.json";
import wristFemaleWheat from "@/assets/pro-models/wrist_female_wheat.jpg.asset.json";

// ---------------------------------------------------------------------------
// SVG silhouettes as data URIs — kept tiny & neutral so they read as
// placeholders (not stock photos). Used as CSS background layers so we don't
// pay any AI cost and there is no external image request.
// ---------------------------------------------------------------------------

const svgDataUri = (svg: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

const modelBust = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 240'>
  <defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#e6d7c6'/><stop offset='1' stop-color='#c9b298'/>
  </linearGradient></defs>
  <path fill='url(#g)' d='M100 20c-22 0-38 18-38 42 0 18 8 30 16 36-14 4-32 14-40 30-6 12-8 40-8 92h140c0-52-2-80-8-92-8-16-26-26-40-30 8-6 16-18 16-36 0-24-16-42-38-42z'/>
</svg>`);

const modelFull = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 480'>
  <defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#e6d7c6'/><stop offset='1' stop-color='#b89a7c'/>
  </linearGradient></defs>
  <path fill='url(#g)' d='M100 20c-18 0-32 14-32 34s14 34 32 34 32-14 32-34-14-34-32-34zM70 96c-14 6-22 20-24 40l-10 80 22 6 8-60 4 100-14 180h32l6-160h12l6 160h32l-14-180 4-100 8 60 22-6-10-80c-2-20-10-34-24-40-8 8-18 12-30 12s-22-4-30-12z'/>
</svg>`);

const earModel = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
  <defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#eddcc7'/><stop offset='1' stop-color='#c9ac8b'/>
  </linearGradient></defs>
  <ellipse cx='100' cy='100' rx='72' ry='90' fill='url(#g)'/>
  <path fill='#b8977a' d='M162 96c8 2 14 10 14 20s-8 18-18 18l4-38z'/>
</svg>`);

const marbleBlock = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <defs><linearGradient id='m' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#f6f3ee'/><stop offset='1' stop-color='#d9d1c2'/>
  </linearGradient></defs>
  <rect x='40' y='140' width='320' height='90' rx='6' fill='url(#m)'/>
  <rect x='40' y='140' width='320' height='14' fill='#ede6d8'/>
</svg>`);

const woodTable = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <defs><linearGradient id='w' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#c99669'/><stop offset='1' stop-color='#8a5d34'/>
  </linearGradient></defs>
  <rect x='20' y='150' width='360' height='80' rx='4' fill='url(#w)'/>
  <rect x='20' y='150' width='360' height='8' fill='#e0b98f'/>
</svg>`);

const roundStand = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <ellipse cx='200' cy='210' rx='150' ry='22' fill='#0000001a'/>
  <rect x='120' y='140' width='160' height='70' rx='6' fill='#e9e2d5'/>
  <ellipse cx='200' cy='140' rx='80' ry='14' fill='#f4efe4'/>
</svg>`);

const watchWrist = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'>
  <defs><linearGradient id='s' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#e5cdb4'/><stop offset='1' stop-color='#b6906d'/>
  </linearGradient></defs>
  <path fill='url(#s)' d='M60 0h80v120c0 12-6 20-6 30 0 30 16 60 16 100 0 30-10 50-50 50s-50-20-50-50c0-40 16-70 16-100 0-10-6-18-6-30V0z'/>
</svg>`);

// ─────── Home / Furniture silhouettes ───────
const armchair = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <defs><linearGradient id='c' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#c9a889'/><stop offset='1' stop-color='#8a6a4f'/>
  </linearGradient></defs>
  <rect x='80' y='90' width='240' height='120' rx='24' fill='url(#c)'/>
  <rect x='60' y='120' width='40' height='80' rx='16' fill='#8a6a4f'/>
  <rect x='300' y='120' width='40' height='80' rx='16' fill='#8a6a4f'/>
  <rect x='90' y='200' width='30' height='30' fill='#5c4530'/>
  <rect x='280' y='200' width='30' height='30' fill='#5c4530'/>
</svg>`);

const diningTable = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <defs><linearGradient id='t' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#e0c9a6'/><stop offset='1' stop-color='#9b7748'/>
  </linearGradient></defs>
  <rect x='30' y='130' width='340' height='24' rx='4' fill='url(#t)'/>
  <rect x='60' y='154' width='16' height='80' fill='#7c5c33'/>
  <rect x='324' y='154' width='16' height='80' fill='#7c5c33'/>
</svg>`);

const shelfUnit = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
  <rect x='80' y='40' width='240' height='240' fill='none' stroke='#8a6a4f' stroke-width='8'/>
  <line x1='80' y1='120' x2='320' y2='120' stroke='#8a6a4f' stroke-width='6'/>
  <line x1='80' y1='200' x2='320' y2='200' stroke='#8a6a4f' stroke-width='6'/>
</svg>`);

const sofaSet = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 220'>
  <defs><linearGradient id='sf' x1='0' x2='0' y1='0' y2='1'>
    <stop offset='0' stop-color='#b8a58e'/><stop offset='1' stop-color='#7a6650'/>
  </linearGradient></defs>
  <rect x='30' y='90' width='340' height='90' rx='18' fill='url(#sf)'/>
  <rect x='30' y='60' width='60' height='120' rx='16' fill='#7a6650'/>
  <rect x='310' y='60' width='60' height='120' rx='16' fill='#7a6650'/>
  <rect x='110' y='70' width='60' height='40' rx='10' fill='#d9c6ad'/>
  <rect x='230' y='70' width='60' height='40' rx='10' fill='#d9c6ad'/>
</svg>`);

// ─────── Food / serving silhouettes ───────
const plateAndCutlery = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <ellipse cx='200' cy='130' rx='120' ry='110' fill='#ffffff' stroke='#d9d1c2' stroke-width='4'/>
  <ellipse cx='200' cy='130' rx='92' ry='84' fill='none' stroke='#e6dfd0' stroke-width='2'/>
  <rect x='40' y='110' width='60' height='6' rx='3' fill='#a8a196'/>
  <rect x='300' y='110' width='60' height='6' rx='3' fill='#a8a196'/>
</svg>`);

const teacup = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <ellipse cx='200' cy='210' rx='140' ry='16' fill='#e6dfd0'/>
  <path fill='#ffffff' stroke='#d0c6b3' stroke-width='3' d='M120 110h160v40c0 40-36 60-80 60s-80-20-80-60z'/>
  <path fill='none' stroke='#d0c6b3' stroke-width='6' d='M280 130c30 0 30 40 0 46'/>
</svg>`);

const servingTray = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
  <ellipse cx='200' cy='170' rx='170' ry='40' fill='#d9c9a8' stroke='#a88554' stroke-width='3'/>
  <ellipse cx='140' cy='150' rx='36' ry='14' fill='#ffffff'/>
  <ellipse cx='260' cy='150' rx='36' ry='14' fill='#ffffff'/>
</svg>`);

// ─────── Cosmetic florals / podium bouquet ───────
const floralPodium = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
  <ellipse cx='200' cy='260' rx='150' ry='18' fill='#0000001a'/>
  <rect x='140' y='170' width='120' height='80' rx='6' fill='#f4efe4'/>
  <ellipse cx='200' cy='170' rx='60' ry='10' fill='#faf6ee'/>
  <circle cx='120' cy='90' r='22' fill='#f4b8c3'/>
  <circle cx='150' cy='60' r='16' fill='#ffd6de'/>
  <circle cx='90' cy='120' r='18' fill='#f79bb0'/>
  <circle cx='280' cy='80' r='20' fill='#eddcc7'/>
  <circle cx='310' cy='110' r='16' fill='#c9ac8b'/>
  <path d='M100 130 L140 170 M280 110 L240 165' stroke='#7a9a68' stroke-width='4' fill='none'/>
</svg>`);

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

import { PRO_MODEL_TEMPLATES } from "./pro-models";
import bustWomanFair from "@/assets/pro-models/bust_woman_fair.jpg.asset.json";
import bustWomanDark from "@/assets/pro-models/bust_woman_dark.jpg.asset.json";
import bustManFair from "@/assets/pro-models/bust_man_fair.jpg.asset.json";
import bustManDark from "@/assets/pro-models/bust_man_dark.jpg.asset.json";
import bustWomanFairBlack from "@/assets/pro-models/bust_woman_fair_black.jpg";
import bustWomanDarkGray from "@/assets/pro-models/bust_woman_dark_gray.jpg";
import bustManFairShirt from "@/assets/pro-models/bust_man_fair_shirt.jpg";
import bustManDarkSweater from "@/assets/pro-models/bust_man_dark_sweater.jpg";
import hatReadyWomanFair from "@/assets/pro-models/hat_ready_woman_fair.jpg";
import hatReadyWomanWheat from "@/assets/pro-models/hat_ready_woman_wheat.jpg";
import hatReadyManFair from "@/assets/pro-models/hat_ready_man_fair.jpg";
import hatReadyManDark from "@/assets/pro-models/hat_ready_man_dark.jpg";

// Curated allowlist — trims the picker down to ~2 hero scenes per category
// so the sidebar stays airy. Full library is still defined below; anything
// not in this list is intentionally hidden from the picker to keep the
// studio focused on clean spaces, marble surfaces, and neutral studios.
const CURATED_TEMPLATE_IDS = new Set<string>([
  // Popular — commercial hero shots
  "pop-soft-beige",
  "pop-white-podium",
  "pop-airy-arch",
  "fashion-hanger",
  "life-sunset",
  // Minimal — clean empty spaces
  "min-white",
  "min-cream",
  "min-charcoal",
  "min-sky",
  "min-pastel-pink",
  // Stones — marble & natural stone
  "jewelry-marble-shelf",
  "stones-travertine",
  "stones-limestone",
  "stones-terrazzo",
  "acc-stone-plinth",
  // Nature — soft outdoor
  "nature-ocean",
  "acc-sand-dune",
  "nature-moss",
  "nature-pebbles",
  "nature-flora",
  // Flatlays — neutral top-down
  "flatlay-marble-top",
  "flatlay-white-linen",
  "flatlay-wood",
  "flatlay-slate",
  "fashion-flatlay",
  // Spa / cosmetics
  "cosmetics-marble",
  "spa-white-sand",
  "spa-linen-warm",
  "spa-eucalyptus",
  "cosmetics-spotlight",
  // Kitchen / wood
  "cosmetics-wood",
  "kitchen-bamboo",
  "kitchen-butcher",
  "kitchen-tile",
  "life-cafe",
  // Fabric — textures
  "fabric-canvas-cream",
  "fabric-velvet-blue",
  "fabric-silk-blush",
  "fabric-wool-grey",
  "fabric-satin-champagne",
  // Walls (interiors)
  "walls-plaster-white",
  "walls-sage",
  "walls-terracotta",
  "walls-concrete",
  "walls-brick",
  // City / office — subtle
  "city-glass-tower",
  "city-loft-window",
  "city-rooftop-sunset",
  "office-marble-desk",
  "office-oak-desk",
  // Platforms — podium/display
  "watch-display",
  "cosmetics-stand",
  "acc-podium-duo",
  "acc-glass-shelf",
  // Kids — pastel
  "kids-pastel-sky",
  "kids-cloud",
  "kids-rainbow",
  "kids-bubble-gum",
  // Watches — luxury display + real-wrist close-ups (fair/wheat tones)
  "watch-dark-luxe",
  "wrist-female-fair",
  "wrist-male-fair",
  "wrist-female-wheat",
  // Jewelry — light-toned displays alongside the classic velvet tray
  "jewelry-velvet",
  "jewelry-linen-tray",
  "jewelry-cream-bust",
  "jewelry-fair-earlobe",
  "jewelry-marble-tray",
  // Home & Furniture — real furniture silhouettes
  "home-armchair",
  "home-dining-table",
  "home-shelf-unit",
  "home-sofa-set",
  // Food & Delivery — serving elements
  "food-plate",
  "food-teacup",
  "food-serving-tray",
  "food-marble-serving",
  // Cosmetics — floral concepts
  "cosmetics-floral-podium",
  "cosmetics-marble-bouquet",
]);


const _RAW_SNAP_TEMPLATES: SnapTemplate[] = [
  ...PRO_MODEL_TEMPLATES,

  // ======================== BUST SHOTS (accessory close-up) ========================
  // Mid-torso ↑ studio busts optimised for glasses / earrings / necklaces / chains
  // where full-body models hide the accessory detail.
  {
    id: "bust-woman-fair",
    name: "Woman · Fair · Bust",
    emoji: "👤",
    category: "bust",
    background: `url("${bustWomanFair.url}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#f0d5b4,#ece7dd)",
  },
  {
    id: "bust-woman-dark",
    name: "Woman · Dark · Bust",
    emoji: "👤",
    category: "bust",
    background: `url("${bustWomanDark.url}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#6b3d24,#ece7dd)",
  },
  {
    id: "bust-man-fair",
    name: "Man · Fair · Bust",
    emoji: "👤",
    category: "bust",
    background: `url("${bustManFair.url}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#f0d5b4,#ece7dd)",
  },
  {
    id: "bust-man-dark",
    name: "Man · Dark · Bust",
    emoji: "👤",
    category: "bust",
    background: `url("${bustManDark.url}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#6b3d24,#ece7dd)",
  },
  {
    id: "bust-woman-fair-black",
    name: "Woman · Fair · Black Tee",
    emoji: "👕",
    category: "bust",
    background: `url("${bustWomanFairBlack}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#1a1a1a,#ece7dd)",
  },
  {
    id: "bust-woman-dark-gray",
    name: "Woman · Dark · Gray V-Neck",
    emoji: "🧥",
    category: "bust",
    background: `url("${bustWomanDarkGray}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#c8ccd1,#ece7dd)",
  },
  {
    id: "bust-man-fair-shirt",
    name: "Man · Fair · White Shirt",
    emoji: "👔",
    category: "bust",
    background: `url("${bustManFairShirt}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#f4f4f2,#ece7dd)",
  },
  {
    id: "bust-man-dark-sweater",
    name: "Man · Dark · Charcoal Turtleneck",
    emoji: "🧣",
    category: "bust",
    background: `url("${bustManDarkSweater}") center / contain no-repeat, #ece7dd`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#2b2f36,#ece7dd)",
  },

  // =========== HAT & HEAD ACCESSORY READY (extra headroom on top) ===========
  {
    id: "hat-ready-woman-fair",
    name: "Woman · Fair · Hat-ready",
    emoji: "👒",
    category: "humans",
    background: `url("${hatReadyWomanFair}") center / contain no-repeat, #e9ebee`,
    slot: { xPct: 28, yPct: 2, wPct: 44, hPct: 32, rotation: 0 },
    swatch: "linear-gradient(180deg,#e9ebee,#f0d5b4)",
  },
  {
    id: "hat-ready-woman-wheat",
    name: "Woman · Wheat · Hat-ready",
    emoji: "👒",
    category: "humans",
    background: `url("${hatReadyWomanWheat}") center / contain no-repeat, #f4ead6`,
    slot: { xPct: 28, yPct: 2, wPct: 44, hPct: 32, rotation: 0 },
    swatch: "linear-gradient(180deg,#f4ead6,#c99a6b)",
  },
  {
    id: "hat-ready-man-fair",
    name: "Man · Fair · Hat-ready",
    emoji: "🎩",
    category: "humans",
    background: `url("${hatReadyManFair}") center / contain no-repeat, #e9ebee`,
    slot: { xPct: 28, yPct: 2, wPct: 44, hPct: 30, rotation: 0 },
    swatch: "linear-gradient(180deg,#e9ebee,#c9b298)",
  },
  {
    id: "hat-ready-man-dark",
    name: "Man · Dark · Hat-ready",
    emoji: "🎩",
    category: "humans",
    background: `url("${hatReadyManDark}") center / contain no-repeat, #f4d8ad`,
    slot: { xPct: 28, yPct: 2, wPct: 44, hPct: 30, rotation: 0 },
    swatch: "linear-gradient(180deg,#f4d8ad,#4a2e18)",
  },


  {
    id: "fashion-bust-soft",
    name: "Bust Mannequin",
    emoji: "👕",
    category: "humans",
    background: `${modelBust} center 62%/44% no-repeat, radial-gradient(ellipse at 50% 30%, #ffffff 0%, #eef2f7 55%, #d8dee7 100%)`,
    slot: { xPct: 30, yPct: 28, wPct: 40, hPct: 40, rotation: 0 },
    swatch: "linear-gradient(160deg,#eef2f7,#c9b298)",
  },
  {
    id: "fashion-full-model",
    name: "Full Model",
    emoji: "🧍",
    category: "humans",
    background: `${modelFull} center 55%/32% no-repeat, linear-gradient(180deg,#f6f4ef 0%,#e2ddd2 100%)`,
    slot: { xPct: 34, yPct: 22, wPct: 32, hPct: 40, rotation: 0 },
    swatch: "linear-gradient(180deg,#f6f4ef,#b89a7c)",
  },
  {
    id: "fashion-flatlay",
    name: "Flatlay Linen",
    emoji: "🧺",
    category: "flatlays",
    background:
      "repeating-linear-gradient(45deg,#f2ece1 0 6px,#eee6d6 6px 12px), linear-gradient(160deg,#f2ece1,#dccdb0)",
    slot: { xPct: 18, yPct: 18, wPct: 64, hPct: 64, rotation: 0 },
    swatch: "linear-gradient(160deg,#f2ece1,#dccdb0)",
  },
  {
    id: "fashion-hanger",
    name: "Wardrobe Hanger",
    emoji: "🧥",
    category: "popular",
    background:
      "radial-gradient(ellipse at 50% 20%, #ffffff 0%, #e9edf3 60%, #c9d0dc 100%)",
    slot: { xPct: 26, yPct: 24, wPct: 48, hPct: 60, rotation: 0 },
    swatch: "radial-gradient(circle,#fff,#c9d0dc)",
  },

  // ============================ JEWELRY ============================
  {
    id: "jewelry-neck-bust",
    name: "Necklace Bust",
    emoji: "📿",
    category: "humans",
    background: `${modelBust} center 40%/50% no-repeat, linear-gradient(180deg,#141419 0%,#2b2b35 100%)`,
    slot: { xPct: 30, yPct: 48, wPct: 40, hPct: 34, rotation: 0 },
    swatch: "linear-gradient(180deg,#141419,#8d7458)",
  },
  {
    id: "jewelry-earlobe",
    name: "Earring Model",
    emoji: "💎",
    category: "humans",
    background: `${earModel} center/48% no-repeat, linear-gradient(180deg,#1a1a1f 0%,#2e2e38 100%)`,
    slot: { xPct: 62, yPct: 44, wPct: 20, hPct: 26, rotation: 0 },
    swatch: "linear-gradient(180deg,#1a1a1f,#c9ac8b)",
  },
  {
    id: "jewelry-velvet",
    name: "Velvet Tray",
    emoji: "🖤",
    category: "popular",
    background:
      "radial-gradient(ellipse at 50% 55%, #3a2634 0%, #1c0f1a 70%, #0a0509 100%)",
    slot: { xPct: 24, yPct: 26, wPct: 52, hPct: 52, rotation: 0 },
    swatch: "radial-gradient(circle,#3a2634,#0a0509)",


  },
  {
    id: "jewelry-marble-shelf",
    name: "Marble Shelf",
    emoji: "🪞",
    category: "stones",
    background: `${marbleBlock} center 78%/86% no-repeat, linear-gradient(180deg,#f6f3ee 0%,#e2dccf 100%)`,
    slot: { xPct: 30, yPct: 30, wPct: 40, hPct: 40, rotation: 0 },
    swatch: "linear-gradient(160deg,#f6f3ee,#d9d1c2)",
  },

  // ================ LIGHT JEWELRY DISPLAYS (fair tones) ================
  {
    id: "jewelry-linen-tray",
    name: "Linen Tray",
    emoji: "🤍",
    category: "popular",
    background:
      "radial-gradient(ellipse at 50% 60%, #ffffff 0%, #f5efe4 55%, #d9cdb7 100%)",
    slot: { xPct: 24, yPct: 26, wPct: 52, hPct: 52, rotation: 0 },
    swatch: "radial-gradient(circle,#ffffff,#d9cdb7)",
  },
  {
    id: "jewelry-cream-bust",
    name: "Cream Necklace Bust",
    emoji: "📿",
    category: "humans",
    background: `${modelBust} center 40%/50% no-repeat, linear-gradient(180deg,#faf6ee 0%,#e7dccb 100%)`,
    slot: { xPct: 30, yPct: 48, wPct: 40, hPct: 34, rotation: 0 },
    swatch: "linear-gradient(180deg,#faf6ee,#c9b298)",
  },
  {
    id: "jewelry-fair-earlobe",
    name: "Earring Model · Fair",
    emoji: "💎",
    category: "humans",
    background: `${earModel} center/48% no-repeat, linear-gradient(180deg,#faf6ee 0%,#ebe2d1 100%)`,
    slot: { xPct: 62, yPct: 44, wPct: 20, hPct: 26, rotation: 0 },
    swatch: "linear-gradient(180deg,#faf6ee,#c9ac8b)",
  },
  {
    id: "jewelry-marble-tray",
    name: "Marble Jewelry Tray",
    emoji: "🪞",
    category: "stones",
    background: `${marbleBlock} center 70%/92% no-repeat, radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f3ede0 60%, #d9cfb9 100%)`,
    slot: { xPct: 28, yPct: 28, wPct: 44, hPct: 44, rotation: 0 },
    swatch: "linear-gradient(160deg,#ffffff,#d9cfb9)",
  },

  // ============== REALISTIC WRIST CLOSE-UPS (watch / bracelet) ==============
  {
    id: "wrist-female-fair",
    name: "Woman Wrist · Fair",
    emoji: "⌚",
    category: "humans",
    background: `url("${wristFemaleRealisticLight.url}") center / cover no-repeat, #edeae4`,
    slot: { xPct: 34, yPct: 40, wPct: 30, hPct: 24, rotation: -8 },
    swatch: "linear-gradient(180deg,#f0d5b4,#c9b298)",
  },
  {
    id: "wrist-male-fair",
    name: "Man Wrist · Fair",
    emoji: "⌚",
    category: "humans",
    background: `url("${wristMaleRealisticLight.url}") center / cover no-repeat, #edeae4`,
    slot: { xPct: 34, yPct: 40, wPct: 30, hPct: 24, rotation: -8 },
    swatch: "linear-gradient(180deg,#f0d5b4,#a37c58)",
  },
  {
    id: "wrist-female-wheat",
    name: "Woman Wrist · Wheat",
    emoji: "⌚",
    category: "humans",
    background: `url("${wristFemaleWheat.url}") center / cover no-repeat, #edeae4`,
    slot: { xPct: 34, yPct: 40, wPct: 30, hPct: 24, rotation: -8 },
    swatch: "linear-gradient(180deg,#c99a6b,#8a5d34)",
  },


  // =========================== COSMETICS ===========================
  {
    id: "cosmetics-marble",
    name: "Marble Block",
    emoji: "🧴",
    category: "spa",
    background: `${marbleBlock} center 74%/80% no-repeat, radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f0ece3 55%, #d6cebd 100%)`,
    slot: { xPct: 32, yPct: 24, wPct: 36, hPct: 48, rotation: 0 },
    swatch: "linear-gradient(160deg,#f4f1ec,#cfc7b8)",
  },
  {
    id: "cosmetics-wood",
    name: "Warm Wood Table",
    emoji: "🪵",
    category: "kitchen",
    background: `${woodTable} center 76%/86% no-repeat, linear-gradient(180deg,#f6ead9 0%,#e2c9a3 100%)`,
    slot: { xPct: 30, yPct: 22, wPct: 40, hPct: 50, rotation: 0 },
    swatch: "linear-gradient(180deg,#f6ead9,#b98d5c)",
  },
  {
    id: "cosmetics-stand",
    name: "Studio Stand",
    emoji: "🎯",
    category: "platforms",
    background: `${roundStand} center 74%/70% no-repeat, radial-gradient(ellipse at 50% 25%, #fbf6ee 0%, #e5dccb 65%, #b8a98a 100%)`,
    slot: { xPct: 34, yPct: 22, wPct: 32, hPct: 50, rotation: 0 },
    swatch: "radial-gradient(circle,#fbf6ee,#b8a98a)",
  },
  {
    id: "cosmetics-spotlight",
    name: "Spotlight",
    emoji: "🌒",
    category: "spa",
    background:
      "radial-gradient(ellipse at 50% 40%, #3a3f4b 0%, #1c1f26 70%, #0e1014 100%)",
    slot: { xPct: 30, yPct: 22, wPct: 40, hPct: 58, rotation: 0 },
    swatch: "radial-gradient(circle,#3a3f4b,#0e1014)",
  },

  // ============================ WATCHES ============================
  // (Wrist silhouette + "$1,299 Limited Edition" mock-up removed — the SVG
  // silhouette + fake price tag felt kitsch. Watches keep the display case
  // and dark luxe scenes below.)

  {
    id: "watch-display",
    name: "Display Case",
    emoji: "🕰️",
    category: "platforms",
    background: `${roundStand} center 72%/60% no-repeat, radial-gradient(ellipse at 50% 30%, #ffffff 0%, #eceee8 60%, #c7c9c1 100%)`,
    slot: { xPct: 32, yPct: 22, wPct: 36, hPct: 50, rotation: 0 },
    swatch: "radial-gradient(circle,#fff,#c7c9c1)",


  },
  {
    id: "watch-dark-luxe",
    name: "Dark Luxe",
    emoji: "🖤",
    category: "popular",
    background:
      "radial-gradient(ellipse at 50% 40%, #2a2f3a 0%, #14171d 70%, #08090c 100%)",
    slot: { xPct: 30, yPct: 22, wPct: 40, hPct: 50, rotation: 0 },
    swatch: "radial-gradient(circle,#2a2f3a,#08090c)",


  },

  // ========================== ACCESSORIES ==========================
  {
    id: "acc-podium-duo",
    name: "Twin Podiums",
    emoji: "🏛️",
    category: "platforms",
    background: `radial-gradient(ellipse at 30% 78%, #00000022 0%, transparent 55%), radial-gradient(ellipse at 70% 78%, #00000022 0%, transparent 55%), linear-gradient(180deg,#f7f3ec 0%,#e2d8c5 100%)`,
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(160deg,#f7f3ec,#c9b998)",
  },
  {
    id: "acc-glass-shelf",
    name: "Glass Shelf",
    emoji: "🪟",
    category: "platforms",
    background:
      "linear-gradient(180deg,#eef4fb 0%,#cfdcec 55%,#a9bccf 100%)",
    slot: { xPct: 26, yPct: 26, wPct: 48, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(180deg,#eef4fb,#a9bccf)",
  },
  {
    id: "acc-sand-dune",
    name: "Sand Dune",
    emoji: "🏜️",
    category: "nature",
    background:
      "radial-gradient(ellipse at 50% 75%, #e9c58a 0%, #c99a5c 60%, #8d6236 100%)",
    slot: { xPct: 28, yPct: 24, wPct: 44, hPct: 52, rotation: 0 },
    swatch: "radial-gradient(circle,#e9c58a,#8d6236)",
  },
  {
    id: "acc-stone-plinth",
    name: "Stone Plinth",
    emoji: "🪨",
    category: "stones",
    background: `${marbleBlock} center 78%/78% no-repeat, linear-gradient(180deg,#ecebe6 0%,#c8c4b8 100%)`,
    slot: { xPct: 32, yPct: 22, wPct: 36, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(160deg,#ecebe6,#8f8b7f)",
  },

  // =========================== LIFESTYLE ===========================
  {
    id: "life-sunset",
    name: "Sunset Studio",
    emoji: "🌇",
    category: "popular",
    background:
      "linear-gradient(180deg,#ffd1a1 0%,#f3866b 40%,#a83e6b 80%,#4b1e55 100%)",
    slot: { xPct: 26, yPct: 24, wPct: 48, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffd1a1,#4b1e55)",
  },
  {
    id: "life-cafe",
    name: "Cafe Wood",
    emoji: "☕",
    category: "kitchen",
    background: `${woodTable} center 76%/88% no-repeat, radial-gradient(ellipse at 50% 20%, #fbf4e8 0%, #e6d1ad 65%, #a97b48 100%)`,
    slot: { xPct: 28, yPct: 20, wPct: 44, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(180deg,#fbf4e8,#a97b48)",
  },
  {
    id: "life-tropical",
    name: "Tropical Leaf",
    emoji: "🌿",
    category: "nature",
    background:
      "radial-gradient(circle at 20% 20%, #4a7c4b55 0%, transparent 55%), radial-gradient(circle at 85% 80%, #2f5d3a66 0%, transparent 55%), linear-gradient(180deg,#e8f1e0 0%,#b8d3a8 100%)",
    slot: { xPct: 26, yPct: 24, wPct: 48, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(160deg,#e8f1e0,#2f5d3a)",
  },
  {
    id: "life-linen-flat",
    name: "Linen Flatlay",
    emoji: "🧻",
    category: "fabric",
    background:
      "repeating-linear-gradient(50deg,#f5efe4 0 8px,#efe6d3 8px 14px), linear-gradient(180deg,#f5efe4,#d8c9ab)",
    slot: { xPct: 20, yPct: 20, wPct: 60, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(160deg,#f5efe4,#a99060)",
  },

  // ============================ MINIMAL ============================
  {
    id: "min-white",
    name: "Pure White",
    emoji: "⬜",
    category: "minimal",
    background:
      "radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f4f4f5 70%, #e5e7eb 100%)",
    slot: { xPct: 22, yPct: 20, wPct: 56, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffffff,#e5e7eb)",
  },
  {
    id: "min-cream",
    name: "Warm Cream",
    emoji: "🥛",
    category: "minimal",
    background:
      "radial-gradient(ellipse at 50% 30%, #fbf5ea 0%, #f1e7d3 65%, #d9c9a8 100%)",
    slot: { xPct: 22, yPct: 20, wPct: 56, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#fbf5ea,#d9c9a8)",
  },
  {
    id: "min-charcoal",
    name: "Charcoal",
    emoji: "⬛",
    category: "minimal",
    background:
      "radial-gradient(ellipse at 50% 35%, #3a3f47 0%, #1e2126 65%, #0d0f12 100%)",
    slot: { xPct: 22, yPct: 20, wPct: 56, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#3a3f47,#0d0f12)",
  },
  {
    id: "min-pastel-pink",
    name: "Pastel Pink",
    emoji: "🌸",
    category: "minimal",
    background:
      "radial-gradient(ellipse at 50% 35%, #ffe6ec 0%, #ffc9d6 65%, #f79bb0 100%)",
    slot: { xPct: 22, yPct: 20, wPct: 56, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffe6ec,#f79bb0)",
  },
  {
    id: "min-sky",
    name: "Soft Sky",
    emoji: "☁️",
    category: "minimal",
    background:
      "radial-gradient(ellipse at 50% 30%, #eaf4ff 0%, #c9defb 60%, #94b8e3 100%)",
    slot: { xPct: 22, yPct: 20, wPct: 56, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#eaf4ff,#94b8e3)",
  },
  {
    id: "min-mint",
    name: "Mint Fresh",
    emoji: "🌱",
    category: "minimal",
    background:
      "radial-gradient(ellipse at 50% 30%, #eafaf1 0%, #c1ecd6 60%, #7fc9a2 100%)",
    slot: { xPct: 22, yPct: 20, wPct: 56, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#eafaf1,#7fc9a2)",
  },

  // ============================== TECH =============================
  {
    id: "tech-neon-grid",
    name: "Neon Grid",
    emoji: "🕹️",
    category: "office",
    background:
      "linear-gradient(180deg,#0b0f1c 0%,#161b2e 100%), repeating-linear-gradient(0deg,#1d6bff22 0 1px,transparent 1px 40px), repeating-linear-gradient(90deg,#1d6bff22 0 1px,transparent 1px 40px)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#0b0f1c,#1d6bff)",
  },
  {
    id: "tech-holo",
    name: "Holo Gradient",
    emoji: "🪩",
    category: "office",
    background:
      "linear-gradient(135deg,#8a5bff 0%,#1d6bff 35%,#22d3ee 70%,#a3ff8f 100%)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(135deg,#8a5bff,#a3ff8f)",
  },
  {
    id: "tech-carbon",
    name: "Carbon Weave",
    emoji: "🧬",
    category: "office",
    background:
      "repeating-linear-gradient(45deg,#1a1d24 0 6px,#0f1216 6px 12px), radial-gradient(ellipse at 50% 30%,#2a2f38,#0a0c10)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(135deg,#1a1d24,#0a0c10)",
  },
  {
    id: "tech-studio-cyan",
    name: "Studio Cyan",
    emoji: "💠",
    category: "office",
    background:
      "radial-gradient(ellipse at 50% 30%, #dff8ff 0%, #9be2f2 55%, #2c8ea8 100%)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#dff8ff,#2c8ea8)",
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXTENDED LIBRARY — procedural CSS-only scenes to enrich sparse
  // categories (kids, city, walls, fabric, nature, flatlays, stones,
  // kitchen, spa, popular light variants). Rendered via `tpl.background`
  // fallback in the picker card (no static thumb needed).
  // ═══════════════════════════════════════════════════════════════════

  // ─────── POPULAR: light & commercial ───────
  { id: "pop-airy-arch", name: "Airy Arch", emoji: "🏛️", category: "popular",
    background: "radial-gradient(ellipse at 50% 85%, #f6ede0 0%, #efe4d1 45%, #d9c8ac 100%), radial-gradient(circle at 50% 30%, #ffffff 0%, transparent 55%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 58, rotation: 0 },
    swatch: "linear-gradient(160deg,#f6ede0,#d9c8ac)" },
  { id: "pop-soft-beige", name: "Soft Beige", emoji: "☁️", category: "popular",
    background: "radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f5eee1 55%, #d8c6a8 100%)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffffff,#d8c6a8)" },
  { id: "pop-white-podium", name: "White Podium", emoji: "🏆", category: "popular",
    background: `${roundStand} center 74%/68% no-repeat, radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f2ede4 60%, #cfc4b0 100%)`,
    slot: { xPct: 32, yPct: 22, wPct: 36, hPct: 52, rotation: 0 },
    swatch: "radial-gradient(circle,#ffffff,#cfc4b0)" },

  // ─────── NATURE ───────
  { id: "nature-moss", name: "Moss Bed", emoji: "🍃", category: "nature",
    background: "radial-gradient(circle at 30% 40%, #6b8e5c 0%, #4a6b3d 55%, #2f4826 100%)",
    slot: { xPct: 26, yPct: 24, wPct: 48, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(160deg,#6b8e5c,#2f4826)" },
  { id: "nature-pebbles", name: "River Pebbles", emoji: "🪨", category: "nature",
    background: "radial-gradient(circle at 22% 78%, #b9b1a2 0%, transparent 20%), radial-gradient(circle at 70% 82%, #a89f8e 0%, transparent 22%), radial-gradient(circle at 48% 72%, #cfc7b7 0%, transparent 18%), linear-gradient(180deg,#eae3d3 0%,#b0a692 100%)",
    slot: { xPct: 28, yPct: 22, wPct: 44, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(180deg,#eae3d3,#b0a692)" },
  { id: "nature-flora", name: "Fresh Flora", emoji: "🌸", category: "nature",
    background: "radial-gradient(circle at 15% 20%, #f7cfd3 0%, transparent 40%), radial-gradient(circle at 85% 80%, #b6d8b4 0%, transparent 45%), linear-gradient(180deg,#fff8f2 0%,#e5d8c9 100%)",
    slot: { xPct: 26, yPct: 24, wPct: 48, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(160deg,#fff8f2,#b6d8b4)" },
  { id: "nature-ocean", name: "Ocean Mist", emoji: "🌊", category: "nature",
    background: "linear-gradient(180deg,#dff0f5 0%,#a9cfd8 45%,#5f97a4 100%)",
    slot: { xPct: 24, yPct: 24, wPct: 52, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(180deg,#dff0f5,#5f97a4)" },
  { id: "nature-desert-sky", name: "Desert Sky", emoji: "🏜️", category: "nature",
    background: "linear-gradient(180deg,#f7e6c4 0%,#e5b688 55%,#8a5a36 100%)",
    slot: { xPct: 26, yPct: 24, wPct: 48, hPct: 52, rotation: 0 },
    swatch: "linear-gradient(180deg,#f7e6c4,#8a5a36)" },

  // ─────── FLATLAYS ───────
  { id: "flatlay-marble-top", name: "Marble Flatlay", emoji: "◽", category: "flatlays",
    background: "radial-gradient(circle at 30% 40%, #ffffff 0%, transparent 25%), radial-gradient(circle at 75% 65%, #e6e1d6 0%, transparent 30%), linear-gradient(160deg,#f7f4ee 0%,#dcd4c1 100%)",
    slot: { xPct: 20, yPct: 20, wPct: 60, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(160deg,#f7f4ee,#dcd4c1)" },
  { id: "flatlay-wood", name: "Wood Flatlay", emoji: "🪵", category: "flatlays",
    background: "repeating-linear-gradient(90deg,#c99669 0 60px,#b6875a 60px 62px,#c99669 62px 120px), linear-gradient(180deg,#d6a373,#8a5d34)",
    slot: { xPct: 20, yPct: 20, wPct: 60, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#c99669,#8a5d34)" },
  { id: "flatlay-white-linen", name: "White Linen", emoji: "⬜", category: "flatlays",
    background: "repeating-linear-gradient(50deg,#fbf9f4 0 8px,#f4efe4 8px 14px), linear-gradient(180deg,#fbf9f4,#e6ddc9)",
    slot: { xPct: 20, yPct: 20, wPct: 60, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(180deg,#fbf9f4,#e6ddc9)" },
  { id: "flatlay-slate", name: "Slate Flatlay", emoji: "◾", category: "flatlays",
    background: "radial-gradient(circle at 40% 30%, #4b525b 0%, transparent 40%), linear-gradient(160deg,#2b3038 0%,#151920 100%)",
    slot: { xPct: 20, yPct: 20, wPct: 60, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(160deg,#4b525b,#151920)" },
  { id: "flatlay-leaves", name: "Botanical Flat", emoji: "🌿", category: "flatlays",
    background: "radial-gradient(circle at 20% 80%, #587a4d 0%, transparent 30%), radial-gradient(circle at 80% 20%, #7ea56a 0%, transparent 30%), linear-gradient(180deg,#e8eee0,#b6cba6)",
    slot: { xPct: 20, yPct: 20, wPct: 60, hPct: 60, rotation: 0 },
    swatch: "linear-gradient(160deg,#e8eee0,#587a4d)" },

  // ─────── STONES ───────
  { id: "stones-travertine", name: "Travertine", emoji: "🪨", category: "stones",
    background: "radial-gradient(ellipse at 50% 40%, #f5ede0 0%, #ddceb5 60%, #a68e6a 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#f5ede0,#a68e6a)" },
  { id: "stones-slate-black", name: "Black Slate", emoji: "⬛", category: "stones",
    background: "radial-gradient(circle at 30% 30%, #3a3f47 0%, transparent 40%), linear-gradient(160deg,#20242b,#0a0c10)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#3a3f47,#0a0c10)" },
  { id: "stones-terrazzo", name: "Terrazzo", emoji: "🎨", category: "stones",
    background: "radial-gradient(circle at 15% 25%, #d47b6d 0%, transparent 6%), radial-gradient(circle at 60% 55%, #4a7c92 0%, transparent 5%), radial-gradient(circle at 82% 30%, #e7b957 0%, transparent 6%), radial-gradient(circle at 30% 75%, #6b6b6b 0%, transparent 5%), linear-gradient(180deg,#faf6ee,#e2dccf)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#faf6ee,#d47b6d)" },
  { id: "stones-limestone", name: "Limestone", emoji: "🏔️", category: "stones",
    background: "linear-gradient(180deg,#efe9dc 0%,#c9bfa8 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#efe9dc,#c9bfa8)" },

  // ─────── KITCHEN ───────
  { id: "kitchen-tile", name: "Ceramic Tile", emoji: "🍽️", category: "kitchen",
    background: "repeating-linear-gradient(0deg,#ffffff 0 60px,#eee 60px 62px), repeating-linear-gradient(90deg,#ffffff 0 60px,#eee 60px 62px), linear-gradient(180deg,#f6f6f6,#dcdcdc)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#ffffff,#dcdcdc)" },
  { id: "kitchen-bamboo", name: "Bamboo Board", emoji: "🎋", category: "kitchen",
    background: "repeating-linear-gradient(90deg,#e4c78a 0 40px,#d9b877 40px 42px), linear-gradient(180deg,#eecf95,#b0873f)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#eecf95,#b0873f)" },
  { id: "kitchen-butcher", name: "Butcher Block", emoji: "🥩", category: "kitchen",
    background: `${woodTable} center 76%/94% no-repeat, linear-gradient(180deg,#c58b58 0%,#7c4a20 100%)`,
    slot: { xPct: 24, yPct: 20, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#c58b58,#7c4a20)" },
  { id: "kitchen-copper", name: "Copper Kitchen", emoji: "🧑‍🍳", category: "kitchen",
    background: "linear-gradient(160deg,#eab393 0%,#c67951 55%,#7a3f21 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(160deg,#eab393,#7a3f21)" },

  // ─────── SPA ───────
  { id: "spa-eucalyptus", name: "Eucalyptus", emoji: "🌿", category: "spa",
    background: "radial-gradient(circle at 30% 25%, #b9d3b0 0%, transparent 40%), linear-gradient(180deg,#eff4ec,#a8c2a1)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#eff4ec,#a8c2a1)" },
  { id: "spa-linen-warm", name: "Warm Linen", emoji: "🕯️", category: "spa",
    background: "repeating-linear-gradient(40deg,#faf1e2 0 8px,#f3e7cf 8px 14px), linear-gradient(180deg,#faf1e2,#d9c19a)",
    slot: { xPct: 22, yPct: 22, wPct: 56, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#faf1e2,#d9c19a)" },
  { id: "spa-white-sand", name: "White Sand", emoji: "🏖️", category: "spa",
    background: "radial-gradient(ellipse at 50% 70%, #f4ecdc 0%, #e0d0b0 60%, #b39c76 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#f4ecdc,#b39c76)" },
  { id: "spa-blush-stone", name: "Blush Stone", emoji: "🪷", category: "spa",
    background: "radial-gradient(ellipse at 50% 30%, #fbe6df 0%, #eec6ba 55%, #b7826f 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#fbe6df,#b7826f)" },

  // ─────── FABRIC ───────
  { id: "fabric-velvet-blue", name: "Blue Velvet", emoji: "🟦", category: "fabric",
    background: "radial-gradient(ellipse at 50% 40%, #4a6ea5 0%, #2b4470 60%, #142140 100%)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#4a6ea5,#142140)" },
  { id: "fabric-silk-blush", name: "Blush Silk", emoji: "🎀", category: "fabric",
    background: "linear-gradient(135deg,#ffe6ec 0%,#f4b8c3 50%,#d17d92 100%)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(135deg,#ffe6ec,#d17d92)" },
  { id: "fabric-canvas-cream", name: "Cream Canvas", emoji: "🧵", category: "fabric",
    background: "repeating-linear-gradient(0deg,#f4ecd8 0 3px,#eee2c4 3px 5px), repeating-linear-gradient(90deg,#f4ecd8 0 3px,#eee2c4 3px 5px)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#f4ecd8,#c6b58a)" },
  { id: "fabric-wool-grey", name: "Grey Wool", emoji: "🧶", category: "fabric",
    background: "repeating-linear-gradient(45deg,#c8c6c2 0 4px,#b3b0aa 4px 8px), linear-gradient(180deg,#d3d1cc,#8f8b83)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#c8c6c2,#8f8b83)" },
  { id: "fabric-satin-champagne", name: "Champagne Satin", emoji: "🥂", category: "fabric",
    background: "linear-gradient(135deg,#f7e6c1 0%,#e5c98a 45%,#a88554 100%)",
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(135deg,#f7e6c1,#a88554)" },

  // ─────── WALLS (Interiors) ───────
  { id: "walls-plaster-white", name: "White Plaster", emoji: "🧱", category: "walls",
    background: "radial-gradient(circle at 30% 30%, #ffffff 0%, transparent 45%), linear-gradient(180deg,#f5f0e6,#d9ceb8)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#f5f0e6,#d9ceb8)" },
  { id: "walls-terracotta", name: "Terracotta", emoji: "🟧", category: "walls",
    background: "radial-gradient(ellipse at 50% 30%, #eaa877 0%, #c76e42 60%, #8a4020 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#eaa877,#8a4020)" },
  { id: "walls-sage", name: "Sage Wall", emoji: "🌱", category: "walls",
    background: "linear-gradient(180deg,#dfe6d4 0%,#a5b492 60%,#6b7d5a 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#dfe6d4,#6b7d5a)" },
  { id: "walls-brick", name: "Brick Wall", emoji: "🧱", category: "walls",
    background: "repeating-linear-gradient(0deg,#c86750 0 30px,#a04a35 30px 32px), repeating-linear-gradient(90deg,transparent 0 60px,#8a3d2a 60px 62px), linear-gradient(180deg,#c86750,#7a3624)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#c86750,#7a3624)" },
  { id: "walls-concrete", name: "Concrete", emoji: "◾", category: "walls",
    background: "radial-gradient(circle at 40% 30%, #b8b8b3 0%, transparent 45%), linear-gradient(180deg,#9b9b96,#5a5a55)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#9b9b96,#5a5a55)" },
  { id: "walls-navy-panel", name: "Navy Panel", emoji: "🟦", category: "walls",
    background: "repeating-linear-gradient(90deg,#1e2a44 0 80px,#243258 80px 82px), linear-gradient(180deg,#2a3a5c,#101830)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#2a3a5c,#101830)" },

  // ─────── CITY ───────
  { id: "city-loft-window", name: "Loft Window", emoji: "🪟", category: "city",
    background: "linear-gradient(180deg,#e0d7c8 0%,#a89881 100%), radial-gradient(ellipse at 30% 30%, #fff6e0 0%, transparent 40%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#e0d7c8,#a89881)" },
  { id: "city-brick-alley", name: "Brick Alley", emoji: "🧱", category: "city",
    background: "repeating-linear-gradient(0deg,#8a4d3a 0 20px,#6b3628 20px 22px), linear-gradient(180deg,#96513c,#3f1e14)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#96513c,#3f1e14)" },
  { id: "city-rooftop-sunset", name: "Rooftop Sunset", emoji: "🌆", category: "city",
    background: "linear-gradient(180deg,#f5c58a 0%,#e77a5b 40%,#743858 80%,#241627 100%)",
    slot: { xPct: 24, yPct: 24, wPct: 52, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(180deg,#f5c58a,#241627)" },
  { id: "city-neon-street", name: "Neon Street", emoji: "🌃", category: "city",
    background: "radial-gradient(circle at 30% 40%, #ff3d84aa 0%, transparent 40%), radial-gradient(circle at 75% 60%, #1d6bff88 0%, transparent 45%), linear-gradient(180deg,#0f1220,#040610)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(135deg,#ff3d84,#1d6bff)" },
  { id: "city-glass-tower", name: "Glass Tower", emoji: "🏢", category: "city",
    background: "repeating-linear-gradient(90deg,#b6c8dc 0 22px,#94aac5 22px 24px), linear-gradient(180deg,#d4e0ec,#5f7aa0)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#d4e0ec,#5f7aa0)" },
  { id: "city-metro", name: "Metro Wall", emoji: "🚇", category: "city",
    background: "repeating-linear-gradient(90deg,#ffffff 0 40px,#e6e6e6 40px 42px,#ffffff 42px 82px), linear-gradient(180deg,#f4f4f4,#c8c8c8)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#f4f4f4,#c8c8c8)" },

  // ─────── KIDS ───────
  { id: "kids-pastel-sky", name: "Pastel Sky", emoji: "☁️", category: "kids",
    background: "radial-gradient(circle at 25% 30%, #ffffff 0%, transparent 25%), radial-gradient(circle at 70% 60%, #ffffff 0%, transparent 20%), linear-gradient(180deg,#cfe6ff 0%,#a4c9f2 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#cfe6ff,#a4c9f2)" },
  { id: "kids-rainbow", name: "Rainbow", emoji: "🌈", category: "kids",
    background: "linear-gradient(180deg,#ffd4d4 0%,#ffe5b4 20%,#fff5b3 40%,#c9edb3 60%,#b3d4ff 80%,#d9c5f0 100%)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffd4d4,#d9c5f0)" },
  { id: "kids-cloud", name: "Cloud Nine", emoji: "☁️", category: "kids",
    background: "radial-gradient(circle at 20% 70%, #ffffff 0%, transparent 20%), radial-gradient(circle at 75% 30%, #ffffff 0%, transparent 22%), radial-gradient(circle at 50% 50%, #ffffff 0%, transparent 18%), linear-gradient(180deg,#eaf6ff,#c8dff5)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#eaf6ff,#c8dff5)" },
  { id: "kids-star-night", name: "Starry Night", emoji: "⭐", category: "kids",
    background: "radial-gradient(circle at 20% 25%, #fff6b0 0%, transparent 3%), radial-gradient(circle at 70% 40%, #fff6b0 0%, transparent 2%), radial-gradient(circle at 40% 70%, #fff6b0 0%, transparent 2.5%), radial-gradient(circle at 85% 75%, #fff6b0 0%, transparent 3%), linear-gradient(180deg,#2a3a72,#0e163a)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(180deg,#2a3a72,#0e163a)" },
  { id: "kids-bubble-gum", name: "Bubble Gum", emoji: "🍬", category: "kids",
    background: "radial-gradient(circle at 30% 40%, #ffb3d1 0%, transparent 35%), radial-gradient(circle at 70% 60%, #b3d9ff 0%, transparent 35%), linear-gradient(180deg,#fff0f6,#ffd5e5)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(160deg,#ffb3d1,#b3d9ff)" },
  { id: "kids-play-mat", name: "Play Mat", emoji: "🧩", category: "kids",
    background: "repeating-linear-gradient(0deg,#ffcf70 0 60px,#ff9ec5 60px 120px,#7ecbff 120px 180px,#8ee0a4 180px 240px), linear-gradient(180deg,#ffe6a3,#c7e5ff)",
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 56, rotation: 0 },
    swatch: "linear-gradient(135deg,#ffcf70,#7ecbff)" },

  // ─────── OFFICE: 2 lighter variants ───────
  { id: "office-oak-desk", name: "Oak Desk", emoji: "💼", category: "office",
    background: `${woodTable} center 76%/90% no-repeat, radial-gradient(ellipse at 50% 25%, #faf3e6 0%, #ecdcc0 60%, #a97b48 100%)`,
    slot: { xPct: 24, yPct: 22, wPct: 52, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(180deg,#faf3e6,#a97b48)" },
  { id: "office-marble-desk", name: "Marble Desk", emoji: "🖇️", category: "office",
    background: `${marbleBlock} center 78%/92% no-repeat, radial-gradient(ellipse at 50% 30%, #ffffff 0%, #ede8dc 55%, #c8bfa8 100%)`,
    slot: { xPct: 26, yPct: 22, wPct: 48, hPct: 54, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffffff,#c8bfa8)" },

  // ─────── HOME & FURNITURE (real furniture silhouettes) ───────
  { id: "home-armchair", name: "Cozy Armchair", emoji: "🪑", category: "walls",
    background: `${armchair} center 78%/60% no-repeat, linear-gradient(180deg,#f5efe4 0%,#d9ceb8 100%)`,
    slot: { xPct: 30, yPct: 18, wPct: 40, hPct: 46, rotation: 0 },
    swatch: "linear-gradient(160deg,#f5efe4,#8a6a4f)" },
  { id: "home-dining-table", name: "Dining Table", emoji: "🍽️", category: "walls",
    background: `${diningTable} center 82%/72% no-repeat, radial-gradient(ellipse at 50% 30%, #faf3e6 0%, #e6d9bf 60%, #b89a7c 100%)`,
    slot: { xPct: 26, yPct: 20, wPct: 48, hPct: 44, rotation: 0 },
    swatch: "linear-gradient(180deg,#faf3e6,#9b7748)" },
  { id: "home-shelf-unit", name: "Wall Shelf", emoji: "🗄️", category: "walls",
    background: `${shelfUnit} center center/70% no-repeat, linear-gradient(180deg,#f0e8d8 0%,#d8ccb2 100%)`,
    slot: { xPct: 34, yPct: 22, wPct: 32, hPct: 30, rotation: 0 },
    swatch: "linear-gradient(160deg,#f0e8d8,#8a6a4f)" },
  { id: "home-sofa-set", name: "Sofa Setting", emoji: "🛋️", category: "walls",
    background: `${sofaSet} center 82%/78% no-repeat, linear-gradient(180deg,#efe6d3 0%,#c9baa1 100%)`,
    slot: { xPct: 28, yPct: 20, wPct: 44, hPct: 40, rotation: 0 },
    swatch: "linear-gradient(160deg,#efe6d3,#7a6650)" },

  // ─────── FOOD & DELIVERY (plate / cup / tray) ───────
  { id: "food-plate", name: "Ceramic Plate", emoji: "🍽️", category: "kitchen",
    background: `${plateAndCutlery} center 55%/80% no-repeat, radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f3ede1 60%, #cfc4b0 100%)`,
    slot: { xPct: 30, yPct: 26, wPct: 40, hPct: 42, rotation: 0 },
    swatch: "radial-gradient(circle,#ffffff,#d9d1c2)" },
  { id: "food-teacup", name: "Cup & Saucer", emoji: "☕", category: "kitchen",
    background: `${teacup} center 70%/60% no-repeat, linear-gradient(180deg,#faf1e2 0%,#d9c19a 100%)`,
    slot: { xPct: 32, yPct: 18, wPct: 36, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#faf1e2,#d9c19a)" },
  { id: "food-serving-tray", name: "Serving Tray", emoji: "🥂", category: "kitchen",
    background: `${servingTray} center 78%/78% no-repeat, radial-gradient(ellipse at 50% 25%, #fbf4e8 0%, #e6d1ad 60%, #a97b48 100%)`,
    slot: { xPct: 28, yPct: 20, wPct: 44, hPct: 42, rotation: 0 },
    swatch: "linear-gradient(180deg,#fbf4e8,#a88554)" },
  { id: "food-marble-serving", name: "Marble Serve", emoji: "🍰", category: "kitchen",
    background: `${plateAndCutlery} center 60%/62% no-repeat, ${marbleBlock} center 92%/98% no-repeat, radial-gradient(ellipse at 50% 25%, #ffffff 0%, #ede8dc 55%, #c8bfa8 100%)`,
    slot: { xPct: 32, yPct: 26, wPct: 36, hPct: 40, rotation: 0 },
    swatch: "linear-gradient(180deg,#ffffff,#c8bfa8)" },

  // ─────── COSMETICS: floral podium concept ───────
  { id: "cosmetics-floral-podium", name: "Floral Podium", emoji: "🌸", category: "spa",
    background: `${floralPodium} center 70%/70% no-repeat, radial-gradient(ellipse at 50% 25%, #fff5f2 0%, #f6e3dd 55%, #d6b6a8 100%)`,
    slot: { xPct: 34, yPct: 24, wPct: 32, hPct: 40, rotation: 0 },
    swatch: "linear-gradient(160deg,#fff5f2,#f4b8c3)" },
  { id: "cosmetics-marble-bouquet", name: "Marble Bouquet", emoji: "💐", category: "spa",
    background: `${floralPodium} center 68%/54% no-repeat, ${marbleBlock} center 92%/98% no-repeat, radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f2ede4 60%, #cfc4b0 100%)`,
    slot: { xPct: 36, yPct: 28, wPct: 28, hPct: 38, rotation: 0 },
    swatch: "linear-gradient(160deg,#ffffff,#f4b8c3)" },
];

// Pro-model humans (full-body) always included; everything else must be in
// the curated allowlist. Keeps sidebar airy but exposes all model variants.
export const SNAP_TEMPLATES: SnapTemplate[] = _RAW_SNAP_TEMPLATES.filter(
  (tpl) => tpl.category === "humans" || tpl.category === "bust" || CURATED_TEMPLATE_IDS.has(tpl.id),
);

export const TEMPLATE_CATEGORIES: {
  id: TemplateCategory;
  label: string;
  emoji: string;
}[] = [
  { id: "bust", label: "Bust Shots", emoji: "👤" },
  { id: "humans", label: "Humans", emoji: "✋" },
  { id: "popular", label: "Popular", emoji: "🔥" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "flatlays", label: "Flatlays", emoji: "🧺" },
  { id: "minimal", label: "Minimal", emoji: "⬜" },
  { id: "platforms", label: "Platforms", emoji: "🏛️" },
  { id: "stones", label: "Stones", emoji: "🪨" },
  { id: "kitchen", label: "Kitchen", emoji: "🍽️" },
  { id: "spa", label: "Spa", emoji: "🧖" },
  { id: "fabric", label: "Fabric", emoji: "🧵" },
  { id: "walls", label: "Walls", emoji: "🧱" },
  { id: "city", label: "City", emoji: "🏙️" },
  { id: "office", label: "Office", emoji: "💼" },
  { id: "kids", label: "Kids", emoji: "🧸" },
];


/**
 * Fit `natural` (product w/h in px) inside `slot` (already resolved to canvas
 * px), preserving aspect ratio. Returns the placement rect centered in slot.
 */
export function fitInsideSlot(
  natural: { w: number; h: number },
  slot: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(slot.w / natural.w, slot.h / natural.h);
  const w = natural.w * scale;
  const h = natural.h * scale;
  return {
    x: slot.x + (slot.w - w) / 2,
    y: slot.y + (slot.h - h) / 2,
    w,
    h,
  };
}
