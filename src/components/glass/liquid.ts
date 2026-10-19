/**
 * Liquid glass, after the iOS 26 material.
 *
 * Chromium can run an SVG filter as a backdrop-filter, so each glass surface
 * gets a displacement map generated for its exact size and corner radius:
 * the content behind bends at the rounded edge like light through a thick
 * slab, and lenses magnify what they pass over. Other engines fall back to a
 * frosted surface with the same rim and specular treatment in CSS.
 */

let svgRoot: SVGSVGElement | null = null;
let counter = 0;

export function supportsRefraction() {
  if (typeof window === "undefined" || typeof CSS === "undefined") return false;
  // Chromium-based desktop and Android browsers; iOS browsers are all WebKit.
  return /Chrome\//.test(navigator.userAgent) && CSS.supports("backdrop-filter", "url(#x)");
}

function root() {
  if (svgRoot) return svgRoot;
  const ns = "http://www.w3.org/2000/svg";
  svgRoot = document.createElementNS(ns, "svg");
  svgRoot.setAttribute("aria-hidden", "true");
  svgRoot.setAttribute("width", "0");
  svgRoot.setAttribute("height", "0");
  svgRoot.style.position = "absolute";
  svgRoot.style.pointerEvents = "none";
  svgRoot.appendChild(document.createElementNS(ns, "defs"));
  document.body.appendChild(svgRoot);
  return svgRoot;
}

function roundedRectSdf(x: number, y: number, w: number, h: number, r: number) {
  // Distance inside a rounded rectangle centred at the origin (positive inside).
  const qx = Math.abs(x) - (w / 2 - r);
  const qy = Math.abs(y) - (h / 2 - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  return -outside;
}

/**
 * Displacement map for a slab (edge bevel) or a lens (bevel plus a gentle
 * magnification toward the centre). R/G encode x/y offsets around 0.5.
 */
function displacementMap(w: number, h: number, radius: number, bevel: number, magnify: number) {
  const scale = Math.min(1, 220 / Math.max(w, h));
  const cw = Math.max(8, Math.round(w * scale));
  const ch = Math.max(8, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(cw, ch);
  const r = Math.min(radius, w / 2, h / 2);
  const e = 1;
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const x = (i + 0.5) / scale - w / 2;
      const y = (j + 0.5) / scale - h / 2;
      const d = roundedRectSdf(x, y, w, h, r);
      let dx = 0;
      let dy = 0;
      if (d > 0 && d < bevel) {
        // Outward normal from the SDF gradient; content near the rim is pulled
        // from further inside, like refraction through a curved edge.
        const nx = roundedRectSdf(x + e, y, w, h, r) - roundedRectSdf(x - e, y, w, h, r);
        const ny = roundedRectSdf(x, y + e, w, h, r) - roundedRectSdf(x, y - e, w, h, r);
        const len = Math.hypot(nx, ny) || 1;
        const t = 1 - d / bevel;
        const k = t * t * (3 - 2 * t);
        dx = (nx / len) * k;
        dy = (ny / len) * k;
      }
      if (magnify > 0 && d > 0) {
        // Lens: sample toward the centre, so what lies beneath looks larger.
        dx -= (x / (w / 2)) * magnify;
        dy -= (y / (h / 2)) * magnify;
      }
      const o = (j * cw + i) * 4;
      img.data[o] = Math.round(128 + Math.max(-1, Math.min(1, dx)) * 127);
      img.data[o + 1] = Math.round(128 + Math.max(-1, Math.min(1, dy)) * 127);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export interface GlassFilter {
  id: string;
  update: (w: number, h: number) => void;
  dispose: () => void;
}

/**
 * Create a backdrop filter. `strength` is the maximum displacement in px;
 * `blur` and `saturate` finish the material.
 */
export function createGlassFilter(opts: { radius: number; bevel?: number; strength?: number; blur?: number; saturate?: number; magnify?: number }): GlassFilter {
  const ns = "http://www.w3.org/2000/svg";
  const defs = root().querySelector("defs")!;
  const id = `lg-${++counter}`;
  const filter = document.createElementNS(ns, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("width", "100%");
  filter.setAttribute("height", "100%");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const image = document.createElementNS(ns, "feImage");
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("result", "map");
  const blur = document.createElementNS(ns, "feGaussianBlur");
  blur.setAttribute("in", "SourceGraphic");
  blur.setAttribute("stdDeviation", String(opts.blur ?? 0));
  blur.setAttribute("result", "soft");
  const disp = document.createElementNS(ns, "feDisplacementMap");
  disp.setAttribute("in", "soft");
  disp.setAttribute("in2", "map");
  disp.setAttribute("scale", String(opts.strength ?? 40));
  disp.setAttribute("xChannelSelector", "R");
  disp.setAttribute("yChannelSelector", "G");
  disp.setAttribute("result", "bent");
  const sat = document.createElementNS(ns, "feColorMatrix");
  sat.setAttribute("in", "bent");
  sat.setAttribute("type", "saturate");
  sat.setAttribute("values", String(opts.saturate ?? 1.4));
  filter.append(image, blur, disp, sat);
  defs.appendChild(filter);
  let lastKey = "";
  return {
    id,
    update(w, h) {
      const key = `${Math.round(w)}x${Math.round(h)}`;
      if (key === lastKey || w < 4 || h < 4) return;
      lastKey = key;
      image.setAttribute("width", String(w));
      image.setAttribute("height", String(h));
      image.setAttribute("href", displacementMap(w, h, opts.radius, opts.bevel ?? Math.min(28, opts.radius * 1.4), opts.magnify ?? 0));
    },
    dispose() {
      filter.remove();
    },
  };
}
