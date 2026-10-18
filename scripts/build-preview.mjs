/**
 * Build a self-contained static preview of Territory for hosts that wrap the
 * page in their own document and reserve `_`-prefixed paths (e.g. a Claude
 * Artifact). Output: preview/ (gitignored).
 *
 *   PREVIEW_EXPORT=1 npx next build && node scripts/build-preview.mjs
 */
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";
const DEST = "preview";
if (!existsSync(OUT)) throw new Error("Run `PREVIEW_EXPORT=1 npx next build` first.");
rmSync(DEST, { recursive: true, force: true });
cpSync(OUT, DEST, { recursive: true });

for (const f of readdirSync(DEST)) {
  if (f.endsWith(".txt") || f.startsWith("404") || f.startsWith("_not-found")) rmSync(join(DEST, f), { recursive: true });
}
// HDR is not a web media type; the scene treats image-based light as optional.
rmSync(join(DEST, "assets/hdri"), { recursive: true, force: true });
rmSync(join(DEST, "assets/CREDITS.md"), { force: true });

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

// `_next/` → `nxs/` everywhere, including the runtime's own chunk lookups.
for (const file of walk(DEST)) {
  if (!/\.(js|css|html)$/.test(file)) continue;
  const src = readFileSync(file, "utf8");
  const out = src.replace(/(?<!_)_next\//g, "nxs/").replace(/�/g, "\\uFFFD");
  if (out !== src) writeFileSync(file, out);
}
renameSync(join(DEST, "_next"), join(DEST, "nxs"));

// The host supplies <html>/<head>/<body>; keep the content and the font classes.
const indexPath = join(DEST, "index.html");
let html = readFileSync(indexPath, "utf8");
const classes = (html.match(/<html[^>]*class="([^"]*)"/) ?? [])[1] ?? "";
html = html
  .replace(/<!DOCTYPE html>/i, "")
  .replace(/<\/?html[^>]*>/g, "")
  .replace(/<\/?head>/g, "")
  .replace(/<\/?body[^>]*>/g, "")
  .replace(/<meta charSet="utf-8"\/>/, "")
  .replace(/<meta name="viewport"[^>]*\/>/, "")
  .replace(/<title>[^<]*<\/title>/, "");
const head =
  `<title>Territory Tree</title>\n<script>document.documentElement.classList.add(${classes
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => JSON.stringify(c))
    .join(",")});document.documentElement.lang="en";</script>\n`;
writeFileSync(indexPath, head + html);
console.log(`preview ready in ${DEST}/`);
