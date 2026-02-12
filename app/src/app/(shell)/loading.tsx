import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';

export default function ShellLoading() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-6 w-56" ariaLabel="loading page heading" />
      <SkeletonBlock className="h-28 w-full" ariaLabel="loading page body" />
    </div>
  );
}
