/**
 * The sky's base colour for a view direction: the horizon-to-zenith gradient,
 * the scattering around the sun, and the twilight band. The dome draws it;
 * the atmosphere pass fades distant ground toward the same colour, so far
 * ridges dissolve into exactly the sky behind them, in every direction.
 *
 * Needs uniforms uSunDir, uZenith, uHorizon and uSunGlow.
 */
export const SKY_GRADIENT_GLSL = /* glsl */ `
vec3 skyGradient(vec3 d) {
  float h = d.y;
  vec3 sun = normalize(uSunDir);
  float sunDot = max(dot(d, sun), 0.0);
  float lowSun = 1.0 - smoothstep(-0.1, 0.5, sun.y);
  // With the sun low, only its side of the horizon is warm; the far side
  // cools toward the zenith, with the faint rose of the anti-twilight arch.
  float side = dot(normalize(d.xz + vec2(1e-4)), normalize(sun.xz + vec2(1e-4))) * 0.5 + 0.5;
  vec3 cool = mix(uHorizon, uZenith, 0.66) * vec3(0.9, 1.0, 1.08) + vec3(0.03, 0.008, 0.02) * lowSun;
  vec3 horizon = mix(cool, uHorizon, mix(1.0, smoothstep(0.42, 1.0, side), lowSun * lowSun));
  vec3 col = mix(horizon, uZenith, pow(smoothstep(-0.02, 0.6, h), 0.55));
  // Scattering: a tight warm glow around the sun and a broad wash over its
  // whole side of the sky, both strongest when it is low.
  float low = 1.0 - smoothstep(0.0, 0.7, h);
  col += uSunGlow * (pow(sunDot, 4.0) * 0.9 + pow(sunDot, 1.5) * 0.22 * lowSun) * (0.25 + 0.75 * lowSun) * low;
  // Twilight band: once the sun is nearly down, the horizon away from it
  // picks up rose and violet.
  float twilight = smoothstep(-0.3, -0.02, sun.y) * (1.0 - smoothstep(0.0, 0.1, sun.y));
  col += vec3(0.34, 0.15, 0.24) * twilight * (1.0 - smoothstep(0.0, 0.35, h)) * (1.0 - sunDot) * 0.5;
  return col;
}
`;
