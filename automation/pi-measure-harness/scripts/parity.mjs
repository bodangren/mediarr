import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentParity, loadAgents, MODEL_MAP, sha256 } from "../lib/core.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotDir = resolve(packageRoot, "agents");
const sourceDir = process.env.OPENCODE_AGENT_DIR ?? resolve(homedir(), ".config/opencode/agent");
const snapshot = loadAgents(snapshotDir);
const parity = agentParity(snapshot);
const sourceNames = readdirSync(sourceDir).filter((name) => name.endsWith(".md")).sort();
const snapshotNames = readdirSync(snapshotDir).filter((name) => name.endsWith(".md")).sort();
const missing = sourceNames.filter((name) => !snapshotNames.includes(name));
const extra = snapshotNames.filter((name) => !sourceNames.includes(name));
const changed = sourceNames.filter((name) => snapshotNames.includes(name) &&
  sha256(readFileSync(resolve(sourceDir, name))) !== sha256(readFileSync(resolve(snapshotDir, name))));
const configuredMap = JSON.parse(readFileSync(resolve(packageRoot, "config/model-map.json"), "utf8"));
const modelMapMatches = JSON.stringify(configuredMap) === JSON.stringify(MODEL_MAP);
const result = {
  ok: parity.ok && missing.length === 0 && extra.length === 0 && changed.length === 0 && modelMapMatches,
  parity,
  sourceDir,
  missing,
  extra,
  changed,
  modelMapMatches,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
