// Enterprise mega-menu taksonomisi.
// TopNav ve dashboard/help gibi surfaces bu tek kaynaktan besleniyor.

export type MegaLink = {
  id: string;
  label: string;
  description: string;
  to: string;
  search?: Record<string, string>;
};

export type MegaColumn = {
  heading: string;
  items: MegaLink[];
};

export type MegaMenu = {
  id: "solutions" | "industries" | "developers";
  label: string;
  columns: MegaColumn[];
  cta?: { label: string; to: string; search?: Record<string, string> };
};

export const SOLUTIONS_MENU: MegaMenu = {
  id: "solutions",
  label: "Solutions",
  columns: [
    {
      heading: "By scale",
      items: [
        {
          id: "growing",
          label: "Growing brands",
          description: "Ship studio-grade product shots without a photo team.",
          to: "/studio",
          search: { panel: "samples", industry: "marketplace" },
        },
        {
          id: "scaling",
          label: "Scaling businesses",
          description: "Multiply catalogs across 6+ marketplaces in one flow.",
          to: "/bulk",
        },
        {
          id: "enterprise",
          label: "Enterprise",
          description: "Neural Core™ API, SLAs and dedicated success team.",
          to: "/api",
        },
      ],
    },
    {
      heading: "By team",
      items: [
        {
          id: "eng",
          label: "Product & Engineering",
          description: "Image API for bulk pipelines, PIM and headless commerce.",
          to: "/api",
        },
        {
          id: "ops",
          label: "Ops & Catalog",
          description: "Bulk edit SKUs, enforce marketplace specs, export CSV.",
          to: "/bulk",
        },
        {
          id: "creative",
          label: "Creative & Photo Studio",
          description: "Snap Templates and Virtual Try-On for lookbooks.",
          to: "/studio",
          search: { panel: "templates" },
        },
        {
          id: "marketing",
          label: "Marketing",
          description: "On-brand hero visuals, campaign variants in minutes.",
          to: "/studio",
          search: { panel: "samples", industry: "beauty" },
        },
      ],
    },
  ],
  cta: { label: "Explore Studio", to: "/studio" },
};

export const INDUSTRIES_MENU: MegaMenu = {
  id: "industries",
  label: "Industries",
  columns: [
    {
      heading: "Retail & lifestyle",
      items: [
        {
          id: "fashion",
          label: "Fashion & Apparel",
          description: "Virtual Try-On, on-model shots, editorial lookbooks.",
          to: "/studio",
          search: { panel: "samples", industry: "fashion" },
        },
        {
          id: "marketplace",
          label: "Marketplace & Retail",
          description: "Amazon, Trendyol, Hepsiburada size-perfect exports.",
          to: "/studio",
          search: { panel: "samples", industry: "marketplace" },
        },
        {
          id: "beauty",
          label: "Beauty & Skincare",
          description: "Glass-clean packshots with brand-tone backgrounds.",
          to: "/studio",
          search: { panel: "samples", industry: "beauty" },
        },
      ],
    },
    {
      heading: "Home, food & tech",
      items: [
        {
          id: "home",
          label: "Home & Furniture",
          description: "Lifestyle rooms, scale-accurate staging, shadows.",
          to: "/studio",
          search: { panel: "samples", industry: "home" },
        },
        {
          id: "food",
          label: "Food & Delivery",
          description: "Menu hero cards, delivery-app ready ratios.",
          to: "/studio",
          search: { panel: "samples", industry: "food" },
        },
        {
          id: "tech",
          label: "Tech & SaaS",
          description: "Device mocks, app screens on premium scenes.",
          to: "/studio",
          search: { panel: "samples", industry: "tech" },
        },
      ],
    },
  ],
  cta: { label: "Browse 900+ templates", to: "/studio", search: { panel: "samples" } },
};

export const DEVELOPERS_MENU: MegaMenu = {
  id: "developers",
  label: "Developers",
  columns: [
    {
      heading: "Build with Neural Core™",
      items: [
        {
          id: "api",
          label: "Image API",
          description: "REST endpoints for BG remove, Try-On and bulk pipelines.",
          to: "/api",
        },
        {
          id: "bulk",
          label: "Bulk Edit",
          description: "Drop hundreds of SKUs, apply presets, export CSV.",
          to: "/bulk",
        },
      ],
    },
  ],
  cta: { label: "Read the API docs", to: "/api" },
};

export const MEGA_MENUS: MegaMenu[] = [
  SOLUTIONS_MENU,
  INDUSTRIES_MENU,
  DEVELOPERS_MENU,
];
