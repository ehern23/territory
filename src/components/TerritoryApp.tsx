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
import { useGlassGlare } from "./glass/Glass";

const Scene = dynamic(() => import("@/three/Scene").then((m) => m.Scene), { ssr: false });

export function TerritoryApp() {
  useGlassGlare();
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
      <DemoNarrator />
      <Notices />
      <Loader />
    </div>
  );
}
