export type ActivityEventClassifiedType =
  | 'system' | 'indexer' | 'network' | 'download' | 'import'
  | 'health' | 'update' | 'backup' | 'other';

/**
 * Classifies an activity event from its `eventType`/`sourceModule` discriminator.
 *
 * `ActivityEventRepository` mirrors these exact rules in a SQL CASE expression (indexed-type filtering);
 * keep the two in step when adding a keyword, and extend the repository test accordingly.
 */
export function classifyActivityEventType(event: { eventType: string; sourceModule: string }): ActivityEventClassifiedType {
  const discriminator = `${event.eventType} ${event.sourceModule}`.toLowerCase();
  if (discriminator.includes('indexer') || discriminator.includes('rss') || discriminator.includes('search')) return 'indexer';
  if (discriminator.includes('network') || discriminator.includes('http')) return 'network';
  if (discriminator.includes('download') || discriminator.includes('torrent')) return 'download';
  if (discriminator.includes('import')) return 'import';
  if (discriminator.includes('health')) return 'health';
  if (discriminator.includes('update')) return 'update';
  if (discriminator.includes('backup')) return 'backup';
  if (discriminator.includes('system') || discriminator.includes('scheduler') || discriminator.includes('task')) return 'system';
  return 'other';
}
