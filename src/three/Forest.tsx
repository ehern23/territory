"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useBiomeStore } from "@/store/useBiomeStore";
import { useExploreStore } from "@/store/useExploreStore";
import { matchesFilter, useAccountViews, type AccountView } from "@/store/selectors";
import { HEALTH_HEX, HEALTH_LABEL } from "@/domain/health";
import { formatMoney } from "@/domain/commercial";
import { AccountTree, type TreeVisualState } from "./flora/AccountTree";
import { FruitCluster, type FruitSpec } from "./flora/Fruit";
import { MAX_LIMBS } from "./flora/floraMaterials";
import { pruneAccountTrees, type AccountTreeModel } from "./flora/accountTrees";
import { accountPosition } from "./layout";

/**
 * The strategic accounts as trees. Business state flows one way: store →
 * account view → visual targets; the trees ease toward them every frame.
 */

function ForestTree({ view }: { view: AccountView }) {
  const accountId = view.account.id;
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const hoveredAccountId = useTerritoryStore((s) => s.hoveredAccountId);
  const filter = useTerritoryStore((s) => s.filter);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const selectedOpportunityId = useTerritoryStore((s) => s.selectedOpportunityId);
  const pulses = useTerritoryStore((s) => s.pulses);
  const enterAccount = useTerritoryStore((s) => s.enterAccount);
  const setHovered = useTerritoryStore((s) => s.setHovered);
  const selectOpportunity = useTerritoryStore((s) => s.selectOpportunity);
  const demoActive = useTerritoryStore((s) => s.demo.active);

  const position = useMemo(() => accountPosition(accountId), [accountId]);
  const active = mode === "account" && activeAccountId === accountId;
  const hovered = hoveredAccountId === accountId;
  const matches = matchesFilter(view, filter);

  const stateRef = useRef<TreeVisualState>({
    vitality: view.health.vitality,
    dormant: [],
    spring: [],
    focus: [],
    dim: 0,
    glow: 0,
  });

  // Translate business state into visual targets.
  const st = stateRef.current;
  st.vitality = view.health.vitality;
  st.dormant = new Array(MAX_LIMBS).fill(0);
  st.spring = new Array(MAX_LIMBS).fill(0);
  st.focus = new Array(MAX_LIMBS).fill(1);
  view.units.forEach((u, i) => {
    if (i >= MAX_LIMBS) return;
    st.dormant[i] = u.unit.status === "dormant" ? 1 : 0;
    st.spring[i] = u.unit.status === "reactivating" ? 1 : 0;
    if (active && focusBusinessUnitId) st.focus[i] = u.unit.id === focusBusinessUnitId ? 1 : 0.25;
  });
  st.dim = mode === "account" ? (active ? 0 : 0.55) : matches ? 0 : 0.82;

  // Brief lift when something good happens to this account.
  const pulseRef = useRef(0);
  const lastPulse = useRef(0);
  useEffect(() => {
    const mine = pulses.filter((p) => p.accountId === accountId && p.kind !== "wither");
    const latest = mine[mine.length - 1];
    if (latest && latest.id !== lastPulse.current) {
      lastPulse.current = latest.id;
      pulseRef.current = 1;
    }
  }, [pulses, accountId]);
  useFrame((_, dt) => {
    pulseRef.current = Math.max(0, pulseRef.current - dt * 0.6);
    stateRef.current.glow = (hovered && mode === "forest" ? 0.05 : 0) + pulseRef.current * 0.12;
  });

  const fruit: FruitSpec[] = useMemo(
    () =>
      view.opportunities
        .filter((o) => o.maturity)
        .map((o) => ({
          opportunityId: o.opportunity.id,
          maturity: o.maturity!,
          value: view.commercial.dealValues[o.opportunity.id] ?? 500_000,
        })),
    [view],
  );

  return (
    <AccountTree
      accountId={accountId}
      position={position}
      stateRef={stateRef}
      onSelect={() => {
        if (demoActive) return;
        if (!active) enterAccount(accountId);
      }}
      onHover={(h) => setHovered(h ? accountId : null)}
    >
      {(model) => (
        <>
          <FruitCluster
            model={model}
            fruit={fruit}
            selectedId={active ? selectedOpportunityId : null}
            onSelect={active ? selectOpportunity : undefined}
          />
          <GroundHalo model={model} visible={hovered || active} />
          {mode === "forest" && <TreeLabel view={view} model={model} hovered={hovered} quiet={!matches} />}
          {active && <LimbLabels view={view} model={model} />}
        </>
      )}
    </AccountTree>
  );
}

