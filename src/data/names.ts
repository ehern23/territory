/**
 * Fictional name pools for synthetic demo prospects.
 * These are invented people. No real employees are represented.
 */

export const FIRST_NAMES = [
  "Adaeze", "Alistair", "Amara", "Anders", "Anika", "Arjun", "Beatriz", "Callum",
  "Camille", "Cassius", "Dalia", "Dev", "Elena", "Emeka", "Esme", "Farah",
  "Felix", "Gwen", "Hana", "Hugo", "Idris", "Imogen", "Ines", "Ivo",
  "Jonah", "Juniper", "Kaito", "Keziah", "Leandro", "Lior", "Maren", "Mateo",
  "Nadia", "Niamh", "Noor", "Oren", "Priya", "Quentin", "Rafael", "Rhea",
  "Rowan", "Saoirse", "Selin", "Soren", "Tamsin", "Tariq", "Thea", "Tobias",
  "Uma", "Viggo", "Wren", "Xiomara", "Yara", "Yusuf", "Zara", "Zeke",
];

export const LAST_NAMES = [
  "Abernathy", "Achterberg", "Adeyemi", "Aldana", "Bergstrom", "Bhatt", "Calloway",
  "Castellanos", "Dahlgren", "Delacroix", "Eriksen", "Fairweather", "Galloway",
  "Grantham", "Halloran", "Hartigan", "Ikeda", "Iyer", "Jansen", "Kowalczyk",
  "Larkspur", "Lindqvist", "Marchetti", "Mbeki", "Nakamura", "Novak", "Okafor",
  "Oyelaran", "Petrova", "Quintero", "Rasmussen", "Reyes-Olmo", "Sandoval",
  "Sørensen", "Tanaka", "Thorne", "Ugarte", "Vasquez", "Vance", "Whitlock",
  "Winterbourne", "Yamazaki", "Zielinski", "Ashcombe", "Brightwater", "Fenwick",
];

export type FunctionKind =
  | "platform"
  | "product-engineering"
  | "data-ai"
  | "security"
  | "infrastructure"
  | "developer-experience"
  | "business"
  | "procurement";

export interface TitleTemplate {
  title: string;
  persona:
    | "Executive Sponsor"
    | "Economic Buyer"
    | "Technical Buyer"
    | "Champion"
    | "Influencer"
    | "Security"
    | "Procurement"
    | "Developer";
  influence: 1 | 2 | 3 | 4 | 5;
}

const ENGINEERING_LADDER: TitleTemplate[] = [
  { title: "Senior Software Engineer", persona: "Developer", influence: 1 },
  { title: "Staff Engineer", persona: "Influencer", influence: 2 },
  { title: "Principal Engineer", persona: "Influencer", influence: 3 },
  { title: "Engineering Manager", persona: "Developer", influence: 2 },
  { title: "Senior Engineering Manager", persona: "Champion", influence: 3 },
  { title: "Director of Engineering", persona: "Technical Buyer", influence: 4 },
];

export const TITLES: Record<FunctionKind, TitleTemplate[]> = {
  platform: [
    ...ENGINEERING_LADDER,
    { title: "Head of Platform Engineering", persona: "Technical Buyer", influence: 4 },
    { title: "Principal Architect", persona: "Influencer", influence: 3 },
  ],
  "product-engineering": [
    ...ENGINEERING_LADDER,
    { title: "Group Product Manager", persona: "Influencer", influence: 2 },
    { title: "Head of Product Engineering", persona: "Technical Buyer", influence: 4 },
  ],
  "data-ai": [
    { title: "Senior ML Engineer", persona: "Developer", influence: 1 },
    { title: "Staff Data Scientist", persona: "Influencer", influence: 2 },
    { title: "ML Platform Lead", persona: "Champion", influence: 3 },
    { title: "Director, AI Platform", persona: "Technical Buyer", influence: 4 },
    { title: "Head of Applied AI", persona: "Technical Buyer", influence: 4 },
    { title: "Principal Research Engineer", persona: "Influencer", influence: 3 },
  ],
  security: [
    { title: "Security Engineer", persona: "Security", influence: 1 },
    { title: "Application Security Lead", persona: "Security", influence: 3 },
    { title: "Director, Product Security", persona: "Security", influence: 4 },
    { title: "Governance & Risk Manager", persona: "Security", influence: 2 },
  ],
  infrastructure: [
    { title: "Site Reliability Engineer", persona: "Developer", influence: 1 },
    { title: "Staff Infrastructure Engineer", persona: "Influencer", influence: 2 },
    { title: "Cloud Platform Lead", persona: "Champion", influence: 3 },
    { title: "Director, Cloud Infrastructure", persona: "Technical Buyer", influence: 4 },
  ],
  "developer-experience": [
    { title: "Developer Productivity Engineer", persona: "Developer", influence: 1 },
    { title: "Staff Engineer, Developer Tools", persona: "Influencer", influence: 2 },
    { title: "Developer Experience Lead", persona: "Champion", influence: 3 },
    { title: "Director, Developer Experience", persona: "Technical Buyer", influence: 4 },
    { title: "Head of Engineering Productivity", persona: "Technical Buyer", influence: 4 },
  ],
  business: [
    { title: "Technology Business Manager", persona: "Influencer", influence: 2 },
    { title: "Chief of Staff, Technology", persona: "Influencer", influence: 3 },
    { title: "Managing Director, Technology", persona: "Economic Buyer", influence: 5 },
  ],
  procurement: [
    { title: "Strategic Sourcing Manager", persona: "Procurement", influence: 2 },
    { title: "Vendor Management Lead", persona: "Procurement", influence: 3 },
  ],
};
