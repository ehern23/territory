import { create } from "zustand";

/**
 * Explore mode: moving through the territory on foot or in flight, the way a
 * game does. WASD moves, the mouse looks, Space jumps (twice for a double
 * jump), a double tap of Space takes off or lands.
 */

const HINT_KEY = "territory.explore-hint.v1";

function hintSeen() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export type ExploreStart = "here" | "ground";

interface ExploreStore {
  active: boolean;
  /** Where to begin: float from the current view, or on foot in a glade. */
  start: ExploreStart;
  /** Bumped on each entry so the controller re-seeds the player. */
  nonce: number;
  locked: boolean;
  flying: boolean;
  /** The account giant under the crosshair. */
  aimAccountId: string | null;
  showHint: boolean;
  enter: (start?: ExploreStart) => void;
  exit: () => void;
  setLocked: (locked: boolean) => void;
  setFlying: (flying: boolean) => void;
  setAim: (id: string | null) => void;
  dismissHint: () => void;
}

export const useExploreStore = create<ExploreStore>((set, get) => ({
  active: false,
  start: "here",
  nonce: 0,
  locked: false,
  flying: true,
  aimAccountId: null,
  showHint: false,
  enter: (start = "here") =>
    set({ active: true, start, nonce: get().nonce + 1, flying: start === "here", aimAccountId: null, showHint: !hintSeen() }),
  exit: () => set({ active: false, locked: false, aimAccountId: null }),
  setLocked: (locked) => set({ locked }),
  setFlying: (flying) => set({ flying }),
  setAim: (aimAccountId) => {
    if (get().aimAccountId !== aimAccountId) set({ aimAccountId });
  },
  dismissHint: () => {
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      // Not persisted; the hint simply shows again next visit.
    }
    set({ showHint: false });
  },
}));

if (typeof window !== "undefined") {
  (window as unknown as { __explore?: unknown }).__explore = useExploreStore;
}
