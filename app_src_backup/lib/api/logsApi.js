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
export function createLogsApi(client) {
    return {
        // List all available log files
        listFiles() {
            return client.request({
                path: routeMap.logsFiles,
            }, z.array(logFileSchema));
        },
        // Get contents of a specific log file
        getFileContents(filename, query = {}) {
            return client.request({
                path: routeMap.logsFile(filename),
                query,
            }, logFileContentsSchema);
        },
        // Delete a log file
        deleteFile(filename) {
            return client.request({
                path: routeMap.logsFile(filename),
                method: 'DELETE',
            }, deleteFileResultSchema);
        },
        // Clear log file contents
        clearFile(filename) {
            return client.request({
                path: routeMap.logsFileClear(filename),
                method: 'POST',
            }, clearFileResultSchema);
        },
        // Get download URL for a log file
        downloadFile(filename) {
            return client.request({
                path: routeMap.logsFileDownload(filename),
            }, downloadFileResultSchema);
        },
    };
}
//# sourceMappingURL=logsApi.js.map