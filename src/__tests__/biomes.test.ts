import { describe, expect, it } from "vitest";
import { BIOMES, BIOME_ORDER, speciesIndex } from "@/three/biomes/biomes";
import { seededRng } from "@/lib/random";
import { WEATHER, autoWeather, emptyWeather, forecastBlock } from "@/three/sky/weather";
import { celestial, clockFromDate, moonIllumination } from "@/three/sky/celestial";

describe("biomes", () => {
  it("every biome picks valid species everywhere", () => {
    for (const id of BIOME_ORDER) {
      const b = BIOMES[id];
      const sp = speciesIndex(b);
      const rng = seededRng("biome-test", id);
      for (let i = 0; i < 400; i++) {
        const x = rng.range(-1500, 1500);
        const z = rng.range(-1500, 1500);
        const idx = b.pick({ rng, x, z, y: rng.range(-10, 600), mf: rng.next(), open: rng.next() }, sp);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(b.species.length);
      }
    }
  });

  it("available biomes grow real trees", () => {
    for (const id of BIOME_ORDER.filter((b) => BIOMES[b].available)) {
      for (const s of BIOMES[id].species) {
        const shape = s.shape();
        expect(shape.cards.length).toBeGreaterThan(50);
        expect(shape.height).toBeGreaterThan(5);
      }
    }
  });
});

describe("sky", () => {
  it("puts the sun up at noon and down at midnight, rising in the east", () => {
    const d = new Date(2026, 5, 21, 12, 0, 0);
    const noon = celestial(clockFromDate(d, 12 + (d.getTimezoneOffset() !== new Date(2026, 0, 1).getTimezoneOffset() ? 1 : 0)));
    expect(noon.sun.y).toBeGreaterThan(0.8);
    const midnight = celestial(clockFromDate(d, 0));
    expect(midnight.sun.y).toBeLessThan(0);
    const morning = celestial(clockFromDate(d, 7));
    expect(morning.sun.x).toBeGreaterThan(0);
    const evening = celestial(clockFromDate(d, 19));
    expect(evening.sun.x).toBeLessThan(0);
  });

  it("moon phase runs from new to full", () => {
    expect(moonIllumination(0)).toBeCloseTo(0, 5);
    expect(moonIllumination(29.530588853 / 2)).toBeCloseTo(1, 5);
  });

  it("forecast is deterministic and eases between blocks", () => {
    expect(forecastBlock(1234)).toBe(forecastBlock(1234));
    const out = emptyWeather();
    const a = autoWeather(1000.1, out).params.cover;
    const b = autoWeather(1000.1, emptyWeather()).params.cover;
    expect(a).toBe(b);
    for (const w of Object.values(WEATHER)) expect(w.cover).toBeGreaterThanOrEqual(0);
  });
});
