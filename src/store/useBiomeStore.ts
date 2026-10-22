import { create } from "zustand";
import { BIOMES, type BiomeId } from "@/three/biomes/biomes";

/**
 * The active biome. Remembered per browser; `?biome=redwood` overrides it.
 */

const KEY = "territory.biome.v1";

function initial(): BiomeId {
  if (typeof window === "undefined") return "mountain";
  const q = new URLSearchParams(window.location.search).get("biome") as BiomeId | null;
  if (q && BIOMES[q]?.available) return q;
  try {
    const saved = window.localStorage.getItem(KEY) as BiomeId | null;
    if (saved && BIOMES[saved]?.available) return saved;
  } catch {
    // Storage can be unavailable (private windows); fall back to the default.
  }
  return "mountain";
}

interface BiomeStore {
  biome: BiomeId;
  setBiome: (b: BiomeId) => void;
}

export const useBiomeStore = create<BiomeStore>((set) => ({
  biome: initial(),
  setBiome: (biome) => {
    if (!BIOMES[biome]?.available) return;
    try {
      window.localStorage.setItem(KEY, biome);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    set({ biome });
  },
}));

export function activeBiome() {
  return BIOMES[useBiomeStore.getState().biome];
}
