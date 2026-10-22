"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { TopBar } from "./TopBar";
import { TerritoryPanel } from "./TerritoryPanel";
import { AccountPanel } from "./AccountPanel";
import { AccountRail } from "./AccountRail";
import { Notices } from "./Notices";
import { Loader } from "./Loader";
import { IntroTitle } from "./IntroTitle";
import { DemoNarrator } from "./demo/DemoNarrator";
import { Minimap } from "./Minimap";
import { SkyControl } from "./SkyControl";
import { ExploreHud } from "./ExploreHud";
import { useUiStore } from "@/store/useUiStore";
import { useGlassGlare } from "./glass/Glass";
import { SellerOnboarding } from "./onboarding/SellerOnboarding";
import { flushPendingResearch, restoreSeller } from "./onboarding/seller";
import { hasOnboarded } from "@/store/persistence";

const Scene = dynamic(() => import("@/three/Scene").then((m) => m.Scene), { ssr: false });

export function TerritoryApp() {
  useGlassGlare();
  useSellerLifecycle();
  // Escape peels back one layer: selection → account → territory.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useTerritoryStore.getState();
      if (s.demo.active) return;
      if (s.mode === "account") {
        if (s.selectedProspectId || s.selectedOpportunityId || s.focusTeamId || s.focusBusinessUnitId) {
          s.clearSelection();
          return;
        }
        s.returnToForest();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Any interaction ends the establishing shot.
  useEffect(() => {
    const skip = () => {
      const s = useTerritoryStore.getState();
      if (!s.introDone) s.setIntroDone();
    };
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  return (
    <div id="territory-root">
      <Scene />
      <div className="scrim" />
      <IntroTitle />
      <TopBar />
      <TerritoryPanel />
      <AccountRail />
      <AccountPanel />
      <Minimap />
      <SkyControl />
      <ExploreHud />
      <PanelKeys />
      <SellerOnboarding />
      <DemoNarrator />
      <Notices />
      <Loader />
    </div>
  );
}

/**
 * Seller lifecycle: restore the remembered seller, offer onboarding once the
 * establishing shot ends on a first visit, and apply researched territories
 * that arrived while the user was inside an account.
 */
function useSellerLifecycle() {
  const introDone = useTerritoryStore((s) => s.introDone);

  useEffect(() => {
    restoreSeller();
    return useTerritoryStore.subscribe((s, prev) => {
      if (s.mode === "forest" && prev.mode !== "forest") flushPendingResearch();
    });
  }, []);

  useEffect(() => {
    if (!introDone || hasOnboarded()) return;
    const t = setTimeout(() => {
      const s = useTerritoryStore.getState();
      if (!s.demo.active && !hasOnboarded()) s.setOnboardingOpen(true);
    }, 900);
    return () => clearTimeout(t);
  }, [introDone]);
}

/** H folds every panel away (or brings them back); M does the same for the map. */
function PanelKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "h") useUiStore.getState().toggleImmersive();
      if (k === "m") useUiStore.getState().togglePanel("map");
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);
  return null;
}
