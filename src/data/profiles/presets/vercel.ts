import type { SellerPreset } from "@/domain/profile";

/**
 * The default seller: the original illustrative Vercel Majors territory. Its
 * accounts are the hand-built specs in src/data/accounts and the overlay in
 * src/data/commercial.ts, used unchanged, so `seeds` is empty.
 */
export const vercel: SellerPreset = {
  aliases: ["vercel", "vercel inc", "zeit", "next.js", "nextjs"],
  profile: {
    id: "vercel",
    company: "Vercel",
    productName: "Vercel",
    product: "Frontend cloud: application delivery, previews, CI/CD, observability and AI infrastructure",
    category: "frontend cloud",
    role: "AE",
    territoryLabel: "Vercel Majors",
    motion: "platform standardization",
    icp: "Global enterprises with large digital surfaces and engineering organizations modernizing web delivery and adopting AI.",
    valueProps: [
      "Ship web experiences faster with previews and global delivery",
      "Framework-defined infrastructure for Next.js and more",
      "AI Gateway and agent infrastructure",
      "Enterprise security and governance",
    ],
    personas: ["VP Engineering", "Head of Platform Engineering", "Director, Digital Experience", "CISO"],
    archetype: "devtools",
    source: "preset",
  },
  seeds: [],
};
