export type DomainId = "CLOUD_CONCEPTS" | "ARCHITECTURE_SERVICES" | "MANAGEMENT_GOVERNANCE";

export const DOMAINS: Record<
  DomainId,
  { label: string; weight: string; color: string; blurb: string }
> = {
  CLOUD_CONCEPTS: {
    label: "Cloud Concepts",
    weight: "25–30%",
    color: "wire",
    blurb: "The foundation: cloud models, service types, and the benefits of moving to the cloud.",
  },
  ARCHITECTURE_SERVICES: {
    label: "Azure Architecture & Services",
    weight: "35–40%",
    color: "signal",
    blurb: "The largest domain: regions, core compute, storage, networking, and identity services.",
  },
  MANAGEMENT_GOVERNANCE: {
    label: "Management & Governance",
    weight: "30–35%",
    color: "node",
    blurb: "Cost tools, governance, monitoring, and Responsible AI principles.",
  },
};

export const DOMAIN_ORDER: DomainId[] = [
  "CLOUD_CONCEPTS",
  "ARCHITECTURE_SERVICES",
  "MANAGEMENT_GOVERNANCE",
];
