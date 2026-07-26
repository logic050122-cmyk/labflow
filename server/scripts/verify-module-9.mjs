import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

const requiredFiles = [
  "src/config/upload.ts",
  "src/modules/files/files.routes.ts",
  "src/modules/files/files.controller.ts",
  "src/modules/files/files.service.ts",
  "src/modules/files/files.repository.ts",
  "src/modules/files/files.validator.ts",
  "src/modules/files/files.types.ts",
  "src/modules/files/files.storage.ts"
];

for (const relativePath of requiredFiles) {
  assert.equal(existsSync(path.resolve(relativePath)), true, `缺少 ${relativePath}`);
}

const appSource = await readFile(path.resolve("src/app.ts"), "utf8");
assert.match(appSource, /app\.use\("\/api", fileRoutes\)/);

const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
assert.equal(typeof packageJson.dependencies?.multer, "string");
assert.equal(typeof packageJson.devDependencies?.["@types/multer"], "string");

const databaseSource = await readFile(path.resolve("../docs/DATABASE.md"), "utf8");
assert.match(databaseSource, /### 4\.6 files/);

const migrationSource = await readFile(
  path.resolve("migrations/001_initial_schema.sql"),
  "utf8"
);
assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS `files`/);

await rm(path.resolve("uploads"), { recursive: true, force: true });
console.log("模块 9 文件结构与既有数据库契约检查通过");
