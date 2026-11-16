// Turn cached pictures (image.rgba + meta.json) into PNGs so they can be looked at. usage: node rgba2png.mjs <outDir> <set/name> [<set/name> ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("<REPO>/app/node_modules/sharp");
const [out, ...items] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const find = (set, name) => [path.join(HERE, "cache", set, name), path.join(HERE, "..", "faces", "cache", set, name)].find((d) => fs.existsSync(path.join(d, "image.rgba")));
for (const item of items) {
  const [set, name] = item.split("/");
  const dir = find(set, name);
  if (!dir) { console.log("missing", item); continue; }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  const raw = fs.readFileSync(path.join(dir, "image.rgba"));
  // flatten on white so transparent logos are visible
  await sharp(raw, { raw: { width: meta.width, height: meta.height, channels: 4 } }).flatten({ background: "#ffffff" }).png().toFile(path.join(out, `${set}__${name}.png`));
  console.log(item, meta.width, "x", meta.height);
}
