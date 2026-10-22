"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLiquidGlass } from "../glass/Glass";
import { LensGroup } from "../glass/Lens";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { ARCHETYPE_LABEL, DEFAULT_PROFILE, PRESETS, classifySeller, findPreset } from "@/data/profiles";
import { ROLE_LABEL, type SellerRole } from "@/domain/profile";
import { chooseCompany, chooseDefault, choosePreset, closeOnboarding } from "./seller";

const ROLES: SellerRole[] = ["AE", "SDR", "AM"];
const SUGGESTIONS = PRESETS.filter((p) => p.profile.id !== DEFAULT_PROFILE.id);
const STATIC_BUILD = process.env.NEXT_PUBLIC_TERRITORY_STATIC === "1";

/**
 * "Where do you sell?" A small first-visit card (and, later, the seller
 * switcher): type a company or pick one, choose a role, and the forest regrows
 * around that seller's ICP.
 */
export function SellerOnboarding() {
  const open = useTerritoryStore((s) => s.onboardingOpen);
  const introDone = useTerritoryStore((s) => s.introDone);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const mode = useTerritoryStore((s) => s.mode);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const profile = useTerritoryStore((s) => s.profile);
  const research = useTerritoryStore((s) => s.research);
  const reduce = useReducedMotion();
  const visible = open && introDone && !demoActive && mode === "forest";

  const cardRef = useRef<HTMLElement>(null);
  useLiquidGlass(cardRef, { radius: 22, strength: 56, blur: 9, saturate: 1.5, enabled: visible });
  const inputRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<SellerRole>(profile.role);

  // Fresh form each time the card opens.
  useEffect(() => {
    if (!visible) return;
    setCompany("");
    setRole(useTerritoryStore.getState().profile.role);
    if (isTouch) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380);
    return () => clearTimeout(t);
  }, [visible, isTouch]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOnboarding();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const hint = useMemo(() => {
    const q = company.trim();
    if (q.length < 2) return null;
    const preset = findPreset(q);
    if (preset) return `Curated territory · ${preset.profile.category}`;
    const label = ARCHETYPE_LABEL[classifySeller(q)];
    return STATIC_BUILD ? `Starts from a ${label.toLowerCase()} ICP` : `Starts from a ${label.toLowerCase()} ICP, then researched with Claude`;
  }, [company]);

  const isDefault = profile.id === DEFAULT_PROFILE.id;
  const researchNote =
    research.status === "unavailable" && research.company === profile.company && profile.source === "archetype"
      ? `Live research isn't connected here, so ${profile.company}'s territory uses the ${ARCHETYPE_LABEL[profile.archetype].toLowerCase()} archetype.`
      : research.status === "failed" && research.company === profile.company
        ? "Research didn't come back this time; the archetype territory stays in place."
        : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          ref={cardRef}
          key="seller-onboarding"
          role="dialog"
          aria-modal="false"
          aria-labelledby="seller-onboarding-title"
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className={
            isCompact
              ? "glass glass-strong absolute inset-x-2 top-[calc(max(14px,env(safe-area-inset-top))+50px)] z-[35] p-4 max-h-[calc(100dvh-80px)] overflow-y-auto"
              : "glass glass-strong absolute top-[max(92px,14vh)] -translate-x-1/2 w-[min(460px,calc(100%-32px))] z-[35] p-6"
          }
          style={isCompact ? undefined : { left: "min(max(50%, 602px), calc(100% - 246px))" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="eyebrow" style={{ color: "var(--color-accent)" }}>
                {isDefault ? "Make it your territory" : `Selling for ${profile.company} · ${profile.role}`}
              </span>
              <h2 id="seller-onboarding-title" className={`display ${isCompact ? "text-[22px]" : "text-[26px]"} mt-2`}>
                Where do you sell?
              </h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm -mr-2 -mt-1" onClick={closeOnboarding} aria-label="Close">
              ✕
            </button>
          </div>
          <p className="text-[13px] text-paper-60 leading-relaxed mt-2">
            {isDefault
              ? "Name your company and role. The forest regrows around your ICP: eight target accounts, their organizations and a believable pipeline."
              : profile.icp}
          </p>

          <form
            className="mt-4 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              chooseCompany(company, role);
            }}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                className="field"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company, e.g. Stripe"
                aria-label="Company you sell for"
                autoComplete="organization"
                spellCheck={false}
                maxLength={60}
              />
              <button type="submit" className="btn btn-primary flex-none" disabled={company.trim().length < 2}>
                Grow <span aria-hidden>→</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 min-h-[28px]">
              <LensGroup className="flex items-center gap-1" role="radiogroup" aria-label="Your role">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    title={ROLE_LABEL[r]}
                    data-lens
                    className={`chip ${role === r ? "is-active" : ""}`}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </button>
                ))}
              </LensGroup>
              <AnimatePresence mode="wait">
                {hint && (
                  <motion.span
                    key={hint}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-[11px] text-paper-40 text-right leading-snug"
                  >
                    {hint}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </form>

          <div className="hairline my-4" />

          <div className="flex flex-col gap-2">
            <span className="eyebrow">Or try</span>
            <LensGroup className="flex flex-wrap gap-1.5" aria-label="Example sellers">
              {SUGGESTIONS.map((p) => (
                <button
                  key={p.profile.id}
                  type="button"
                  data-lens
                  className={`chip ${profile.id === p.profile.id ? "is-active" : ""}`}
                  onClick={() => choosePreset(p.profile.id, role)}
                  title={p.profile.product}
                >
                  {p.profile.company}
                </button>
              ))}
            </LensGroup>
          </div>

          {researchNote && <p className="text-[11.5px] text-paper-40 leading-relaxed mt-3">{researchNote}</p>}

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-4">
            <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={chooseDefault}>
              {isDefault ? "Skip — explore the Vercel demo" : "Back to the Vercel demo"}
            </button>
            <span className="text-[11px] text-paper-40">Real companies · fictional people and dollars</span>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
