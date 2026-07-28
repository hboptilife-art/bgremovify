// Photo-realistic mini renders for each SnapTemplate — used in the picker
// cards so users see the actual scene backdrop instead of an abstract swatch.

import fashionBustSoft from "@/assets/template-thumbs/fashion-bust-soft.jpg";
import fashionFullModel from "@/assets/template-thumbs/fashion-full-model.jpg";
import fashionFlatlay from "@/assets/template-thumbs/fashion-flatlay.jpg";
import fashionHanger from "@/assets/template-thumbs/fashion-hanger.jpg";
import jewelryNeckBust from "@/assets/template-thumbs/jewelry-neck-bust.jpg";
import jewelryEarlobe from "@/assets/template-thumbs/jewelry-earlobe.jpg";
import jewelryVelvet from "@/assets/template-thumbs/jewelry-velvet.jpg";
import jewelryMarbleShelf from "@/assets/template-thumbs/jewelry-marble-shelf.jpg";
import cosmeticsMarble from "@/assets/template-thumbs/cosmetics-marble.jpg";
import cosmeticsWood from "@/assets/template-thumbs/cosmetics-wood.jpg";
import cosmeticsStand from "@/assets/template-thumbs/cosmetics-stand.jpg";
import cosmeticsSpotlight from "@/assets/template-thumbs/cosmetics-spotlight.jpg";
import watchWrist from "@/assets/template-thumbs/watch-wrist.jpg";
import watchDisplay from "@/assets/template-thumbs/watch-display.jpg";
import watchDarkLuxe from "@/assets/template-thumbs/watch-dark-luxe.jpg";
import accPodiumDuo from "@/assets/template-thumbs/acc-podium-duo.jpg";
import accGlassShelf from "@/assets/template-thumbs/acc-glass-shelf.jpg";
import accSandDune from "@/assets/template-thumbs/acc-sand-dune.jpg";
import accStonePlinth from "@/assets/template-thumbs/acc-stone-plinth.jpg";
import lifeSunset from "@/assets/template-thumbs/life-sunset.jpg";
import lifeCafe from "@/assets/template-thumbs/life-cafe.jpg";
import lifeTropical from "@/assets/template-thumbs/life-tropical.jpg";
import lifeLinenFlat from "@/assets/template-thumbs/life-linen-flat.jpg";
import minWhite from "@/assets/template-thumbs/min-white.jpg";
import minCream from "@/assets/template-thumbs/min-cream.jpg";
import minCharcoal from "@/assets/template-thumbs/min-charcoal.jpg";
import minPastelPink from "@/assets/template-thumbs/min-pastel-pink.jpg";
import minSky from "@/assets/template-thumbs/min-sky.jpg";
import minMint from "@/assets/template-thumbs/min-mint.jpg";
import techNeonGrid from "@/assets/template-thumbs/tech-neon-grid.jpg";
import techHolo from "@/assets/template-thumbs/tech-holo.jpg";
import techCarbon from "@/assets/template-thumbs/tech-carbon.jpg";
import techStudioCyan from "@/assets/template-thumbs/tech-studio-cyan.jpg";
import { PRO_MODEL_THUMBS } from "./pro-models";

export const TEMPLATE_THUMBS: Record<string, string> = {
  ...PRO_MODEL_THUMBS,

  "fashion-bust-soft": fashionBustSoft,
  "fashion-full-model": fashionFullModel,
  "fashion-flatlay": fashionFlatlay,
  "fashion-hanger": fashionHanger,
  "jewelry-neck-bust": jewelryNeckBust,
  "jewelry-earlobe": jewelryEarlobe,
  "jewelry-velvet": jewelryVelvet,
  "jewelry-marble-shelf": jewelryMarbleShelf,
  "cosmetics-marble": cosmeticsMarble,
  "cosmetics-wood": cosmeticsWood,
  "cosmetics-stand": cosmeticsStand,
  "cosmetics-spotlight": cosmeticsSpotlight,
  "watch-wrist": watchWrist,
  "watch-display": watchDisplay,
  "watch-dark-luxe": watchDarkLuxe,
  "acc-podium-duo": accPodiumDuo,
  "acc-glass-shelf": accGlassShelf,
  "acc-sand-dune": accSandDune,
  "acc-stone-plinth": accStonePlinth,
  "life-sunset": lifeSunset,
  "life-cafe": lifeCafe,
  "life-tropical": lifeTropical,
  "life-linen-flat": lifeLinenFlat,
  "min-white": minWhite,
  "min-cream": minCream,
  "min-charcoal": minCharcoal,
  "min-pastel-pink": minPastelPink,
  "min-sky": minSky,
  "min-mint": minMint,
  "tech-neon-grid": techNeonGrid,
  "tech-holo": techHolo,
  "tech-carbon": techCarbon,
  "tech-studio-cyan": techStudioCyan,
};
