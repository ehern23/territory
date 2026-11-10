import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { SOFT_SHADOW_TAPS, installSoftShadows, penumbraMetres, shadowRadiusTexels } from "@/three/world/softShadows";

describe("soft shadows", () => {
  it("widens the directional PCF filter and leaves point shadows alone", () => {
    const before = THREE.ShaderChunk.shadowmap_pars_fragment;
    installSoftShadows();
    const after = THREE.ShaderChunk.shadowmap_pars_fragment;
    expect(after).not.toBe(before);
    expect(after).toContain(`vogelDiskSample( i, ${SOFT_SHADOW_TAPS}, phi )`);
    expect(after).not.toContain("vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z");
    // The point-light path keeps its own five taps.
    expect(after).toContain("vec2 sample0 = vogelDiskSample( 0, 5, phi );");
    // Idempotent.
    installSoftShadows();
    expect(THREE.ShaderChunk.shadowmap_pars_fragment).toBe(after);
  });

  it("softens edges under cloud and a low sun, within a sane texel range", () => {
    const clear = penumbraMetres(0, 50, 0);
    expect(penumbraMetres(1, 50, 0)).toBeGreaterThan(clear * 2);
    expect(penumbraMetres(0, 5, 0)).toBeGreaterThan(clear);
    const desktop = shadowRadiusTexels(clear, 460, 4096);
    const phone = shadowRadiusTexels(clear, 320, 2048);
    // The same world-space softness on both budgets.
    expect(desktop * (460 / 4096)).toBeCloseTo(phone * (320 / 2048), 5);
    expect(shadowRadiusTexels(50, 460, 4096)).toBe(9);
    expect(shadowRadiusTexels(0, 460, 4096)).toBe(1);
  });
});
