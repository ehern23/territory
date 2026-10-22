/**
 * Frame timing shared between the probe inside the canvas and the `?perf`
 * overlay. Ring buffers of the last few seconds of frames; nothing here
 * allocates per frame.
 */

export const PERF_ENABLED = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

const N = 720;

export const perfStats = {
  /** Time between frames, ms. */
  frame: new Float32Array(N),
  /** Main-thread time spent in the frame (scene updates and draw submission), ms. */
  cpu: new Float32Array(N),
  /** GPU time for the frame, ms (NaN until the timer query resolves, or when unsupported). */
  gpu: new Float32Array(N).fill(NaN),
  /** performance.now() at each frame. */
  at: new Float64Array(N),
  /** Index of the next frame to write. */
  head: 0,
  count: 0,
  calls: 0,
  triangles: 0,
  programs: 0,
  gpuSupported: false,
  renderer: "",
  width: 0,
  height: 0,
  dpr: 1,
  size: N,
};

export function slot(back: number) {
  return (perfStats.head - 1 - back + N * 2) % N;
}

export interface PerfSummary {
  seconds: number;
  frames: number;
  refreshHz: number;
  fps: number;
  low1: number;
  worst: number;
  medianFrame: number;
  dropped: number;
  cpu: number;
  cpuWorst: number;
  gpu: number | null;
  gpuWorst: number | null;
}

/** Statistics over the last `seconds` of frames. */
export function summarize(seconds = 5): PerfSummary {
  const now = performance.now();
  const frames: number[] = [];
  const cpu: number[] = [];
  const gpu: number[] = [];
  for (let i = 0; i < Math.min(perfStats.count, N); i++) {
    const k = slot(i);
    if (now - perfStats.at[k] > seconds * 1000) break;
    frames.push(perfStats.frame[k]);
    cpu.push(perfStats.cpu[k]);
    if (!Number.isNaN(perfStats.gpu[k])) gpu.push(perfStats.gpu[k]);
  }
  const sorted = [...frames].sort((a, b) => a - b);
  const pick = (arr: number[], q: number) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : 0);
  // The display's refresh interval: the typical fast frame.
  const interval = Math.max(4, pick(sorted, 0.1));
  const total = frames.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  return {
    seconds,
    frames: frames.length,
    refreshHz: Math.round(1000 / interval),
    fps: total > 0 ? (frames.length * 1000) / total : 0,
    low1: sorted.length ? 1000 / pick(sorted, 0.99) : 0,
    worst: sorted.length ? sorted[sorted.length - 1] : 0,
    medianFrame: pick(sorted, 0.5),
    // A frame that took longer than one and a half refresh intervals showed the previous image twice.
    dropped: frames.filter((f) => f > interval * 1.5).length,
    cpu: avg(cpu),
    cpuWorst: cpu.length ? Math.max(...cpu) : 0,
    gpu: gpu.length ? avg(gpu) : null,
    gpuWorst: gpu.length ? Math.max(...gpu) : null,
  };
}

if (PERF_ENABLED) (window as unknown as { __perf?: unknown }).__perf = { perfStats, summarize };
