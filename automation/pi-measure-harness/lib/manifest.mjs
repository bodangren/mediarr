// Release manifest loader for the S1 versioned harness foundation.
//
// Contract: measure/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1
//
// `loadManifest(manifestPath, options?)` reads a release manifest JSON,
// validates structural integrity, computes stability hashes against the
// on-disk extension and agent files, and throws structured `drift:...`,
// `schema_version_mismatch`, `missing_reference:...`, or
// `unmapped_model:...` errors on inconsistency.
//
// Output is byte-identical across repeated calls (no time, no random).
// `agentCountLabel` (and any other declared field) is preserved verbatim.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MODEL_MAP, parseAgentFile } from "./core.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = resolve(packageRoot, "extensions/measure-harness/index.ts");
const ZERO_HASH = "0".repeat(64);

/** Returns a stable SHA-256 digest for provenance records. */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/** Returns `true` if the candidate is the all-zero 64-char hex placeholder. */
function isZeroHash(candidate) {
  return typeof candidate === "string" && candidate === ZERO_HASH;
}

/**
 * Validates the structural shape of a release manifest.
 *
 * Throws an error matching `/manifest/` when the manifest is empty or
 * missing required fields. Used both as a standalone validator and as
 * the prelude to `loadManifest`'s hash/reference checks.
 */
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("manifest is required (must be a non-empty object)");
  }
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error("manifest.version is required");
  }
  if (typeof manifest.extensionHash !== "string" || !/^[0-9a-f]{64}$/.test(manifest.extensionHash)) {
    throw new Error("manifest.extensionHash is required (64-char hex)");
  }
  if (!manifest.agentHashes || typeof manifest.agentHashes !== "object" || Array.isArray(manifest.agentHashes)) {
    throw new Error("manifest.agentHashes is required (object)");
  }
  if (!manifest.skillHashes || typeof manifest.skillHashes !== "object" || Array.isArray(manifest.skillHashes)) {
    throw new Error("manifest.skillHashes is required (object)");
  }
  if (typeof manifest.contractHash !== "string" || !/^[0-9a-f]{64}$/.test(manifest.contractHash)) {
    throw new Error("manifest.contractHash is required (64-char hex)");
  }
  if (typeof manifest.markerGrammarVersion !== "string" || manifest.markerGrammarVersion.length === 0) {
    throw new Error("manifest.markerGrammarVersion is required");
  }
  if (!manifest.compatibility || typeof manifest.compatibility !== "object") {
    throw new Error("manifest.compatibility is required (object)");
  }
  return manifest;
}

/**
 * Computes a deterministic array of 64-char hex SHA-256 digests, one per
 * input path. Paths are sorted before hashing so the output is byte-identical
 * regardless of input order. Each entry is a lowercase 64-char hex string.
 */
export function computeStabilityHashes(filePaths) {
  const sorted = [...filePaths].sort();
  return sorted.map((filePath) => sha256(readFileSync(filePath)));
}

/**
 * Loads a release manifest and validates its drift, reference, and
 * schema-version contract.
 *
 * @param {string} manifestPath - absolute path to a release manifest JSON file
 * @param {{grammarVersion?: string}} [options] - optional `grammarVersion` for
 *   the schema-version probe; when present, must equal `manifest.markerGrammarVersion`.
 * @returns {object} the parsed manifest with all declared fields preserved.
 */
export function loadManifest(manifestPath, options = {}) {
  const absoluteManifestPath = resolve(manifestPath);
  const manifestDir = dirname(absoluteManifestPath);
  const agentsDir = resolve(manifestDir, "agents");

  const raw = readFileSync(absoluteManifestPath, "utf8");
  const manifest = validateManifest(JSON.parse(raw));

  if (!isZeroHash(manifest.extensionHash)) {
    if (!existsSync(extensionPath)) {
      throw new Error(`drift:extension:${extensionPath}`);
    }
    const actualExtensionHash = sha256(readFileSync(extensionPath));
    if (actualExtensionHash !== manifest.extensionHash) {
      throw new Error("drift:extension");
    }
  }

  const agentNames = Object.keys(manifest.agentHashes).sort();
  for (const agentName of agentNames) {
    const storedHash = manifest.agentHashes[agentName];
    const agentPath = resolve(agentsDir, `${agentName}.md`);

    if (!existsSync(agentPath)) {
      throw new Error(`missing_reference:${agentName}`);
    }

    const actualHash = sha256(readFileSync(agentPath));
    if (actualHash !== storedHash) {
      throw new Error(`drift:agent:${agentName}.md`);
    }

    let parsed;
    try {
      parsed = parseAgentFile(agentPath);
    } catch (error) {
      throw new Error(`missing_reference:${agentName}:${String(error?.message ?? error)}`);
    }
    if (parsed.sourceModel && !parsed.model) {
      throw new Error(`unmapped_model:${agentName}`);
    }
  }

  if (typeof options.grammarVersion === "string" && options.grammarVersion.length > 0) {
    if (options.grammarVersion !== manifest.markerGrammarVersion) {
      throw new Error("schema_version_mismatch");
    }
  }

  return manifest;
}
