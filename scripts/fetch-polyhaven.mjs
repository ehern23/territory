/**
 * Download the CC0 Poly Haven textures Territory uses into public/assets.
 * Run: node scripts/fetch-polyhaven.mjs
 *
 * Trees, foliage, grass and flowers are procedural; only surface detail
 * (bark, forest floor) and image-based light come from Poly Haven.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const UA = "Territory/2.0 (CC0 asset fetch; https://github.com/ehern23/territory)";
const ROOT = fileURLToPath(new URL("../public/assets/", import.meta.url));

async function api(id) {
  const r = await fetch(`https://api.polyhaven.com/files/${id}`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${id} ${r.status}`);
  return r.json();
}

async function save(url, dest) {
  await mkdir(dirname(dest), { recursive: true });
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(dest, buf);
  console.log("wrote", dest.replace(ROOT, "public/assets/"), `${(buf.length / 1e6).toFixed(2)}MB`);
}

async function textureMaps(id, destDir, maps, res = "1k") {
  const data = await api(id);
  for (const map of maps) {
    const jpg = data[map]?.[res]?.jpg;
    if (!jpg?.url) throw new Error(`missing ${id} ${map} ${res} jpg`);
    const name = map === "Diffuse" ? "diff" : map === "nor_gl" ? "nor" : map;
    await save(jpg.url, join(destDir, `${name}.jpg`));
  }
}

await textureMaps("forest_leaves_03", join(ROOT, "textures/forest_floor"), ["Diffuse", "nor_gl"]);
await textureMaps("bark_brown_02", join(ROOT, "textures/bark"), ["Diffuse", "nor_gl", "arm"]);

const hdri = await api("noon_grass");
await save(hdri.hdri["1k"].hdr.url, join(ROOT, "hdri/noon_grass_1k.hdr"));

console.log("assets done");
