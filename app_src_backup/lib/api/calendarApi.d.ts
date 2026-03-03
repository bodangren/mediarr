import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import type { CalendarEpisode, CalendarMovie, CalendarListParams } from '../../types/calendar';
declare const calendarEpisodeSchema: z.ZodObject<{
    id: z.ZodNumber;
    seriesId: z.ZodNumber;
    seriesTitle: z.ZodString;
    seasonNumber: z.ZodNumber;
    episodeNumber: z.ZodNumber;
    episodeTitle: z.ZodString;
    airDate: z.ZodString;
    airTime: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["downloaded", "missing", "airing", "unaired"]>;
    hasFile: z.ZodBoolean;
    monitored: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    status: "missing" | "downloaded" | "airing" | "unaired";
    id: number;
    monitored: boolean;
    episodeTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    seriesId: number;
    seriesTitle: string;
    hasFile: boolean;
    airDate: string;
    airTime?: string | undefined;
}, {
    status: "missing" | "downloaded" | "airing" | "unaired";
    id: number;
    monitored: boolean;
    episodeTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    seriesId: number;
    seriesTitle: string;
    hasFile: boolean;
    airDate: string;
    airTime?: string | undefined;
}>;
declare const calendarMovieSchema: z.ZodObject<{
    id: z.ZodNumber;
    movieId: z.ZodNumber;
    title: z.ZodString;
    releaseType: z.ZodEnum<["cinema", "digital", "physical"]>;
    releaseDate: z.ZodString;
    posterUrl: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["downloaded", "monitored", "missing", "unmonitored"]>;
    hasFile: z.ZodBoolean;
    monitored: z.ZodBoolean;
    certification: z.ZodOptional<z.ZodString>;
    runtime: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "monitored" | "missing" | "downloaded" | "unmonitored";
    title: string;
    id: number;
    monitored: boolean;
    movieId: number;
    hasFile: boolean;
    releaseDate: string;
    releaseType: "cinema" | "digital" | "physical";
    posterUrl?: string | undefined;
    certification?: string | undefined;
    runtime?: number | undefined;
}, {
    status: "monitored" | "missing" | "downloaded" | "unmonitored";
    title: string;
    id: number;
    monitored: boolean;
    movieId: number;
    hasFile: boolean;
    releaseDate: string;
    releaseType: "cinema" | "digital" | "physical";
    posterUrl?: string | undefined;
    certification?: string | undefined;
    runtime?: number | undefined;
}>;
export type CalendarEpisodeType = z.infer<typeof calendarEpisodeSchema>;
export type CalendarMovieType = z.infer<typeof calendarMovieSchema>;
export declare function createCalendarApi(client: ApiHttpClient): {
    listCalendarEpisodes(params: CalendarListParams): Promise<CalendarEpisode[]>;
    listCalendarMovies(params: CalendarListParams): Promise<CalendarMovie[]>;
};
export {};
//# sourceMappingURL=calendarApi.d.ts.map