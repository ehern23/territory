import { create } from "zustand";

/**
 * Which panels are open. Each can fold away into a small glass bubble so the
 * forest has the screen; the choice is remembered per browser.
 */

const KEY = "territory.panels.v1";

interface Panels {
  overview: boolean;
  map: boolean;
}

function load(): Panels {
  const fallback = { overview: true, map: true };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(p: Panels) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Not persisted; the choice still holds for this visit.
  }
}

const PERF_KEY = "territory.perf.v1";

/** The performance overlay: on with `?perf`, otherwise as last left. */
function loadPerf(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).has("perf")) return true;
  try {
    return window.localStorage.getItem(PERF_KEY) === "1";
  } catch {
    return false;
  }
}

interface UiStore extends Panels {
  /** Frame-pacing overlay, tucked away in the sky panel (or the ` key). */
  perf: boolean;
  setPerf: (on: boolean) => void;
  setPanel: (panel: keyof Panels, open: boolean) => void;
  togglePanel: (panel: keyof Panels) => void;
  /** Fold everything away, or bring it all back. */
  toggleImmersive: () => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  ...load(),
  perf: loadPerf(),
  setPerf: (perf) => {
    set({ perf });
    try {
      window.localStorage.setItem(PERF_KEY, perf ? "1" : "0");
    } catch {
      // Not persisted.
    }
  },
  setPanel: (panel, open) => {
    set({ [panel]: open } as Partial<Panels>);
    save({ overview: get().overview, map: get().map });
  },
  togglePanel: (panel) => get().setPanel(panel, !get()[panel]),
  toggleImmersive: () => {
    const anyOpen = get().overview || get().map;
    set({ overview: !anyOpen, map: !anyOpen });
    save({ overview: !anyOpen, map: !anyOpen });
  },
}));

export const isImmersive = (s: Panels) => !s.overview && !s.map;
