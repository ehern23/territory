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
import { DemoNarrator } from "./demo/DemoNarrator";

const Scene = dynamic(() => import("@/three/Scene").then((m) => m.Scene), { ssr: false });

export function TerritoryApp() {
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

  return (
    <div id="territory-root">
      <Scene />
      <div className="scrim" />
      <TopBar />
      <TerritoryPanel />
      <AccountRail />
      <AccountPanel />
      <DemoNarrator />
      <Notices />
      <Loader />
    </div>
  );
}