/** Soft pool of light at the base of a hovered / active tree. */
function GroundHalo({ model, visible }: { model: AccountTreeModel; visible: boolean }) {
  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uOpacity; varying vec2 vUv;
        void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.55, d) * smoothstep(0.25, 0.75, d) + smoothstep(0.7, 0.0, d) * 0.35;
        gl_FragColor = vec4(1.0, 0.92, 0.72, a * uOpacity); }`,
    });
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    const u = material.uniforms.uOpacity;
    u.value += ((visible ? 0.16 : 0) - u.value) * (1 - Math.exp(-dt * 5));
  });
  const r = model.shape.trunkRadius * 7;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} material={material} renderOrder={2} raycast={() => undefined}>
      <planeGeometry args={[r * 2, r * 2]} />
    </mesh>
  );
}

function TreeLabel({
  view,
  model,
  hovered,
  quiet,
}: {
  view: AccountView;
  model: AccountTreeModel;
  hovered: boolean;
  quiet: boolean;
}) {
  const enterAccount = useTerritoryStore((s) => s.enterAccount);
  const setHovered = useTerritoryStore((s) => s.setHovered);
  const introDone = useTerritoryStore((s) => s.introDone);
  const band = view.health.band;
  const labelRef = useRef<HTMLButtonElement>(null);
  const base = useMemo(() => accountPosition(view.account.id), [view.account.id]);
  // On foot, far labels would crowd the horizon: show the giants nearby and
  // the one under the crosshair.
  useFrame(({ camera }) => {
    const el = labelRef.current;
    if (!el) return;
    const ex = useExploreStore.getState();
    const show = !ex.active || ex.aimAccountId === view.account.id || camera.position.distanceTo(base) < 420;
    const o = show ? "" : "0";
    if (el.style.opacity !== o) el.style.opacity = o;
  });
  return (
    <Html
      position={[0, model.shape.crownTop + 3, 0]}
      center
      zIndexRange={[20, 0]}
      style={{ pointerEvents: introDone ? "auto" : "none" }}
    >
      <button
        ref={labelRef}
        type="button"
        className={`tree-label ${hovered ? "is-hovered" : ""} ${quiet ? "is-quiet" : ""} ${introDone ? "is-in" : ""}`}
        onClick={() => {
          // While exploring, the crosshair picks accounts (see ExploreController).
          if (!useExploreStore.getState().active) enterAccount(view.account.id);
        }}
        onPointerEnter={() => setHovered(view.account.id)}
        onPointerLeave={() => setHovered(null)}
      >
        <span className="tree-label__row">
          <span className="tree-label__dot" style={{ background: HEALTH_HEX[band] }} aria-hidden />
          <span className="tree-label__name">{view.account.name}</span>
        </span>
        <span className="tree-label__meta">
          {HEALTH_LABEL[band]} · {view.pipeline.open > 0 ? `${formatMoney(view.pipeline.open)} pipeline` : "No pipeline"}
        </span>
      </button>
    </Html>
  );
}

/** Business-unit names at the limb tips of the active tree. */
function LimbLabels({ view, model }: { view: AccountView; model: AccountTreeModel }) {
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  if (isCompact) return null;
  return (
    <>
      {view.units.map((u, i) => {
        const frame = model.shape.limbs[i];
        if (!frame) return null;
        const focused = focusBusinessUnitId === u.unit.id;
        const quiet = focusBusinessUnitId !== null && !focused;
        const p = frame.tip.clone().add(frame.outward.clone().multiplyScalar(4)).add(new THREE.Vector3(0, 2, 0));
        return (
          <Html key={u.unit.id} position={p} center zIndexRange={[20, 0]} style={{ opacity: quiet ? 0.35 : 1, transition: "opacity 300ms ease" }}>
            <button
              type="button"
              className={`limb-label ${focused ? "is-focused" : ""} ${u.unit.status === "dormant" ? "is-dormant" : ""}`}
              onClick={() => focusBusinessUnit(focused ? null : u.unit.id)}
            >
              <span
                className="dot"
                style={{
                  width: 6,
                  height: 6,
                  background: u.unit.status === "dormant" ? "#8b8378" : u.unit.status === "reactivating" ? "#b5dc6e" : "#9fcf6e",
                }}
                aria-hidden
              />
              {u.unit.shortName ?? u.unit.name}
              {u.unit.status === "dormant" && <span className="text-paper-40">· dormant</span>}
            </button>
          </Html>
        );
      })}
    </>
  );
}

export function Forest() {
  const biome = useBiomeStore((s) => s.biome);
  const views = useAccountViews();
  const profileId = useTerritoryStore((s) => s.profile.id);
  const accounts = useTerritoryStore((s) => s.accounts);
  // A new seller grows a new forest: free the old trees once they are gone.
  useEffect(() => pruneAccountTrees(accounts.map((a) => a.id)), [accounts]);
  return (
    <group key={`${profileId}:${biome}`}>
      {views.map((v) => (
        <ForestTree key={v.account.id} view={v} />
      ))}
    </group>
  );
}
