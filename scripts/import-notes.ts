// Import script: content/ notes + images -> public/data/cards.json, public/images/.
// Implemented in Phase 2 (see data_format.md). For now it only checks the content directory.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

const contentDir = resolve(process.env.CONTENT_DIR ?? "./content");

if (!existsSync(contentDir)) {
  console.error(`Content directory not found: ${contentDir}`);
  process.exit(1);
}

console.error(`Import is not implemented yet (Phase 2). Content directory: ${contentDir}`);
process.exit(1);
