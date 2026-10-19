import type { AccountSeed, SellerProfile, SellerRole } from "@/domain/profile";
import { DEFAULT_PROFILE, presetById, profileForCompany } from "@/data/profiles";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { loadSavedSeller, markOnboarded } from "@/store/persistence";

/**
 * Seller actions shared by the onboarding card and the top bar. Choosing a
 * company swaps the territory immediately (preset or archetype); for unknown
 * companies an optional research call may later swap in a researched
 * territory. Nothing here ever blocks the forest.
 */

const S = () => useTerritoryStore.getState();

/** True in the static preview build, where the research route does not exist. */
const STATIC_BUILD = process.env.NEXT_PUBLIC_TERRITORY_STATIC === "1";
const RESEARCH_TIMEOUT_MS = 150_000;

let inflight: AbortController | null = null;
let pending: { profile: SellerProfile; seeds: AccountSeed[] } | null = null;

function finishOnboarding() {
  markOnboarded();
  S().setOnboardingOpen(false);
}

function cancelResearch() {
  inflight?.abort();
  inflight = null;
  pending = null;
  if (S().research.status === "researching") S().setResearch({ status: "idle", company: null });
}

/** Grow the territory for whatever company the user typed. */
export function chooseCompany(company: string, role: SellerRole) {
  const name = company.trim();
  if (!name) return;
  cancelResearch();
  const { profile, seeds, preset } = profileForCompany(name, role);
  S().loadProfile(profile, seeds);
  finishOnboarding();
  if (!preset) void research(name, role, profile.id);
}

export function choosePreset(id: string, role: SellerRole) {
  const preset = presetById(id);
  if (!preset) return;
  cancelResearch();
  S().loadProfile({ ...preset.profile, role });
  finishOnboarding();
}

/** "Skip — explore the Vercel demo". */
export function chooseDefault() {
  cancelResearch();
  const s = S();
  if (s.profile.id !== DEFAULT_PROFILE.id) s.loadProfile({ ...DEFAULT_PROFILE, role: s.profile.role });
  finishOnboarding();
}

export function closeOnboarding() {
  finishOnboarding();
}

/** Restore the remembered seller on load. Silent: no notice, no re-save. */
export function restoreSeller() {
  const saved = loadSavedSeller();
  if (!saved) return;
  try {
    const preset = presetById(saved.profile.id);
    const role = (["AE", "SDR", "AM"] as const).includes(saved.profile.role) ? saved.profile.role : "AE";
    const profile = preset ? { ...preset.profile, role } : { ...saved.profile, role };
    const current = S().profile;
    if (profile.id === current.id && profile.role === current.role) return;
    S().loadProfile(profile, preset ? null : (saved.seeds ?? null), { persist: false, announce: false });
  } catch {
    // A corrupted save: stay on the default territory.
  }
}

/** Apply a researched territory that arrived while the user was inside an account. */
export function flushPendingResearch() {
  const s = S();
  if (!pending || s.mode !== "forest" || s.demo.active) return;
  const next = pending;
  pending = null;
  if (s.profile.id !== next.profile.id) return;
  s.loadProfile(next.profile, next.seeds);
  s.setResearch({ status: "done", company: next.profile.company });
}

function isSeedList(v: unknown): v is AccountSeed[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((s) => s && typeof s.name === "string" && Array.isArray(s.units) && Array.isArray(s.stakeholders) && Array.isArray(s.opportunities))
  );
}

async function research(company: string, role: SellerRole, profileId: string) {
  if (STATIC_BUILD || typeof fetch === "undefined") {
    S().setResearch({ status: "unavailable", company });
    return;
  }
  const controller = new AbortController();
  inflight = controller;
  const timer = setTimeout(() => controller.abort(), RESEARCH_TIMEOUT_MS);
  S().setResearch({ status: "researching", company });
  try {
    const res = await fetch("/api/territory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, role }),
      signal: controller.signal,
    });
    if (inflight !== controller) return;
    if ([404, 405, 409, 501].includes(res.status)) {
      S().setResearch({ status: "unavailable", company });
      return;
    }
    const data = res.ok ? ((await res.json().catch(() => null)) as { profile?: SellerProfile; seeds?: unknown } | null) : null;
    if (!data?.profile || data.profile.id !== profileId || !isSeedList(data.seeds)) {
      S().setResearch({ status: "failed", company });
      return;
    }
    const s = S();
    if (s.profile.id !== profileId || s.demo.active) {
      s.setResearch({ status: "idle", company: null });
      return;
    }
    // Applied now, or as soon as the user is back in the forest view.
    pending = { profile: data.profile, seeds: data.seeds };
    flushPendingResearch();
  } catch {
    if (inflight === controller) S().setResearch({ status: controller.signal.aborted ? "idle" : "failed", company });
  } finally {
    clearTimeout(timer);
    if (inflight === controller) inflight = null;
  }
}
