import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

const execAsync = promisify(exec);

export interface DiskSpaceInfo {
  path: string;
  label: string;
  free: number;
  total: number;
  usedPercent: number;
}

export interface UpcomingItem {
  id: number;
  type: 'episode' | 'movie';
  title: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  date: string;
  status: 'downloaded' | 'missing' | 'airing' | 'unaired';
  hasFile: boolean;
}

export async function getDiskSpaceForPath(path: string): Promise<DiskSpaceInfo | null> {
  if (!path || path.trim() === '') {
    return null;
  }

  try {
    if (process.platform === 'linux' || process.platform === 'darwin') {
      const { stdout } = await execAsync(`df -B1 "${path}" 2>/dev/null | tail -1`);
      const parts = stdout.trim().split(/\s+/);
      
      if (parts.length >= 4) {
        const total = parseInt(parts[1], 10);
        const used = parseInt(parts[2], 10);
        const available = parseInt(parts[3], 10);
        
        if (!Number.isNaN(total) && !Number.isNaN(available)) {
          const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
          return {
            path,
            label: path,
            free: available,
            total,
            usedPercent,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function determineEpisodeStatus(airDateUtc: Date | null | undefined, hasFile: boolean): UpcomingItem['status'] {
  if (hasFile) return 'downloaded';
  if (!airDateUtc) return 'unaired';
  
  const now = new Date();
  if (airDateUtc > now) return 'unaired';
  
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (airDateUtc >= oneDayAgo && airDateUtc <= now) return 'airing';
  
  return 'missing';
}

function determineMovieStatus(releaseDate: Date | null | undefined, hasFile: boolean): UpcomingItem['status'] {
  if (hasFile) return 'downloaded';
  if (!releaseDate) return 'unaired';
  
  const now = new Date();
  if (releaseDate > now) return 'unaired';
  
  return 'missing';
}

export function registerDashboardRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/dashboard/disk-space', async (_request, reply) => {
    if (!deps.settingsService?.get) {
      throw new ValidationError('Settings service is not configured');
    }

    const settings = await deps.settingsService.get();
    const mediaManagement = settings.mediaManagement ?? {};
    
    const paths: Array<{ path: string; label: string }> = [];
    
    if (mediaManagement.movieRootFolder) {
      paths.push({ path: mediaManagement.movieRootFolder, label: 'Movies' });
    }
    if (mediaManagement.tvRootFolder) {
      paths.push({ path: mediaManagement.tvRootFolder, label: 'TV Shows' });
    }

    const diskSpaceResults: DiskSpaceInfo[] = [];
    
    for (const { path, label } of paths) {
      const info = await getDiskSpaceForPath(path);
      if (info) {
        diskSpaceResults.push({
          ...info,
          label,
        });
      }
    }

    return sendSuccess(reply, diskSpaceResults);
  });

  app.get('/api/dashboard/upcoming', async (_request, reply) => {
    const prisma = deps.prisma as any;
    
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingItems: UpcomingItem[] = [];

    if (prisma.episode?.findMany) {
      const episodes = await prisma.episode.findMany({
        where: {
          airDateUtc: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          monitored: true,
        },
        include: {
          series: { select: { id: true, title: true } },
          fileVariants: { select: { id: true } },
        },
        orderBy: { airDateUtc: 'asc' },
        take: 10,
      });

      for (const ep of episodes) {
        const hasFile = ep.fileVariants && ep.fileVariants.length > 0;
        upcomingItems.push({
          id: ep.id,
          type: 'episode',
          title: ep.series?.title ?? 'Unknown Series',
          episodeTitle: ep.title,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          date: ep.airDateUtc ? new Date(ep.airDateUtc).toISOString().split('T')[0] : '',
          status: determineEpisodeStatus(ep.airDateUtc, hasFile),
          hasFile,
        });
      }
    }

    if (prisma.movie?.findMany) {
      const movies = await prisma.movie.findMany({
        where: {
          OR: [
            { digitalRelease: { gte: now, lte: sevenDaysFromNow } },
            { physicalRelease: { gte: now, lte: sevenDaysFromNow } },
          ],
          monitored: true,
        },
        include: {
          fileVariants: { select: { id: true } },
        },
        orderBy: [
          { digitalRelease: 'asc' },
          { physicalRelease: 'asc' },
        ],
        take: 10,
      });

      for (const movie of movies) {
        const hasFile = movie.fileVariants && movie.fileVariants.length > 0;
        const relevantDate = movie.digitalRelease || movie.physicalRelease;
        
        upcomingItems.push({
          id: movie.id,
          type: 'movie',
          title: movie.title,
          date: relevantDate ? new Date(relevantDate).toISOString().split('T')[0] : '',
          status: determineMovieStatus(relevantDate, hasFile),
          hasFile,
        });
      }
    }

    upcomingItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sendSuccess(reply, upcomingItems.slice(0, 10));
  });
}
