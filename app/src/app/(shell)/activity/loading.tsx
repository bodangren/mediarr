import { SkeletonBlock } from '@/components/primitives/SkeletonBlock';

export default function ActivityLoading() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-5 w-36" ariaLabel="loading activity heading" />
      <SkeletonBlock className="h-20 w-full" ariaLabel="loading activity rows" />
    </div>
  );
}
