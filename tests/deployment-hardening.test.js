import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

describe('Docker Engine deployment contract', () => {
  it('uses Docker Engine UID:GID mapping without Podman-only mount or user namespace options', () => {
    const compose = read('docker-compose.yml');

    expect(compose).toContain('user: "${PUID:?Set PUID}:${PGID:?Set PGID}"');
    expect(compose).not.toMatch(/userns_mode|:Z\b|podman/i);
    expect(compose).toContain('network_mode: host');
    expect(compose).toContain('healthcheck:');
  });

  it('runs a checked startup preflight and tracked Drizzle migrations, never a schema push', () => {
    const dockerfile = read('Dockerfile');

    expect(dockerfile).toContain('server/src/config/preflight.ts');
    expect(dockerfile).toContain('scripts/reconcile-migration-compatibility.ts');
    // Migrations run through the project's own runner, not `drizzle-kit migrate`.
    // drizzle-orm applies every pending migration in a single transaction, where
    // SQLite ignores `PRAGMA foreign_keys=OFF` and table rebuilds cascade-delete
    // user rows while still committing successfully. See
    // server/src/db/migrationRunner.ts and migrationDataPreservation.test.ts.
    expect(dockerfile).toContain('scripts/run-migrations.ts');
    expect(dockerfile).not.toMatch(/drizzle-kit\s+(migrate|push)|\|\|\s*(echo|true)/);
    expect(dockerfile.indexOf('server/src/config/preflight.ts')).toBeLessThan(
      dockerfile.indexOf('scripts/run-migrations.ts'),
    );
    expect(dockerfile).toContain('COPY --from=builder /app/scripts ./scripts');
  });

  it('installs all workspaces from the root lockfile before building the SPA', () => {
    const dockerfile = read('Dockerfile');

    expect(dockerfile).toContain('RUN npm ci');
    expect(dockerfile).not.toMatch(/npm install/);
    expect(dockerfile).not.toContain('/app/app/node_modules');
  });

  it('includes every tracked migration in the Drizzle journal', () => {
    const journal = JSON.parse(read('drizzle/meta/_journal.json'));
    const tags = journal.entries.map(entry => entry.tag);

    expect(tags).toContain('0003_workable_sage');
    expect(tags).toContain('0004_scheduler_enabled_state');
    expect(read('drizzle/0003_workable_sage.sql')).toContain('--> statement-breakpoint');
    expect(read('drizzle/0004_scheduler_enabled_state.sql')).toContain('schedulerEnabled');
  });

  it('keeps secrets, bind-mounted state, and generated artifacts out of the image context', () => {
    const dockerignore = read('.dockerignore');

    for (const ignoredPath of ['.env', '.env.*', 'config/', 'data/', '*.db', '*.db-*', 'app/dist/']) {
      expect(dockerignore).toContain(ignoredPath);
    }
  });

  it('fails closed on all configured data roots and has no fictional torrent fallback', () => {
    const main = read('server/src/main.ts');

    for (const setting of [
      'incompleteDirectory',
      'completeDirectory',
      'movieRootFolder',
      'tvRootFolder',
    ]) {
      expect(main).toContain(setting);
    }
    expect(main).not.toContain('Data directory initialization skipped');
    expect(main).not.toMatch(/createFallbackTorrentManager|database-backed torrent manager/);
  });

  it('pins host migration rehearsal to the compose database path', () => {
    const exampleEnvironment = read('.env.example');
    const readme = read('README.md');

    expect(exampleEnvironment).toContain('DATABASE_URL="file:$CONFIG_DIR/mediarr.db"');
    expect(readme).toMatch(/DATABASE_URL="file:\$CONFIG_DIR\/mediarr\.db"\s+npm run migrate/);
  });

  it("keeps Jellyfin compatibility opt-in and documents its LAN-only operating contract", () => {
    const environment = read(".env.example");
    const compose = read("docker-compose.yml");
    const runbook = read("docs/jellyfin-compatibility-runbook.md");

    expect(environment).toContain("JELLYFIN_ENABLED=false");
    expect(environment).toContain("JELLYFIN_PORT=8096");
    expect(compose).toContain("network_mode: host");
    expect(compose).toContain("JELLYFIN_ENABLED:");
    expect(compose).toContain("JELLYFIN_PORT:");

    for (const required of [
      "Who is JellyfinServer?",
      "systemctl --user start thaidub-serve.service",
      "Human-gated TV acceptance",
      "/Videos/{id}/stream",
    ]) {
      expect(runbook).toContain(required);
    }
  });
});
