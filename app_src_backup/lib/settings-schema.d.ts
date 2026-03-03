import { z } from 'zod';
export declare const settingsSchema: z.ZodObject<{
    torrentLimits: z.ZodObject<{
        maxActiveDownloads: z.ZodNumber;
        maxActiveSeeds: z.ZodNumber;
        globalDownloadLimitKbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        globalUploadLimitKbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        maxActiveDownloads: number;
        maxActiveSeeds: number;
        globalDownloadLimitKbps?: number | null | undefined;
        globalUploadLimitKbps?: number | null | undefined;
    }, {
        maxActiveDownloads: number;
        maxActiveSeeds: number;
        globalDownloadLimitKbps?: number | null | undefined;
        globalUploadLimitKbps?: number | null | undefined;
    }>;
    schedulerIntervals: z.ZodObject<{
        rssSyncMinutes: z.ZodNumber;
        availabilityCheckMinutes: z.ZodNumber;
        torrentMonitoringSeconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rssSyncMinutes: number;
        availabilityCheckMinutes: number;
        torrentMonitoringSeconds: number;
    }, {
        rssSyncMinutes: number;
        availabilityCheckMinutes: number;
        torrentMonitoringSeconds: number;
    }>;
    pathVisibility: z.ZodObject<{
        showDownloadPath: z.ZodBoolean;
        showMediaPath: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        showDownloadPath: boolean;
        showMediaPath: boolean;
    }, {
        showDownloadPath: boolean;
        showMediaPath: boolean;
    }>;
    apiKeys: z.ZodObject<{
        tmdbApiKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        openSubtitlesApiKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        openSubtitlesApiKey?: string | null | undefined;
        tmdbApiKey?: string | null | undefined;
    }, {
        openSubtitlesApiKey?: string | null | undefined;
        tmdbApiKey?: string | null | undefined;
    }>;
    host: z.ZodOptional<z.ZodObject<{
        port: z.ZodNumber;
        bindAddress: z.ZodString;
        urlBase: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sslPort: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        enableSsl: z.ZodBoolean;
        sslCertPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sslKeyPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        bindAddress: string;
        enableSsl: boolean;
        urlBase?: string | null | undefined;
        sslPort?: number | null | undefined;
        sslCertPath?: string | null | undefined;
        sslKeyPath?: string | null | undefined;
    }, {
        port: number;
        bindAddress: string;
        enableSsl: boolean;
        urlBase?: string | null | undefined;
        sslPort?: number | null | undefined;
        sslCertPath?: string | null | undefined;
        sslKeyPath?: string | null | undefined;
    }>>;
    security: z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        authenticationMethod: z.ZodEnum<["none", "basic", "form"]>;
        authenticationRequired: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        authenticationMethod: "none" | "form" | "basic";
        authenticationRequired: boolean;
        apiKey?: string | null | undefined;
    }, {
        authenticationMethod: "none" | "form" | "basic";
        authenticationRequired: boolean;
        apiKey?: string | null | undefined;
    }>>;
    logging: z.ZodOptional<z.ZodObject<{
        logLevel: z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>;
        logSizeLimit: z.ZodNumber;
        logRetentionDays: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        logLevel: "info" | "warn" | "error" | "debug" | "trace" | "fatal";
        logSizeLimit: number;
        logRetentionDays: number;
    }, {
        logLevel: "info" | "warn" | "error" | "debug" | "trace" | "fatal";
        logSizeLimit: number;
        logRetentionDays: number;
    }>>;
    update: z.ZodOptional<z.ZodObject<{
        branch: z.ZodEnum<["master", "develop", "phantom"]>;
        autoUpdateEnabled: z.ZodBoolean;
        mechanicsEnabled: z.ZodBoolean;
        updateScriptPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        branch: "master" | "develop" | "phantom";
        autoUpdateEnabled: boolean;
        mechanicsEnabled: boolean;
        updateScriptPath?: string | null | undefined;
    }, {
        branch: "master" | "develop" | "phantom";
        autoUpdateEnabled: boolean;
        mechanicsEnabled: boolean;
        updateScriptPath?: string | null | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    schedulerIntervals: {
        rssSyncMinutes: number;
        availabilityCheckMinutes: number;
        torrentMonitoringSeconds: number;
    };
    torrentLimits: {
        maxActiveDownloads: number;
        maxActiveSeeds: number;
        globalDownloadLimitKbps?: number | null | undefined;
        globalUploadLimitKbps?: number | null | undefined;
    };
    apiKeys: {
        openSubtitlesApiKey?: string | null | undefined;
        tmdbApiKey?: string | null | undefined;
    };
    pathVisibility: {
        showDownloadPath: boolean;
        showMediaPath: boolean;
    };
    security?: {
        authenticationMethod: "none" | "form" | "basic";
        authenticationRequired: boolean;
        apiKey?: string | null | undefined;
    } | undefined;
    host?: {
        port: number;
        bindAddress: string;
        enableSsl: boolean;
        urlBase?: string | null | undefined;
        sslPort?: number | null | undefined;
        sslCertPath?: string | null | undefined;
        sslKeyPath?: string | null | undefined;
    } | undefined;
    logging?: {
        logLevel: "info" | "warn" | "error" | "debug" | "trace" | "fatal";
        logSizeLimit: number;
        logRetentionDays: number;
    } | undefined;
    update?: {
        branch: "master" | "develop" | "phantom";
        autoUpdateEnabled: boolean;
        mechanicsEnabled: boolean;
        updateScriptPath?: string | null | undefined;
    } | undefined;
}, {
    schedulerIntervals: {
        rssSyncMinutes: number;
        availabilityCheckMinutes: number;
        torrentMonitoringSeconds: number;
    };
    torrentLimits: {
        maxActiveDownloads: number;
        maxActiveSeeds: number;
        globalDownloadLimitKbps?: number | null | undefined;
        globalUploadLimitKbps?: number | null | undefined;
    };
    apiKeys: {
        openSubtitlesApiKey?: string | null | undefined;
        tmdbApiKey?: string | null | undefined;
    };
    pathVisibility: {
        showDownloadPath: boolean;
        showMediaPath: boolean;
    };
    security?: {
        authenticationMethod: "none" | "form" | "basic";
        authenticationRequired: boolean;
        apiKey?: string | null | undefined;
    } | undefined;
    host?: {
        port: number;
        bindAddress: string;
        enableSsl: boolean;
        urlBase?: string | null | undefined;
        sslPort?: number | null | undefined;
        sslCertPath?: string | null | undefined;
        sslKeyPath?: string | null | undefined;
    } | undefined;
    logging?: {
        logLevel: "info" | "warn" | "error" | "debug" | "trace" | "fatal";
        logSizeLimit: number;
        logRetentionDays: number;
    } | undefined;
    update?: {
        branch: "master" | "develop" | "phantom";
        autoUpdateEnabled: boolean;
        mechanicsEnabled: boolean;
        updateScriptPath?: string | null | undefined;
    } | undefined;
}>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
//# sourceMappingURL=settings-schema.d.ts.map