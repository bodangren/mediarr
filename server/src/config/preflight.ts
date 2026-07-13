import 'dotenv/config';
import { assertValidEncryptionKey, preparePersistentStorage } from './startup';

async function runPreflight(): Promise<void> {
  assertValidEncryptionKey(process.env.ENCRYPTION_KEY);
  await preparePersistentStorage({
    databaseUrl: process.env.DATABASE_URL ?? 'file:/config/mediarr.db',
    configDir: process.env.CONFIG_DIR,
  });
}

void runPreflight().catch(error => {
  console.error('Mediarr startup preflight failed:', error);
  process.exit(1);
});
