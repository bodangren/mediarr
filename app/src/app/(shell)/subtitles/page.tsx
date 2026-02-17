'use client';

import { useQuery } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { WantedCountBadge } from '@/components/subtitles/WantedCountBadge';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  href: string;
}

function StatCard({ title, value, icon, href }: StatCardProps) {
  const IconComponent = (Icons as any)[icon];

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-default hover:bg-surface-2"
    >
      {IconComponent && <IconComponent className="h-6 w-6 text-accent-primary" />}
      <div className="flex-1">
        <p className="text-sm text-text-muted">{title}</p>
        <p className="text-xl font-semibold text-text-primary">{value}</p>
      </div>
      <Icons.ChevronRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

interface QuickLinkProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  badge?: React.ReactNode;
}

function QuickLink({ title, description, icon, href, badge }: QuickLinkProps) {
  const IconComponent = (Icons as any)[icon];

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-default hover:bg-surface-2"
    >
      {IconComponent && <IconComponent className="mt-1 h-5 w-5 text-text-secondary" />}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-text-primary">{title}</h3>
          {badge}
        </div>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <Icons.ChevronRight className="mt-1 h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

export default function SubtitlesPage() {
  const api = getApiClients();

  const { data: wantedCount } = useQuery({
    queryKey: queryKeys.subtitleWantedCount(),
    queryFn: () => api.subtitleWantedApi.getWantedCount(),
    staleTime: 30_000,
  });

  const { data: historyStats } = useQuery({
    queryKey: queryKeys.subtitleHistoryStats({ period: 'month' }),
    queryFn: () => api.subtitleHistoryApi.getHistoryStats({ period: 'month' }),
    staleTime: 60_000,
  });

  // Calculate total downloads from stats
  const totalSubtitlesDownloaded = historyStats?.downloads.reduce(
    (sum, day) => sum + day.series + day.movies,
    0
  ) ?? 0;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Subtitles</h1>
        <p className="text-sm text-text-secondary">
          Manage subtitle downloads, search history, language profiles, and provider settings.
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Wanted Episodes"
          value={wantedCount?.seriesCount ?? 0}
          icon="Search"
          href="/subtitles/wanted/series"
        />
        <StatCard
          title="Wanted Movies"
          value={wantedCount?.moviesCount ?? 0}
          icon="Search"
          href="/subtitles/wanted/movies"
        />
        <StatCard
          title="Total Wanted"
          value={wantedCount?.totalCount ?? 0}
          icon="AlertTriangle"
          href="/subtitles/wanted/series"
        />
        <StatCard
          title="Downloaded"
          value={totalSubtitlesDownloaded.toLocaleString()}
          icon="Download"
          href="/subtitles/history/series"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          title="Series Subtitles"
          description="View and manage subtitles for your TV series"
          icon="Tv"
          href="/subtitles/series"
        />
        <QuickLink
          title="Movies Subtitles"
          description="View and manage subtitles for your movies"
          icon="Film"
          href="/subtitles/movies"
        />
        <QuickLink
          title="Wanted Episodes"
          description="View episodes with missing subtitles"
          icon="Search"
          href="/subtitles/wanted/series"
          badge={<WantedCountBadge />}
        />
        <QuickLink
          title="Wanted Movies"
          description="View movies with missing subtitles"
          icon="Search"
          href="/subtitles/wanted/movies"
          badge={<WantedCountBadge />}
        />
        <QuickLink
          title="History"
          description="View subtitle download history"
          icon="History"
          href="/subtitles/history/series"
        />
        <QuickLink
          title="Blacklist"
          description="Manage blacklisted subtitles"
          icon="Ban"
          href="/subtitles/blacklist/series"
        />
      </div>

      {/* Settings Quick Links */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickLink
            title="Language Profiles"
            description="Configure language preferences and profiles"
            icon="Languages"
            href="/subtitles/profiles"
          />
          <QuickLink
            title="Providers"
            description="Configure subtitle download providers"
            icon="Database"
            href="/subtitles/providers"
          />
          <QuickLink
            title="Settings"
            description="Configure general subtitle settings"
            icon="Settings"
            href="/settings/subtitles"
          />
        </div>
      </div>
    </section>
  );
}
