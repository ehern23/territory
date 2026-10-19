"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createGlassFilter, supportsRefraction } from "./liquid";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

let refractionCache: boolean | null = null;
export function useRefraction() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (refractionCache === null) refractionCache = supportsRefraction();
    setOk(refractionCache);
  }, []);
  return ok;
}

/**
 * Attach liquid-glass refraction to an element. The filter is regenerated
 * when the element changes size; without Chromium support it is a no-op and
 * the CSS frosted fallback applies.
 */
export function useLiquidGlass(
  ref: RefObject<HTMLElement | null>,
  opts: { radius: number; strength?: number; blur?: number; saturate?: number; bevel?: number; magnify?: number; enabled?: boolean },
) {
  const refraction = useRefraction();
  const enabled = opts.enabled !== false && refraction;
  const { radius, strength, blur, saturate, bevel, magnify } = opts;
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const filter = createGlassFilter({ radius, strength, blur, saturate, bevel, magnify });
    const apply = () => {
      const r = el.getBoundingClientRect();
      filter.update(r.width, r.height);
    };
    apply();
    el.style.setProperty("backdrop-filter", `url(#${filter.id})`);
    el.style.setProperty("-webkit-backdrop-filter", `url(#${filter.id})`);
    el.classList.add("lg-refract");
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      filter.dispose();
      el.style.removeProperty("backdrop-filter");
      el.style.removeProperty("-webkit-backdrop-filter");
      el.classList.remove("lg-refract");
    };
  }, [ref, enabled, radius, strength, blur, saturate, bevel, magnify]);
  return enabled;
}

/** Pointer-following glare: sets --gx/--gy on the glass surface under the cursor. */
export function useGlassGlare() {
  useEffect(() => {
    let last: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".glass");
      if (last && last !== el) last.style.setProperty("--glare", "0");
      if (!el) {
        last = null;
        return;
      }
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${e.clientX - r.left}px`);
      el.style.setProperty("--gy", `${e.clientY - r.top}px`);
      el.style.setProperty("--glare", "1");
      last = el;
    };
    const leave = () => {
      last?.style.setProperty("--glare", "0");
      last = null;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
}

/** Convenience: a ref already wired to liquid glass. */
export function useGlassRef<T extends HTMLElement>(opts: Parameters<typeof useLiquidGlass>[1]) {
  const ref = useRef<T>(null);
  useLiquidGlass(ref, opts);
  return ref;
}
