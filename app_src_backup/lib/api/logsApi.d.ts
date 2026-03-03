import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const logFileSchema: z.ZodObject<{
    filename: z.ZodString;
    size: z.ZodNumber;
    lastModified: z.ZodString;
}, "strip", z.ZodTypeAny, {
    size: number;
    filename: string;
    lastModified: string;
}, {
    size: number;
    filename: string;
    lastModified: string;
}>;
declare const logFileContentsSchema: z.ZodObject<{
    filename: z.ZodString;
    contents: z.ZodString;
    totalLines: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename: string;
    contents: string;
    totalLines: number;
}, {
    filename: string;
    contents: string;
    totalLines: number;
}>;
declare const deleteFileResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    filename: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    filename: string;
}, {
    success: boolean;
    filename: string;
}>;
declare const clearFileResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    filename: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    filename: string;
}, {
    success: boolean;
    filename: string;
}>;
declare const downloadFileResultSchema: z.ZodObject<{
    downloadUrl: z.ZodString;
    filename: z.ZodString;
}, "strip", z.ZodTypeAny, {
    downloadUrl: string;
    filename: string;
}, {
    downloadUrl: string;
    filename: string;
}>;
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogFile = z.infer<typeof logFileSchema>;
export type LogFileContents = z.infer<typeof logFileContentsSchema>;
export type DeleteFileResult = z.infer<typeof deleteFileResultSchema>;
export type ClearFileResult = z.infer<typeof clearFileResultSchema>;
export type DownloadFileResult = z.infer<typeof downloadFileResultSchema>;
export interface GetFileContentsQuery {
    limit?: number;
}
export declare function createLogsApi(client: ApiHttpClient): {
    listFiles(): Promise<LogFile[]>;
    getFileContents(filename: string, query?: GetFileContentsQuery): Promise<LogFileContents>;
    deleteFile(filename: string): Promise<DeleteFileResult>;
    clearFile(filename: string): Promise<ClearFileResult>;
    downloadFile(filename: string): Promise<DownloadFileResult>;
};
export {};
//# sourceMappingURL=logsApi.d.ts.map