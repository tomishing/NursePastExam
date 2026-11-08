// Import: content/ notes + images -> public/data/cards.json and public/images/ (data_format.md).
// Reads CONTENT_DIR (default ./content) and never writes to it. Any error stops the import
// before anything is written, and every problem is listed with its file and line.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CardsFile, Deck } from "../src/types/card.ts";
import { buildCards, type NoteInput } from "./lib/build.ts";
import { figureChoiceCounts } from "./lib/overrides.ts";

const NOTES: { deck: Deck; file: string }[] = [
  { deck: "nurse", file: "questions_answers_nurse.md" },
  { deck: "ph", file: "questions_answers_publichealth.md" },
];
const INFO_FILE = "info.md";
const IMAGE_FOLDERS = ["figures_nurse", "figures_publichealth", "tables_publichealth"];
const OUT_DATA = resolve("public/data");
const OUT_IMAGES = resolve("public/images");

if (existsSync(".env")) process.loadEnvFile(".env");
const contentDir = resolve(process.env.CONTENT_DIR ?? "./content");

function stop(messages: string[]): never {
  console.error(messages.join("\n"));
  process.exit(1);
}

function readContent(file: string): string {
  const path = join(contentDir, file);
  if (!existsSync(path)) stop([`Missing file: ${path}`]);
  return readFileSync(path, "utf8");
}

if (!existsSync(contentDir)) stop([`Content directory not found: ${contentDir}`]);

const notes: NoteInput[] = NOTES.map(({ deck, file }) => ({ deck, file, text: readContent(file) }));
const info = { file: INFO_FILE, text: readContent(INFO_FILE) };

const images = new Map<string, string[]>();
for (const folder of IMAGE_FOLDERS) {
  const dir = join(contentDir, folder);
  if (!existsSync(dir)) stop([`Missing image folder: ${dir}`]);
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || !statSync(join(dir, name)).isFile()) continue;
    images.set(name, [...(images.get(name) ?? []), folder]);
  }
}

const result = buildCards({ notes, info, images, figureChoiceCounts });

for (const warning of result.warnings) console.warn(`warning: ${warning}`);
if (result.errors.length > 0) {
  stop([...result.errors.map((e) => `error: ${e}`), "", `Import failed with ${result.errors.length} error(s). Nothing was written.`]);
}

const output: CardsFile = { generatedAt: new Date().toISOString(), ...result.file };
mkdirSync(OUT_DATA, { recursive: true });
writeFileSync(join(OUT_DATA, "cards.json"), `${JSON.stringify(output, null, 2)}\n`);

// Rebuild the image folder so images removed from the notes disappear too.
rmSync(OUT_IMAGES, { recursive: true, force: true });
mkdirSync(OUT_IMAGES, { recursive: true });
for (const name of result.usedImages) {
  const folder = images.get(name)?.[0];
  if (folder) copyFileSync(join(contentDir, folder, name), join(OUT_IMAGES, name));
}

console.log(`Imported ${output.cards.length} cards and ${result.usedImages.length} images from ${contentDir}`);
for (const [key, count] of Object.entries(output.counts)) console.log(`  ${key}: ${count}`);
