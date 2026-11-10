import * as THREE from "three";

/**
 * THREE.Clock is deprecated since r183 in favour of THREE.Timer, but React
 * Three Fiber 9 still builds its frame clock from it. This is a Timer-backed
 * stand-in with the Clock surface R3F (and drei) use: getDelta() each frame,
 * elapsedTime / oldTime, start() / stop(). The Timer also follows page
 * visibility, so returning to a hidden tab gives no huge first delta.
 *
 * R3F constructs its own THREE.Clock before we can swap it, so its one-time
 * deprecation warning remains until R3F moves to Timer (v10).
 */
export interface TimerClock {
  autoStart: boolean;
  startTime: number;
  oldTime: number;
  elapsedTime: number;
  running: boolean;
  start(): void;
  stop(): void;
  getElapsedTime(): number;
  getDelta(): number;
  dispose(): void;
}

export function createTimerClock(): TimerClock {
  const timer = new THREE.Timer();
  if (typeof document !== "undefined") timer.connect(document);
  return {
    autoStart: true,
    startTime: 0,
    oldTime: 0,
    elapsedTime: 0,
    running: false,
    start() {
      timer.reset();
      this.startTime = performance.now();
      this.oldTime = this.startTime;
      this.elapsedTime = 0;
      this.running = true;
    },
    stop() {
      this.getElapsedTime();
      this.running = false;
      this.autoStart = false;
    },
    getElapsedTime() {
      this.getDelta();
      return this.elapsedTime;
    },
    getDelta() {
      if (this.autoStart && !this.running) {
        this.start();
        return 0;
      }
      if (!this.running) return 0;
      timer.update();
      const delta = timer.getDelta();
      this.oldTime = performance.now();
      this.elapsedTime += delta;
      return delta;
    },
    dispose() {
      timer.dispose();
    },
  };
}
