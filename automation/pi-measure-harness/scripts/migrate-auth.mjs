import { homedir } from "node:os";
import { resolve } from "node:path";
import { migrateCredentials, readJson, writeJson } from "../lib/setup.mjs";

const sourcePath = process.env.OPENCODE_AUTH_PATH ?? resolve(homedir(), ".local/share/opencode/auth.json");
const targetPath = process.env.PI_AUTH_PATH ?? resolve(homedir(), ".pi/agent/auth.json");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const result = migrateCredentials(readJson(sourcePath), readJson(targetPath), force);

if (!dryRun) writeJson(targetPath, result.auth);

console.log(JSON.stringify({
  dryRun,
  force,
  sourcePath,
  targetPath,
  migratedProviders: result.providers,
  configuredProviders: Object.keys(result.auth).sort(),
}, null, 2));
