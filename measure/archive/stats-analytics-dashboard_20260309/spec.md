# Spec: Library Statistics & Analytics Dashboard

## Problem Statement
Mediarr users have no way to get a high-level view of their library's health and composition. The dashboard widgets provide limited information but there's no dedicated analytics view. Users need answers to questions like: "How much space is my library using?", "What percentage of my content is 4K?", "How many episodes am I missing?", and "How active has my system been this week?"

## Goal
Implement a `/system/stats` page with a dedicated backend endpoint that aggregates library statistics from the Prisma database and presents them in an attractive, scannable format.

## User Stories
- As a user, I want to see how many movies and TV shows/episodes are in my library
- As a user, I want to see storage usage broken down by movies vs TV episodes
- As a user, I want to see quality distribution (4K / 1080p / 720p / SD) for my files
- As a user, I want to see how many monitored items are missing files
- As a user, I want to see system activity counts for the past 7 and 30 days

## API Contract

### `GET /api/system/stats`
Returns aggregated library statistics.

```typescript
interface LibraryStats {
  library: {
    totalMovies: number;
    totalSeries: number;
    totalEpisodes: number;
    monitoredMovies: number;
    monitoredSeries: number;
    monitoredEpisodes: number;
  };
  files: {
    totalFiles: number;
    totalSizeBytes: number;
    movieFiles: number;
    movieSizeBytes: number;
    episodeFiles: number;
    episodeSizeBytes: number;
  };
  quality: {
    movies: QualityBreakdown;
    episodes: QualityBreakdown;
  };
  missing: {
    movies: number;
    episodes: number;
  };
  activity: {
    downloadsThisWeek: number;
    downloadsThisMonth: number;
    searchesThisWeek: number;
    subtitlesThisWeek: number;
  };
}

interface QualityBreakdown {
  uhd4k: number;
  hd1080p: number;
  hd720p: number;
  sd: number;
  unknown: number;
}
```

## Frontend Layout

### Stats Cards (Row 1)
- Total Movies | Total TV Shows | Total Episodes | Total Files

### Storage Card (Row 2)
- Total storage usage with breakdown bar (Movies vs TV)
- Formatted file sizes (GB/TB)

### Quality Distribution (Row 3)
- Two horizontal bar charts side by side: Movies and Episodes
- Color-coded segments: 4K (purple), 1080p (blue), 720p (green), SD (yellow), Unknown (gray)

### Missing Media (Row 4)
- Missing movies count with link to wanted
- Missing episodes count with link to wanted

### Activity (Row 5)
- Downloads this week / this month
- Searches this week
- Subtitles downloaded this week

## Tech Constraints
- Backend: Pure Prisma queries — no external APIs
- Frontend: CSS-only bar charts (no chart library dependencies)
- Tailwind CSS for styling using existing design tokens
- Add to System nav section in navigation.ts
- Add route in App.tsx
- Register new stats route in createApiServer.ts
