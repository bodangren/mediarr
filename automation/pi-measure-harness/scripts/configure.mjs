import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPiConfiguration, readJson, writeJson } from "../lib/setup.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentDir = resolve(homedir(), ".pi/agent");
const settingsPath = resolve(agentDir, "settings.json");
const modelsPath = resolve(agentDir, "models.json");
const dryRun = process.argv.includes("--dry-run");
const configuration = buildPiConfiguration(readJson(settingsPath), readJson(modelsPath), packageRoot);

if (!dryRun) {
  writeJson(settingsPath, configuration.settings);
  writeJson(modelsPath, configuration.models);
}

console.log(JSON.stringify({
  dryRun,
  settingsPath,
  modelsPath,
  package: packageRoot,
  customProviders: Object.keys(configuration.models.providers ?? {}),
}, null, 2));
