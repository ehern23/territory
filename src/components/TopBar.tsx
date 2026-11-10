"use client";

import { useRef, useState } from "react";
import { LensGroup } from "./glass/Lens";
import { useLiquidGlass } from "./glass/Glass";
import { AnimatePresence, motion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { isImmersive, useUiStore } from "@/store/useUiStore";
import { useAccountView } from "@/store/selectors";
import { applyDemoStep } from "./demo/script";
import { Legend } from "./Legend";

export function TopBar() {
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const returnToForest = useTerritoryStore((s) => s.returnToForest);
  const resetDemo = useTerritoryStore((s) => s.resetDemo);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const introDone = useTerritoryStore((s) => s.introDone);
  const setIntroDone = useTerritoryStore((s) => s.setIntroDone);
  const view = useAccountView(mode === "account" ? activeAccountId : null);
  const [legend, setLegend] = useState(false);
  const capsuleRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(capsuleRef, { radius: 999, strength: 22, blur: 6, saturate: 1.6, bevel: 12 });
  // On a phone the seller sits under the wordmark (where the desktop tagline
  // goes), so the capsule holds only icons and the demo, and nothing overlaps
  // down to 360px.
  const sellerUnderMark = isCompact && mode === "forest" && !demoActive;
  const icon = isCompact ? "topbar-icon" : "";

  return (
    <header
      className={`absolute top-[max(14px,env(safe-area-inset-top))] z-40 flex items-center justify-between gap-2 sm:gap-3 pointer-events-none ${
        isCompact ? "left-3 right-3" : "left-4"
      } ${mode === "account" && !isCompact ? "right-[432px]" : isCompact ? "" : "right-4"}`}
    >
      <div className="flex items-center gap-3 pointer-events-auto min-w-0">
        {sellerUnderMark ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <Mark />
            <span className="flex flex-col items-start leading-none min-w-0">
              <span className="wordmark">Territory</span>
              <SellerChip compact variant="subtitle" />
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={mode === "account" ? returnToForest : undefined}
            className="flex items-center gap-2.5 min-w-0"
            aria-label={mode === "account" ? "Back to territory" : "Territory"}
          >
            <Mark />
            <span className="flex flex-col items-start leading-none min-w-0">
              <span className={`wordmark ${isCompact ? "max-[379px]:hidden" : ""}`}>Territory</span>
              {!isCompact && mode === "forest" && <span className="text-[11.5px] text-paper-60 mt-1">A living map of a book of business</span>}
            </span>
          </button>
        )}
        <AnimatePresence>
          {view && !isCompact && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[13px] min-w-0"
            >
              <span className="text-paper-40">/</span>
              <span className="truncate font-medium">{view.account.name}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-none items-center gap-1.5 pointer-events-auto relative">
        {!introDone && !isCompact && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={setIntroDone}>
            Skip intro
          </button>
        )}
        <LensGroup ref={capsuleRef} className="glass glass-pill flex items-center gap-0.5 p-1" radius={999}>
          {/* Inside an account the bar is 430px narrower (the panel) and the sky pill shares it: the seller chip waits in the territory view. */}
          {!demoActive && !isCompact && mode === "forest" && <SellerChip compact={false} />}
          {mode === "account" && !demoActive && (
            <button type="button" data-lens className="btn btn-sm btn-pill btn-ghost !text-paper" onClick={returnToForest}>
              ← {isCompact ? "Forest" : "Territory"}
            </button>
          )}
          {mode === "forest" && <ImmerseToggle className={icon} />}
          <button
            type="button"
            data-lens
            className={`btn btn-sm btn-pill btn-ghost !text-paper ${icon}`}
            onClick={() => setLegend((v) => !v)}
            aria-expanded={legend}
            aria-label="How to read the forest"
          >
            {isCompact ? "?" : "How to read it"}
          </button>
          {!demoActive && (
            <>
              <button
                type="button"
                data-lens
                className={`btn btn-sm btn-pill btn-ghost !text-paper ${icon}`}
                onClick={resetDemo}
                aria-label="Reset demo data"
              >
                {isCompact ? "↺" : "Reset"}
              </button>
              <button type="button" data-lens className={`btn btn-sm btn-pill btn-primary ${isCompact ? "!px-3" : ""}`} onClick={() => applyDemoStep(0)}>
                <span aria-hidden>▶</span> {isCompact ? "Demo" : "Guided demo"}
              </button>
            </>
          )}
        </LensGroup>
        <AnimatePresence>{legend && <Legend onClose={() => setLegend(false)} />}</AnimatePresence>
      </div>

      {/* On a phone, Skip intro waits at the foot of the screen, clear of the bar. */}
      <AnimatePresence>
        {!introDone && isCompact && (
          <motion.button
            type="button"
            key="skip-intro"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="glass glass-pill btn btn-sm btn-pill !text-paper fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+22px)] pointer-events-auto px-5"
            onClick={setIntroDone}
          >
            Skip intro
          </motion.button>
        )}
      </AnimatePresence>
    </header>
  );
}

