import type { AccountSeed, SellerProfile } from "@/domain/profile";

/**
 * Per-viewer memory of who is selling. Presets and archetypes are rebuilt from
 * the saved profile alone; researched territories also keep their seeds.
 * Storage can be missing or throw (private windows, blocked site data), so
 * every access is guarded and the app works without it.
 */

const SELLER_KEY = "territory.seller.v1";
const ONBOARDED_KEY = "territory.onboarded.v1";

export interface SavedSeller {
  profile: SellerProfile;
  seeds?: AccountSeed[];
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function saveSeller(profile: SellerProfile, seeds?: AccountSeed[] | null) {
  try {
    const value: SavedSeller = seeds?.length ? { profile, seeds } : { profile };
    storage()?.setItem(SELLER_KEY, JSON.stringify(value));
  } catch {
    // Quota or access errors: the choice simply isn't remembered.
  }
}

export function loadSavedSeller(): SavedSeller | null {
  try {
    const raw = storage()?.getItem(SELLER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSeller;
    const p = parsed?.profile;
    if (!p || typeof p.id !== "string" || typeof p.company !== "string" || typeof p.archetype !== "string") return null;
    return { profile: p, seeds: Array.isArray(parsed.seeds) && parsed.seeds.length > 0 ? parsed.seeds : undefined };
  } catch {
    return null;
  }
}

export function hasOnboarded(): boolean {
  try {
    return storage()?.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded() {
  try {
    storage()?.setItem(ONBOARDED_KEY, "1");
  } catch {
    // ignore
  }
}
