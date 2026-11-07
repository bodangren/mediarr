import assert from "node:assert/strict";
import test from "node:test";
import { buildPiConfiguration, migrateCredentials, toPiCredential } from "../lib/setup.mjs";

test("configuration preserves existing values and adds package and Volcengine", () => {
  const result = buildPiConfiguration(
    { theme: "dark", packages: ["npm:existing"] },
    { providers: { local: { baseUrl: "http://localhost" } } },
    "/tmp/pi-measure-harness",
  );
  assert.deepEqual(result.settings.packages, ["npm:existing", "/tmp/pi-measure-harness"]);
  assert.equal(result.settings.theme, "dark");
  assert.ok(result.models.providers.local);
  assert.equal(result.models.providers["minimax-cn"].models[0].id, "MiniMax-M3");
  assert.equal(result.models.providers["vocengine-coding"].models.length, 3);
});

test("OAuth and API key credentials are converted without leaking unrelated fields", () => {
  assert.deepEqual(toPiCredential({ type: "oauth", access: "a", refresh: "r", expires: 123, accountId: "acct" }), {
    type: "oauth", access: "a", refresh: "r", expires: 123, accountId: "acct",
  });
  assert.deepEqual(toPiCredential({ type: "api", key: "secret" }), { type: "api_key", key: "secret" });
});

test("migration maps provider aliases and preserves existing Pi credentials", () => {
  const source = {
    openai: { access: "a", refresh: "r", expires: 123 },
    "minimax-cn-coding-plan": { key: "minimax" },
    xiaomi: { key: "xiaomi" },
  };
  const existing = { xiaomi: { type: "api_key", key: "existing" } };
  const result = migrateCredentials(source, existing);
  assert.equal(result.auth["openai-codex"].type, "oauth");
  assert.equal(result.auth["minimax-cn"].key, "minimax");
  assert.equal(result.auth.xiaomi.key, "existing");
  assert.deepEqual(result.providers, ["openai-codex", "minimax-cn"]);
});

test("Coding Plan credentials take precedence when migration is forced", () => {
  const result = migrateCredentials({
    "minimax-cn": { key: "standard" },
    "minimax-cn-coding-plan": { key: "coding-plan" },
  }, { "minimax-cn": { type: "api_key", key: "existing" } }, true);
  assert.equal(result.auth["minimax-cn"].key, "coding-plan");
  assert.deepEqual(result.providers, ["minimax-cn"]);
});
