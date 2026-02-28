import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const filesystemEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  readable: z.boolean(),
  writable: z.boolean(),
});

const filesystemResponseSchema = z.object({
  path: z.string(),
  entries: z.array(filesystemEntrySchema),
});

export type FilesystemEntry = z.infer<typeof filesystemEntrySchema>;
export type FilesystemResponse = z.infer<typeof filesystemResponseSchema>;

export function createFilesystemApi(client: ApiHttpClient) {
  return {
    list(path?: string): Promise<FilesystemResponse> {
      const queryPath = path ?? '/';
      return client.request(
        {
          path: `${routeMap.filesystem}?path=${encodeURIComponent(queryPath)}`,
        },
        filesystemResponseSchema,
      );
    },
  };
}
