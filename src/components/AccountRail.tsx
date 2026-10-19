"use client";

import { useRef } from "react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { LensGroup } from "./glass/Lens";
import { useLiquidGlass } from "./glass/Glass";
import { matchesFilter, useAccountViews } from "@/store/selectors";
import { HEALTH_HEX } from "@/domain/health";

/** Keyboard-reachable list of accounts; mirrors the trees. */
export function AccountRail() {
  const views = useAccountViews();
  const mode = useTerritoryStore((s) => s.mode);
  const filter = useTerritoryStore((s) => s.filter);
  const hovered = useTerritoryStore((s) => s.hoveredAccountId);
  const introDone = useTerritoryStore((s) => s.introDone);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const enterAccount = useTerritoryStore((s) => s.enterAccount);
  const setHovered = useTerritoryStore((s) => s.setHovered);
  const railRef = useRef<HTMLDivElement>(null);
  const show = mode === "forest" && introDone && !demoActive && !isCompact;
  useLiquidGlass(railRef, { radius: 999, strength: 22, blur: 6, saturate: 1.6, bevel: 12, enabled: show });
  if (mode !== "forest" || !introDone || demoActive || isCompact) return null;
  return (
    <nav aria-label="Accounts" className="absolute bottom-5 left-[372px] right-[236px] z-30 flex justify-center pointer-events-none">
      <LensGroup ref={railRef} as="ul" radius={999} className="glass glass-pill scroll-x flex items-center gap-0.5 max-w-full pointer-events-auto p-1">
        {views.map((v) => (
          <li key={v.account.id}>
            <button
              type="button"
              data-lens
              className={`rail__item ${hovered === v.account.id ? "is-active" : ""} ${matchesFilter(v, filter) ? "" : "is-quiet"}`}
              onClick={() => enterAccount(v.account.id)}
              onPointerEnter={() => setHovered(v.account.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(v.account.id)}
              onBlur={() => setHovered(null)}
            >
              <span className="dot" style={{ width: 6, height: 6, background: HEALTH_HEX[v.health.band] }} aria-hidden />
              {v.account.name}
            </button>
          </li>
        ))}
      </LensGroup>
    </nav>
  );
}
