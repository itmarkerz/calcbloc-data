#!/usr/bin/env node
/**
 * Prepare the Kaggle upload folder build/kaggle/ (git-ignored): kaggle/dataset-metadata.json plus the top-level
 * dist/ files it describes. Then, with the Kaggle CLI configured:
 *
 *   npm run build && npm run stage:kaggle
 *   kaggle datasets create -p build/kaggle            # first upload (private until you make it public)
 *   kaggle datasets version -p build/kaggle -m "Update 2026.11.11"   # later updates
 */
import fs from "node:fs";
import path from "node:path";
import { KAGGLE_FILES, ROOT } from "./build.mjs";

const dir = path.join(ROOT, "build", "kaggle");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(ROOT, "kaggle", "dataset-metadata.json"), path.join(dir, "dataset-metadata.json"));
for (const f of KAGGLE_FILES) {
  const src = path.join(ROOT, "dist", f);
  if (!fs.existsSync(src)) {
    console.error(`stage-kaggle: ${src} is missing; run npm run build first.`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(dir, f));
}
console.log(`stage-kaggle: ${KAGGLE_FILES.length} files + dataset-metadata.json in ${dir}`);
