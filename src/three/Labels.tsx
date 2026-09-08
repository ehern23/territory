"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { currentBusinessUnits, useTerritoryStore } from "@/store/useTerritoryStore";
import { coverageOf, formatPercent } from "@/domain/penetration";
import type { TreeSkeleton } from "@/three/treeGen";

const SEASON_GLYPH = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" } as const;

/**
 * Quiet, tappable labels at the tip of each business-unit limb. They are the
 * visible (non-hover) alternative to discovering branches by clicking wood.
 */
export function BranchLabels({ skeleton }: { skeleton: TreeSkeleton }) {
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const businessUnitsById = useTerritoryStore((s) => s.businessUnitsById);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const view = useTerritoryStore((s) => s.view);
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);

  const units = useMemo(
    () => currentBusinessUnits({ accountsById, businessUnitsById }, skeleton.accountId),
    [accountsById, businessUnitsById, skeleton.accountId],
  );

  if (view === "roots") return null;

  return (
    <group>
      {units.map((bu) => {
        const frame = skeleton.buFrames[bu.id];
        if (!frame) return null;
        const coverage = coverageOf(
          bu.teams.flatMap((t) => t.prospects.map((p) => prospectsById[p.id] ?? p)),
        );
        const focused = focusBusinessUnitId === bu.id;
        const quiet = focusBusinessUnitId !== null && !focused;
        const label = bu.shortName ?? bu.name;
        const secondary =
          view === "penetration"
            ? formatPercent(coverage.penetration)
            : bu.status === "dormant"
              ? "Dormant"
              : bu.status === "reactivating"
                ? "Spring"
                : SEASON_GLYPH[bu.season];
        return (
          <Html
            key={bu.id}
            position={[frame.tip.x, frame.tip.y + 1.6, frame.tip.z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "auto", opacity: quiet ? 0.45 : 1, transition: "opacity 300ms ease" }}
          >
            <button
              type="button"
              className={`branch-label ${focused ? "is-focused" : ""} ${bu.status === "dormant" ? "is-dormant" : ""}`}
              onClick={(e) => {
                // Keep the click from reaching the canvas wrapper, where R3F
                // would treat it as a "pointer missed" and clear the selection.
                e.stopPropagation();
                focusBusinessUnit(focused ? null : bu.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-pressed={focused}
              aria-label={`${bu.name}, ${secondary}`}
            >
              <span className="branch-label__name">{label}</span>
              <span className="branch-label__meta">{secondary}</span>
            </button>
          </Html>
        );
      })}
    </group>
  );
}

/**
 * Low-profile identity at the foot of each strategic tree. A stone ring is
 * always present; the name appears only when the tree is selected.
 */
export function ForestMarker({
  accountId,
  skeleton,
  selected,
}: {
  accountId: string;
  skeleton: TreeSkeleton;
  selected: boolean;
}) {
  const account = useTerritoryStore((s) => s.accountsById[accountId]);
  const selectAccount = useTerritoryStore((s) => s.selectAccount);
  const r = skeleton.trunkRadius * 2.35;
  if (!account) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[r * 0.92, r, 48]} />
        <meshBasicMaterial
          color={selected ? "#d7c4a4" : "#8a8174"}
          transparent
          opacity={selected ? 0.55 : 0.18}
          depthWrite={false}
        />
      </mesh>
      {selected && (
        <Html position={[0, 0.55, r + 0.4]} center zIndexRange={[8, 0]} style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            className="account-ground-label"
            onClick={(e) => {
              e.stopPropagation();
              selectAccount(accountId);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {account.name}
          </button>
        </Html>
      )}
    </group>
  );
}
