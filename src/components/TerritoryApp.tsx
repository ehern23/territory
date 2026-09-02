"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Header } from "./Header";
import { ForestOverlay } from "./ForestOverlay";
import { AccountToolbar } from "./AccountToolbar";
import { ContextPanel } from "./ContextPanel";
import { Notices } from "./Notices";

const Scene = dynamic(() => import("@/three/Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-paper-40 text-[12px] tracking-[0.2em] uppercase">
      Growing territory
    </div>
  ),
});

export function TerritoryApp() {
  const mode = useTerritoryStore((s) => s.mode);

  // Keyboard: Escape peels back one layer of selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useTerritoryStore.getState();
      if (s.view !== "tree") {
        s.setView("tree");
        return;
      }
      s.clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div id="territory-root">
      <Scene />
      <div className="vignette" />
      <Header />
      {mode === "forest" ? <ForestOverlay /> : <AccountToolbar />}
      <ContextPanel />
      <Notices />
    </div>
  );
}