/** "Selling for Vercel ▾": who the territory is for; reopens onboarding. */
function SellerChip({ compact, variant = "chip" }: { compact: boolean; variant?: "chip" | "subtitle" }) {
  const profile = useTerritoryStore((s) => s.profile);
  const research = useTerritoryStore((s) => s.research);
  const open = useTerritoryStore((s) => s.onboardingOpen);
  const researching = research.status === "researching" && research.company === profile.company;
  const toggle = () => {
    const s = useTerritoryStore.getState();
    if (s.mode === "account") s.returnToForest();
    s.setOnboardingOpen(!(open && s.mode === "forest"));
    if (!s.introDone) s.setIntroDone();
  };
  if (variant === "subtitle") {
    // Under the wordmark on a phone: "Selling for Vercel ▾", or just "Vercel ▾" when narrow.
    return (
      <button
        type="button"
        className="seller-subtitle"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={researching ? `Researching ${profile.company}'s ICP. Change seller` : `Selling for ${profile.company}. Change seller`}
        title={`${profile.product} · ${profile.role}`}
      >
        {researching && <span className="research-dot" aria-hidden />}
        <span className="truncate">
          <span className="text-paper-60 max-[379px]:hidden">{researching ? "Researching " : "Selling for "}</span>
          {profile.company}
        </span>
        <span aria-hidden className="text-paper-40 text-[9px]">▾</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      data-lens
      className="btn btn-sm btn-pill btn-ghost !text-paper min-w-0"
      onClick={toggle}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={researching ? `Researching ${profile.company}'s ICP. Change seller` : `Selling for ${profile.company}. Change seller`}
      title={`${profile.product} · ${profile.role}`}
    >
      {researching && <span className="research-dot" aria-hidden />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={researching ? "researching" : profile.id}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.2 }}
          className="truncate leading-[1.4] max-w-[150px] sm:max-w-[260px]"
        >
          {compact ? (
            profile.company
          ) : researching ? (
            <>Researching {profile.company}&rsquo;s ICP…</>
          ) : (
            <>
              <span className="text-paper-60">Selling for</span> {profile.company}
            </>
          )}
        </motion.span>
      </AnimatePresence>
      <span aria-hidden className="text-paper-40 text-[10px] -ml-0.5">▾</span>
    </button>
  );
}

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="flex-none">
      <circle cx="14" cy="14" r="13.25" fill="rgba(13,16,14,0.55)" stroke="rgba(242,238,229,0.18)" strokeWidth="1" />
      <path d="M14 21.5v-6.2" stroke="#f2eee5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 15.6c-3.9 0-6-2.4-6-5.3 0-2.9 2.6-4.8 6-4.8s6 1.9 6 4.8c0 2.9-2.1 5.3-6 5.3Z" fill="#9fcf6e" />
      <circle cx="17.2" cy="12.4" r="1.5" fill="#e2a843" />
    </svg>
  );
}

/** Fold every panel away for the forest alone, or bring them back. H does the same. */
function ImmerseToggle({ className = "" }: { className?: string }) {
  const immersive = useUiStore(isImmersive);
  const toggle = useUiStore((s) => s.toggleImmersive);
  return (
    <button
      type="button"
      data-lens
      className={`btn btn-sm btn-pill btn-ghost !text-paper !px-2.5 ${className}`}
      onClick={toggle}
      aria-pressed={immersive}
      aria-label={immersive ? "Show panels (H)" : "Hide panels for the forest alone (H)"}
      title={immersive ? "Show panels (H)" : "Immerse: hide panels (H)"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={immersive ? "on" : "off"}
          initial={{ opacity: 0, scale: 0.6, filter: "blur(3px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.6, filter: "blur(3px)" }}
          transition={{ duration: 0.2 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {immersive ? (
            <>
              <rect x="3.5" y="5" width="7" height="14" rx="2" />
              <rect x="13.5" y="12" width="7" height="7" rx="2" />
            </>
          ) : (
            <>
              <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
            </>
          )}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}
