import { constants, access, readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

interface FilesystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  readable: boolean;
  writable: boolean;
}

interface FilesystemResponse {
  path: string;
  readable: boolean;
  writable: boolean;
  entries: FilesystemEntry[];
}

async function checkPermission(filePath: string, mode: number): Promise<boolean> {
  try {
    await access(filePath, mode);
    return true;
  } catch {
    return false;
  }
}

export function registerFilesystemRoutes(
  app: FastifyInstance,
  _deps: ApiDependencies,
): void {
  app.get<{
    Querystring: { path?: string };
  }>('/api/filesystem', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const requestedPath = (request.query as { path?: string }).path ?? '/';

    // Resolve the real path (follows symlinks, normalises ..)
    let resolvedPath: string;
    try {
      resolvedPath = await realpath(requestedPath);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT' || nodeErr.code === 'ENOTDIR') {
        return reply.code(404).send({ ok: false, error: `Path not found: ${requestedPath}` });
      }
      throw err;
    }

    // Read directory entries
    let dirEntries: Awaited<ReturnType<typeof readdir>>;
    try {
      dirEntries = await readdir(resolvedPath, { withFileTypes: true });
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOTDIR' || nodeErr.code === 'EACCES') {
        return reply.code(404).send({ ok: false, error: `Cannot read directory: ${resolvedPath}` });
      }
      throw err;
    }

    // Check permissions for the current path itself
    const pathReadable = await checkPermission(resolvedPath, constants.R_OK);
    const pathWritable = await checkPermission(resolvedPath, constants.W_OK);

    // Build entries with permission flags
    const entries: FilesystemEntry[] = await Promise.all(
      dirEntries.map(async (dirent) => {
        const fullPath = join(resolvedPath, dirent.name);
        const readable = await checkPermission(fullPath, constants.R_OK);
        const writable = await checkPermission(fullPath, constants.W_OK);

        return {
          name: dirent.name,
          path: fullPath,
          isDirectory: dirent.isDirectory(),
          readable,
          writable,
        };
      }),
    );

    const response: FilesystemResponse = {
      path: resolvedPath,
      readable: pathReadable,
      writable: pathWritable,
      entries,
    };

    return sendSuccess(reply, response);
  });
}
