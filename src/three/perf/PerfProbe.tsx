"use client";

import { useEffect } from "react";
import { addAfterEffect, addEffect, useThree } from "@react-three/fiber";
import { perfStats } from "@/lib/perfStats";

/**
 * Measures every frame for the `?perf` overlay: the interval between frames,
 * the main-thread time spent producing it, and (where the browser exposes a
 * GPU timer) how long the GPU took to draw it.
 */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const ctx = gl.getContext() as WebGL2RenderingContext;
    const timer = ctx.getExtension("EXT_disjoint_timer_query_webgl2") as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
    const debug = ctx.getExtension("WEBGL_debug_renderer_info");
    perfStats.renderer = debug ? String(ctx.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(ctx.getParameter(ctx.RENDERER));
    perfStats.gpuSupported = !!timer;
    gl.info.autoReset = false;

    const pending: { query: WebGLQuery; slot: number }[] = [];
    const spare: WebGLQuery[] = [];
    let active: { query: WebGLQuery; slot: number } | null = null;
    let start = 0;
    let lastFrame = 0;

    const begin = () => {
      start = performance.now();
      gl.info.reset();
      if (timer && !active) {
        const query = spare.pop() ?? ctx.createQuery();
        if (query) {
          ctx.beginQuery(timer.TIME_ELAPSED_EXT, query);
          active = { query, slot: perfStats.head };
        }
      }
    };

    const end = (t: number) => {
      const k = perfStats.head;
      perfStats.frame[k] = lastFrame ? t - lastFrame : 0;
      lastFrame = t;
      perfStats.cpu[k] = performance.now() - start;
      perfStats.gpu[k] = NaN;
      perfStats.at[k] = performance.now();
      perfStats.head = (k + 1) % perfStats.size;
      perfStats.count++;
      perfStats.calls = gl.info.render.calls;
      perfStats.triangles = gl.info.render.triangles;
      perfStats.programs = gl.info.programs?.length ?? 0;
      perfStats.width = gl.domElement.width;
      perfStats.height = gl.domElement.height;
      perfStats.dpr = gl.getPixelRatio();
      if (!timer) return;
      if (active) {
        ctx.endQuery(timer.TIME_ELAPSED_EXT);
        pending.push(active);
        active = null;
      }
      // Results arrive a few frames late; collect whatever is ready.
      const disjoint = ctx.getParameter(timer.GPU_DISJOINT_EXT);
      while (pending.length) {
        const p = pending[0];
        if (!ctx.getQueryParameter(p.query, ctx.QUERY_RESULT_AVAILABLE)) break;
        pending.shift();
        if (!disjoint) perfStats.gpu[p.slot] = ctx.getQueryParameter(p.query, ctx.QUERY_RESULT) / 1e6;
        spare.push(p.query);
      }
    };

    const offBegin = addEffect(begin);
    const offEnd = addAfterEffect(end);
    return () => {
      offBegin();
      offEnd();
      gl.info.autoReset = true;
      if (active && timer) ctx.endQuery(timer.TIME_ELAPSED_EXT);
      for (const q of [...spare, ...pending.map((p) => p.query)]) ctx.deleteQuery(q);
    };
  }, [gl]);

  return null;
}
