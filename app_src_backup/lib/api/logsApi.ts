import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

// Log file metadata schema
const logFileSchema = z.object({
  filename: z.string(),
  size: z.number(),
  lastModified: z.string(),
});

// Log file contents schema
const logFileContentsSchema = z.object({
  filename: z.string(),
  contents: z.string(),
  totalLines: z.number(),
});

// Delete file result schema
const deleteFileResultSchema = z.object({
  success: z.boolean(),
  filename: z.string(),
});

// Clear file result schema
const clearFileResultSchema = z.object({
  success: z.boolean(),
  filename: z.string(),
});

// Download file result schema
const downloadFileResultSchema = z.object({
  downloadUrl: z.string(),
  filename: z.string(),
});

// Log level type
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export type LogFile = z.infer<typeof logFileSchema>;
export type LogFileContents = z.infer<typeof logFileContentsSchema>;
export type DeleteFileResult = z.infer<typeof deleteFileResultSchema>;
export type ClearFileResult = z.infer<typeof clearFileResultSchema>;
export type DownloadFileResult = z.infer<typeof downloadFileResultSchema>;

export interface GetFileContentsQuery {
  limit?: number;
}

export function createLogsApi(client: ApiHttpClient) {
  return {
    // List all available log files
    listFiles(): Promise<LogFile[]> {
      return client.request(
        {
          path: routeMap.logsFiles,
        },
        z.array(logFileSchema),
      );
    },

    // Get contents of a specific log file
    getFileContents(filename: string, query: GetFileContentsQuery = {}): Promise<LogFileContents> {
      return client.request(
        {
          path: routeMap.logsFile(filename),
          query,
        },
        logFileContentsSchema,
      );
    },

    // Delete a log file
    deleteFile(filename: string): Promise<DeleteFileResult> {
      return client.request(
        {
          path: routeMap.logsFile(filename),
          method: 'DELETE',
        },
        deleteFileResultSchema,
      );
    },

    // Clear log file contents
    clearFile(filename: string): Promise<ClearFileResult> {
      return client.request(
        {
          path: routeMap.logsFileClear(filename),
          method: 'POST',
        },
        clearFileResultSchema,
      );
    },

    // Get download URL for a log file
    downloadFile(filename: string): Promise<DownloadFileResult> {
      return client.request(
        {
          path: routeMap.logsFileDownload(filename),
        },
        downloadFileResultSchema,
      );
    },
  };
}
