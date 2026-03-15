
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { QueryPanel } from '@/components/ui/query-panel';
import { useToast } from '@/components/providers/ToastProvider';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { getApiClients } from '@/lib/api/client';
import type { ManualSearchCandidate } from '@/lib/api';

interface ManualSearchModalProps {
  isOpen: boolean;
  episodeId?: number;
  movieId?: number;
  onClose: () => void;
}

export function ManualSearchModal({ isOpen, episodeId, movieId, onClose }: ManualSearchModalProps) {
  if (!isOpen) return null;
  return <ManualSearchModalInner isOpen={isOpen} episodeId={episodeId} movieId={movieId} onClose={onClose} />;
}

function ManualSearchModalInner({ isOpen, episodeId, movieId, onClose }: ManualSearchModalProps) {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const searchQuery = useQuery({
    queryKey: ['subtitle-manual-search', movieId ?? episodeId],
    queryFn: () => api.subtitleApi.manualSearch({ movieId, episodeId }),
    enabled: isOpen && (movieId ?? episodeId) !== undefined,
  });

  const downloadMutation = useMutation({
    mutationFn: (candidate: ManualSearchCandidate) =>
      api.subtitleApi.manualDownload({ movieId, episodeId, candidate }),
    onSuccess: () => {
      pushToast({
        title: 'Download Successful',
        message: 'Subtitle file downloaded successfully',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['subtitle-manual-search'] });
      onClose();
    },
    onError: error => {
      pushToast({
        title: 'Download Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'error',
      });
    },
  });

  const columns: DataTableColumn<ManualSearchCandidate>[] = [
    {
      key: 'language',
      header: 'Language',
      render: row => (
        <div className="flex items-center gap-1">
          <span>{row.languageCode}</span>
          {row.isForced && <span className="text-xs text-text-muted">(F)</span>}
          {row.isHi && <span className="text-xs text-text-muted">(HI)</span>}
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: row => row.provider,
    },
    {
      key: 'score',
      header: 'Score',
      render: row => <span className="text-sm text-text-secondary">{row.score}</span>,
    },
    {
      key: 'extension',
      header: 'Format',
      render: row => <span className="text-sm text-text-secondary">{row.extension ?? '-'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: row => (
        <Button
          variant="default"
          onClick={() => downloadMutation.mutate(row)}
          disabled={downloadMutation.isPending}
        >
          {downloadMutation.isPending ? 'Downloading...' : 'Download'}
        </Button>
      ),
    },
  ];

  return (
    <Modal isOpen={isOpen} ariaLabel="Manual Subtitle Search" onClose={onClose} maxWidthClassName="max-w-3xl">
      <ModalHeader title="Manual Subtitle Search" onClose={onClose} />
      <ModalBody>
        <QueryPanel
          isLoading={searchQuery.isLoading}
          isError={searchQuery.isError}
          isEmpty={searchQuery.data?.length === 0}
          onRetry={() => searchQuery.refetch()}
          emptyTitle="No subtitles found"
          emptyBody="No subtitle candidates found. Try adjusting your provider settings."
        >
          <DataTable
            data={searchQuery.data ?? []}
            columns={columns}
            getRowId={row => `${row.provider}-${row.languageCode}-${row.score}`}
          />
        </QueryPanel>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
