"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { SEASON_HEX } from "./palette";
import { currentBusinessUnits, useTerritoryStore } from "@/store/useTerritoryStore";
import { coverageOf, formatPercent } from "@/domain/penetration";
import type { TreeSkeleton } from "@/three/treeGen";

const SEASON_GLYPH = { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" } as const;

const projected = new THREE.Vector3();
/** Pins a centred label inside the viewport so an edge tree keeps a whole, tappable name. */
function insideViewport(halfWidth: number) {
  return (el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) => {
    projected.setFromMatrixPosition(el.matrixWorld).project(camera);
    const x = (projected.x + 1) * size.width * 0.5;
    const y = (1 - projected.y) * size.height * 0.5;
    const m = Math.min(halfWidth + 10, size.width * 0.5);
    return [THREE.MathUtils.clamp(x, m, size.width - m), y];
  };
}

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
  const isCompact = useTerritoryStore((s) => s.isCompact);

  const units = useMemo(
    () => currentBusinessUnits({ accountsById, businessUnitsById }, skeleton.accountId),
    [accountsById, businessUnitsById, skeleton.accountId],
  );
  const placements = useMemo(
    () => new Map(units.map((bu) => [bu.id, insideViewport(14 + (bu.shortName ?? bu.name).length * 3.4)])),
    [units],
  );

  // Branch tips crowd together from some angles; a few pixels of vertical
  // separation keeps every name readable and tappable.
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const tick = useRef(0);
  useFrame(() => {
    if (tick.current++ % 4) return;
    const items = [...buttons.current.values()]
      .filter((el) => !el.dataset.hidden)
      .map((el) => {
        const r = (el.parentElement ?? el).getBoundingClientRect();
        return { el, left: r.left, right: r.right, top: r.top, height: r.height, dy: 0 };
      })
      .filter((i) => i.height > 0)
      .sort((a, b) => a.top - b.top);
    items.forEach((item, i) => {
      for (let pass = 0; pass < items.length; pass++) {
        const hit = items
          .slice(0, i)
          .find(
            (p) =>
              p.left < item.right - 4 &&
              item.left < p.right - 4 &&
              p.top + p.dy < item.top + item.dy + item.height &&
              item.top + item.dy < p.top + p.dy + p.height,
          );
        if (!hit) break;
        item.dy = hit.top + hit.dy + hit.height + 4 - item.top;
      }
      if (Number(item.el.dataset.dy ?? 0) !== item.dy) {
        item.el.dataset.dy = String(item.dy);
        item.el.style.transform = item.dy ? `translate3d(0, ${item.dy}px, 0)` : "";
      }
    });
  });

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
            style={{
              pointerEvents: quiet && isCompact ? "none" : "auto",
              opacity: quiet ? (isCompact ? 0 : 0.45) : 1,
              transition: "opacity 300ms ease",
            }}
            calculatePosition={placements.get(bu.id)}
          >
            <button
              ref={(el) => {
                if (el) buttons.current.set(bu.id, el);
                else buttons.current.delete(bu.id);
              }}
              type="button"
              data-hidden={quiet && isCompact ? "true" : undefined}
              tabIndex={quiet && isCompact ? -1 : undefined}
              aria-hidden={quiet && isCompact ? true : undefined}
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

let poolTexture: THREE.Texture | null = null;
function getPoolTexture() {
  if (poolTexture || typeof document === "undefined") return poolTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  poolTexture = new THREE.CanvasTexture(canvas);
  return poolTexture;
}

/**
 * Identity at the foot of each strategic tree: a warm pool of light on the
 * lawn marks it as a destination among ordinary trees, and the name sits at
 * the trunk base so it never floats over a neighbouring crown.
 */
export function ForestMarker({
  accountId,
  skeleton,
  selected,
  quiet,
}: {
  accountId: string;
  skeleton: TreeSkeleton;
  selected: boolean;
  quiet: boolean;
}) {
  const account = useTerritoryStore((s) => s.accountsById[accountId]);
  const selectAccount = useTerritoryStore((s) => s.selectAccount);
  const r = skeleton.trunkRadius * 2.35;
  const pool = useMemo(getPoolTexture, []);
  const name = account?.name ?? "";
  const calculatePosition = useMemo(() => insideViewport(22 + name.length * 4.4), [name]);
  if (!account) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 0]} renderOrder={2} raycast={() => undefined}>
        <circleGeometry args={[skeleton.canopyRadius * 0.95, 40]} />
        <meshBasicMaterial
          map={pool ?? undefined}
          color={selected ? "#ffd89a" : "#f2cf8e"}
          transparent
          opacity={selected ? 0.42 : quiet ? 0.06 : 0.17}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Html
        position={[0, 3.2, r + 0.4]}
        center
        zIndexRange={[8, 0]}
        style={{ pointerEvents: "auto" }}
        calculatePosition={calculatePosition}
      >
        <button
          type="button"
          className={`account-ground-label ${selected ? "is-selected" : ""} ${quiet ? "is-quiet" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            selectAccount(accountId);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`${account.name}, ${SEASON_GLYPH[account.season]}`}
        >
          <span className="account-ground-label__dot" style={{ background: SEASON_HEX[account.season] }} aria-hidden />
          {account.name}
        </button>
      </Html>
    </group>
  );
}
