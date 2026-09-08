/**
 * Download selected CC0 Poly Haven assets into public/assets.
 * Run: node scripts/fetch-polyhaven.mjs
 *
 * After download, pack/simplify meshes with gltf-transform and delete the
 * unpacked glTF folders so the browser only serves optimized GLBs.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const UA = "Territory/1.3 (CC0 asset fetch; https://github.com/ehern23/territory)";
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

async function gltfPackage(id, destDir) {
  const data = await api(id);
  const pack = data.gltf?.["1k"]?.gltf;
  if (!pack?.url) throw new Error(`no gltf 1k for ${id}`);
  await save(pack.url, join(destDir, `${id}_1k.gltf`));
  for (const [rel, file] of Object.entries(pack.include || {})) {
    await save(file.url, join(destDir, rel));
  }
}

const forest = join(ROOT, "textures/forest_floor");
const bark = join(ROOT, "textures/bark");
const foliage = join(ROOT, "textures/foliage");

await textureMaps("forest_leaves_03", forest, ["Diffuse", "nor_gl", "arm"]);
await textureMaps("bark_brown_02", bark, ["Diffuse", "nor_gl", "arm"]);

const leaves = await api("tree_small_02");
await save(leaves.gltf["1k"].gltf.include["textures/tree_small_02_leaves_diff_1k.jpg"].url, join(foliage, "leaves_diff.jpg"));
await save(leaves.gltf["1k"].gltf.include["textures/tree_small_02_leaves_nor_gl_1k.jpg"].url, join(foliage, "leaves_nor.jpg"));
await save(leaves.gltf["1k"].gltf.include["textures/tree_small_02_leaves_arm_1k.jpg"].url, join(foliage, "leaves_arm.jpg"));

const hdri = await api("noon_grass");
await save(hdri.hdri["1k"].hdr.url, join(ROOT, "hdri/noon_grass_1k.hdr"));

for (const id of ["fern_02", "grass_medium_01", "rock_moss_set_01", "shrub_02"]) {
  await gltfPackage(id, join(ROOT, "models", id));
}

console.log("small assets done");
