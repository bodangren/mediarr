# Prowlarr UI Component Usage (Track 10.4)

This guide documents how the Prowlarr-clone surfaces in `app/src/app/(shell)` are composed, and where to reuse existing primitives instead of creating one-off UI blocks.

## Scope and entry points

- Indexers: `app/src/app/(shell)/indexers/page.tsx`
- Indexer stats: `app/src/app/(shell)/indexers/stats/page.tsx`
- Search: `app/src/app/(shell)/search/page.tsx`
- History: `app/src/app/(shell)/history/page.tsx`
- Settings: `app/src/app/(shell)/settings/indexers/page.tsx`, `app/src/app/(shell)/settings/general/page.tsx`, `app/src/app/(shell)/settings/ui/page.tsx`
- System pages: `app/src/app/(shell)/system/status/page.tsx`, `app/src/app/(shell)/system/tasks/page.tsx`, `app/src/app/(shell)/system/backup/page.tsx`, `app/src/app/(shell)/system/events/page.tsx`, `app/src/app/(shell)/system/logs/files/page.tsx`, `app/src/app/(shell)/system/updates/page.tsx`

## Core page composition pattern

Use this stack for list/detail pages:

1. `useApiQuery` from `app/src/lib/query/useApiQuery.ts` for data fetch and empty-state handling.
2. `QueryPanel` from `app/src/components/primitives/QueryPanel.tsx` for loading/error/empty wrappers.
3. `DataTable` from `app/src/components/primitives/DataTable.tsx` for rows, actions, sorting, and paging.
4. `Modal`/`ConfirmModal` from `app/src/components/primitives/Modal.tsx` for edit/delete/confirm flows.

Minimal example:

```tsx
const query = useApiQuery({
  queryKey: queryKeys.indexers(),
  queryFn: () => api.indexerApi.list(),
  staleTimeKind: 'list',
  isEmpty: rows => rows.length === 0,
});

<QueryPanel
  isLoading={query.isPending}
  isError={query.isError}
  isEmpty={query.isResolvedEmpty}
  errorMessage={query.error?.message}
  onRetry={() => void query.refetch()}
>
  <DataTable data={query.data ?? []} columns={columns} getRowId={row => row.id} />
</QueryPanel>
```

## Reusable primitives used by Prowlarr pages

- Toolbars and section actions: `app/src/components/primitives/PageToolbar.tsx`
- Jump bar filtering for indexers list: `app/src/components/primitives/PageJumpBar.tsx`
- Selection mode and bulk actions: `app/src/components/primitives/SelectProvider.tsx`, `app/src/components/primitives/SelectFooter.tsx`
- Status visuals: `app/src/components/primitives/StatusBadge.tsx`, `app/src/components/primitives/Label.tsx`, `app/src/components/primitives/Alert.tsx`
- Progress/metrics on system pages: `app/src/components/primitives/ProgressBar.tsx`, `app/src/components/primitives/MetricCard.tsx`
- Shell/navigation wrappers: `app/src/components/shell/AppShell.tsx`, `app/src/components/shell/PageLayout.tsx`, `app/src/lib/navigation.ts`

## Feature-specific patterns

### Indexers (`/indexers`)

- Add/edit flows are split into focused components: `app/src/app/(shell)/indexers/AddIndexerModal.tsx` and `app/src/app/(shell)/indexers/EditIndexerModal.tsx`.
- Preset source of truth is `app/src/lib/indexer/indexerPresets.ts`.
- Mutations use either `useMutation` or `useOptimisticMutation` (`app/src/lib/query/useOptimisticMutation.ts`) based on UX needs.

### Search (`/search`)

- Use local form state to build payload and call `releaseApi.searchCandidates`.
- Keep client-side filtering in the page via `FilterBuilder` (`app/src/components/primitives/FilterBuilder.tsx`) to avoid expanding backend query complexity.

### History (`/history`)

- Event filtering and pagination are server-driven through `activityApi.list`.
- Details dialog uses `Modal` with JSON payload rendering from `details`.

### Settings (`/settings/general`, `/settings/ui`)

- General settings form is schema-driven via `react-hook-form` + `zod` (`app/src/lib/settings-schema.ts`).
- Global save shortcut (`Cmd/Ctrl+S`) is wired via `addShortcutSaveListener` in `app/src/lib/shortcuts.ts`.
- UI settings persist locally through `app/src/lib/uiPreferences.ts` and apply CSS variables/classes immediately.

### System pages

- Status/tasks/events/backups/logs/updates all follow the same query-table-modal pattern; reuse their table column style before introducing new visual variants.
- Keep user-facing states explicit (`loading`, `error`, `empty`) through `QueryPanel`.

## Verification commands used for this documentation pass

```bash
CI=true npm run test --workspace=app -- "src/lib/api/systemApi.test.ts" "src/lib/api/backupApi.test.ts" "src/lib/api/logsApi.test.ts" "src/lib/api/updatesApi.test.ts" "src/lib/api/eventsApi.test.ts" "src/lib/events/useEventsCacheBridge.test.tsx"

CI=true npm run test --workspace=app -- "src/app/(shell)/indexers/page.test.tsx" "src/app/(shell)/search/page.test.tsx" "src/app/(shell)/history/page.test.tsx" "src/app/(shell)/settings/general/page.test.tsx" "src/app/(shell)/settings/ui/page.test.tsx" "src/app/(shell)/system/status/page.test.tsx" "src/app/(shell)/system/tasks/page.test.tsx" "src/app/(shell)/system/backup/page.test.tsx" "src/app/(shell)/system/events/page.test.tsx" "src/app/(shell)/system/logs/files/page.test.tsx" "src/app/(shell)/system/updates/page.test.tsx"
```
