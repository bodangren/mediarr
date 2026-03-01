import { formatBytes } from '@/lib/format';
import type { DiskSpaceInfo } from '@/lib/api/dashboardApi';

interface DiskSpaceWidgetProps {
  data: DiskSpaceInfo[];
  isLoading: boolean;
}

export function DiskSpaceWidget({ data, isLoading }: DiskSpaceWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h3 className="text-sm font-semibold mb-3">Disk Space</h3>
        <p className="text-xs text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h3 className="text-sm font-semibold mb-3">Disk Space</h3>
        <p className="text-xs text-text-secondary">No root folders configured.</p>
      </div>
    );
  }

  const totalFree = data.reduce((sum, d) => sum + d.free, 0);
  const totalTotal = data.reduce((sum, d) => sum + d.total, 0);
  const totalUsedPercent = totalTotal > 0 ? Math.round(((totalTotal - totalFree) / totalTotal) * 100) : 0;

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <h3 className="text-sm font-semibold mb-3">Disk Space</h3>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-surface-2"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${totalUsedPercent} ${100 - totalUsedPercent}`}
              strokeLinecap="round"
              className={totalUsedPercent > 80 ? 'text-status-error' : totalUsedPercent > 60 ? 'text-status-warning' : 'text-status-completed'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold">{totalUsedPercent}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((disk) => (
          <div key={disk.path} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{disk.label}</span>
              <span className="text-text-secondary">
                {formatBytes(disk.free)} free
              </span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  disk.usedPercent > 80
                    ? 'bg-status-error'
                    : disk.usedPercent > 60
                    ? 'bg-status-warning'
                    : 'bg-status-completed'
                }`}
                style={{ width: `${disk.usedPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-text-secondary truncate">{disk.path}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
