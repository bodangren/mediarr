'use client';

import { useMemo } from 'react';
import { PageToolbar, PageToolbarSection } from '@/components/primitives/PageToolbar';
import { Icon } from '@/components/primitives/Icon';
import { MetricCard } from '@/components/primitives/MetricCard';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { Alert } from '@/components/primitives/Alert';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { getApiClients } from '@/lib/api/client';
import { formatBytesFromString, formatUptime, formatRelativeDate } from '@/lib/format';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { HealthCheck } from './HealthCheck';

function SectionHeader({ icon, title }: { icon: Parameters<typeof Icon>[0]['name']; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
      <Icon name={icon} label={`${title} icon`} className="h-5 w-5" />
      {title}
    </h2>
  );
}

export default function Page() {
  const { systemApi } = getApiClients();
  const { data, isLoading, error } = useApiQuery({
    queryKey: queryKeys.systemStatus(),
    queryFn: () => systemApi.getStatus(),
  });

  // Calculate health check counts
  const healthCounts = useMemo(() => {
    if (!data?.health.checks) {
      return { ok: 0, warning: 0, error: 0, unknown: 0 };
    }
    return data.health.checks.reduce(
      (acc, check) => {
        acc[check.status]++;
        return acc;
      },
      { ok: 0, warning: 0, error: 0, unknown: 0 },
    );
  }, [data]);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">System Status</h1>
          <p className="text-sm text-text-secondary">System health, dependencies, and runtime diagnostics.</p>
        </header>
        <div className="flex items-center justify-center py-12 text-text-muted">
          <Icon name="refresh" label="Loading" className="animate-spin" />
          <span className="ml-2">Loading system status...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">System Status</h1>
          <p className="text-sm text-text-secondary">System health, dependencies, and runtime diagnostics.</p>
        </header>
        <Alert variant="danger">
          Failed to load system status: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-6">
      <PageToolbar>
        <PageToolbarSection>
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">System Status</h1>
            <p className="text-sm text-text-secondary">System health, dependencies, and runtime diagnostics.</p>
          </header>
        </PageToolbarSection>
      </PageToolbar>

      {/* Health Status Section */}
      <section className="space-y-4">
        <SectionHeader icon="health" title="Health" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="OK" value={healthCounts.ok.toString()} />
          <MetricCard label="Warnings" value={healthCounts.warning.toString()} />
          <MetricCard label="Errors" value={healthCounts.error.toString()} />
        </div>
        {data.health.checks.length > 0 ? (
          <ul className="overflow-hidden rounded-lg border border-border-subtle bg-surface-1">
            {data.health.checks.map((check, index) => (
              <HealthCheck key={`${check.source}-${check.type}-${index}`} check={check} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">No health checks available.</p>
        )}
      </section>

      {/* System Information Section */}
      <section className="space-y-4">
        <SectionHeader icon="info" title="About" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-primary">Version Information</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Version:</dt>
                <dd className="font-mono text-text-primary">{data.system.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Branch:</dt>
                <dd className="font-mono text-text-primary">{data.system.branch}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Commit:</dt>
                <dd className="font-mono text-text-primary">{data.system.commit.substring(0, 7)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-primary">Runtime Information</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Uptime:</dt>
                <dd className="text-text-primary">{formatUptime(data.system.uptime)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Start Time:</dt>
                <dd className="text-text-primary">{formatRelativeDate(data.system.startTime)}</dd>
              </div>
              {data.system.dotNetVersion && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">.NET Version:</dt>
                  <dd className="font-mono text-text-primary">{data.system.dotNetVersion}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-text-secondary">OS:</dt>
                <dd className="text-text-primary">
                  {data.system.os} {data.system.osVersion && `(${data.system.osVersion})`}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-primary">Database</h3>
            <div className="flex items-center gap-2">
              <Icon name="database" label="Database" className="h-5 w-5 text-text-muted" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{data.database.type}</p>
                <p className="text-xs text-text-secondary">
                  Version {data.database.version} • Migration {data.database.migration}
                </p>
                <p className="text-xs font-mono text-text-muted mt-1">{data.database.location}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-primary">Environment</h3>
            <dl className="space-y-2 text-sm">
              {data.system.isDocker !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Docker:</dt>
                  <dd>
                    <StatusBadge status={data.system.isDocker ? 'completed' : 'error'} />
                  </dd>
                </div>
              )}
              {data.system.isLinux !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Linux:</dt>
                  <dd>
                    <StatusBadge status={data.system.isLinux ? 'completed' : 'error'} />
                  </dd>
                </div>
              )}
              {data.system.isWindows !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Windows:</dt>
                  <dd>
                    <StatusBadge status={data.system.isWindows ? 'completed' : 'error'} />
                  </dd>
                </div>
              )}
              {data.system.isMono !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Mono:</dt>
                  <dd>
                    <StatusBadge status={data.system.isMono ? 'completed' : 'error'} />
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Disk Space Section */}
      <section className="space-y-4">
        <SectionHeader icon="disk" title="Disk Space" />
        {data.diskSpace.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.diskSpace.map(disk => {
              const usedPercentage = ((disk.total - disk.free) / disk.total) * 100;
              return (
                <div key={disk.path} className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
                  <div className="flex items-center gap-2">
                    <Icon name="disk" label="Disk" className="h-5 w-5 text-text-muted" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{disk.label}</p>
                      <p className="text-xs font-mono text-text-muted">{disk.path}</p>
                    </div>
                  </div>
                  <ProgressBar
                    value={usedPercentage}
                    label={`${formatBytesFromString(disk.free)} free of ${formatBytesFromString(disk.total)}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No disk space information available.</p>
        )}
      </section>

      {/* Dependencies Section */}
      <section className="space-y-4">
        <SectionHeader icon="package" title="Dependencies" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Required Dependencies */}
          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-primary">Required Dependencies</h3>
            {data.dependencies.required.length > 0 ? (
              <dl className="space-y-2">
                {data.dependencies.required.map(dep => (
                  <div key={dep.name} className="flex items-center justify-between text-sm">
                    <dt className="text-text-primary">{dep.name}</dt>
                    <div className="flex items-center gap-2">
                      <dd className="font-mono text-text-muted">{dep.version}</dd>
                      <StatusBadge status={dep.status === 'ok' ? 'completed' : 'error'} />
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-text-secondary">No required dependencies listed.</p>
            )}
          </div>

          {/* Optional Dependencies */}
          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
            <h3 className="text-sm font-medium text-text-primary">Optional Dependencies</h3>
            {data.dependencies.optional.length > 0 ? (
              <dl className="space-y-2">
                {data.dependencies.optional.map(dep => (
                  <div key={dep.name} className="flex items-center justify-between text-sm">
                    <dt className="text-text-primary">{dep.name}</dt>
                    <div className="flex items-center gap-2">
                      {dep.version && <dd className="font-mono text-text-muted">{dep.version}</dd>}
                      <StatusBadge status={dep.status === 'ok' ? 'completed' : 'warning'} />
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-text-secondary">No optional dependencies listed.</p>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
