// Shared marketplace + standard format definitions used by /dashboard and /studio.
// Standard e-commerce/social ratios come first (what users search for daily),
// followed by the marketplace-specific presets.

export type MarketplaceId =
  | "square"
  | "portrait45"
  | "story"
  | "landscape"
  | "pinterest"
  | "wide"
  | "amazon"
  | "ebay"
  | "shopify"
  | "etsy"
  | "trendyol"
  | "kaspi"
  | "ozon"
  | "wildberries";

export type MarketplaceGroup = "standard" | "marketplace";

export type Marketplace = {
  id: MarketplaceId;
  label: string;
  short: string;
  /** CSS aspect-ratio string, e.g. "1 / 1" */
  aspect: string;
  /** numeric ratio (w/h) for math */
  ratio: number;
  accent: string;
  group: MarketplaceGroup;
};

export const MARKETPLACES: Marketplace[] = [
  // Standard formats — the ones users search for constantly
  { id: "square",      label: "Square",         short: "1:1",  aspect: "1 / 1", ratio: 1,     accent: "#0f172a", group: "standard" },
  { id: "portrait45",  label: "Portrait",       short: "4:5",  aspect: "4 / 5", ratio: 4 / 5, accent: "#0f172a", group: "standard" },
  { id: "story",       label: "Story / Reels",  short: "9:16", aspect: "9 / 16",ratio: 9 / 16,accent: "#0f172a", group: "standard" },
  { id: "landscape",   label: "Landscape",      short: "16:9", aspect: "16 / 9",ratio: 16 / 9,accent: "#0f172a", group: "standard" },
  { id: "pinterest",   label: "Pinterest",      short: "2:3",  aspect: "2 / 3", ratio: 2 / 3, accent: "#e60023", group: "standard" },
  { id: "wide",        label: "Wide banner",    short: "3:1",  aspect: "3 / 1", ratio: 3,     accent: "#0f172a", group: "standard" },
  // Marketplaces
  { id: "amazon",      label: "Amazon",         short: "1:1",  aspect: "1 / 1", ratio: 1,     accent: "#ff9900", group: "marketplace" },
  { id: "ebay",        label: "eBay",           short: "1:1",  aspect: "1 / 1", ratio: 1,     accent: "#e53238", group: "marketplace" },
  { id: "shopify",     label: "Shopify",        short: "1:1",  aspect: "1 / 1", ratio: 1,     accent: "#95bf47", group: "marketplace" },
  { id: "etsy",        label: "Etsy",           short: "4:3",  aspect: "4 / 3", ratio: 4 / 3, accent: "#f16521", group: "marketplace" },
  { id: "trendyol",    label: "Trendyol",       short: "2:3",  aspect: "2 / 3", ratio: 2 / 3, accent: "#f27a1a", group: "marketplace" },
  { id: "kaspi",       label: "Kaspi",          short: "1:1",  aspect: "1 / 1", ratio: 1,     accent: "#f14635", group: "marketplace" },
  { id: "ozon",        label: "Ozon",           short: "3:4",  aspect: "3 / 4", ratio: 3 / 4, accent: "#005bff", group: "marketplace" },
  { id: "wildberries", label: "Wildberries",    short: "3:4",  aspect: "3 / 4", ratio: 3 / 4, accent: "#cb11ab", group: "marketplace" },
];

const STORAGE_KEY = "bgr-marketplace";
const EVENT = "bgr-marketplace-change";

export function getMarketplace(): MarketplaceId {
  if (typeof window === "undefined") return "square";
  const v = window.localStorage.getItem(STORAGE_KEY) as MarketplaceId | null;
  return v && MARKETPLACES.some((m) => m.id === v) ? v : "square";
}

export function setMarketplace(id: MarketplaceId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

export function subscribeMarketplace(cb: (id: MarketplaceId) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<MarketplaceId>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function marketplaceById(id: MarketplaceId): Marketplace {
  return MARKETPLACES.find((m) => m.id === id) ?? MARKETPLACES[0];
}
