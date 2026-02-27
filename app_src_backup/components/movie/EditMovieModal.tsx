'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@/components/primitives/Modal';
import { Label } from '@/components/primitives/Label';
import { useToast } from '@/components/providers/ToastProvider';
import type { Movie, UpdateMovieInput } from '@/lib/api/movieApi';
import { getApiClients } from '@/lib/api/client';

const editMovieSchema = z.object({
  monitored: z.boolean(),
  qualityProfileId: z.number().min(1, 'Quality profile is required'),
  path: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  overview: z.string().optional(),
  studio: z.string().optional(),
  certification: z.string().optional(),
  genres: z.array(z.string()).optional(),
});

type EditMovieFormData = z.infer<typeof editMovieSchema>;

export interface EditMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  onSave?: () => void;
}

export function EditMovieModal({ isOpen, onClose, movie, onSave }: EditMovieModalProps) {
  const api = getApiClients();
  const { pushToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditMovieFormData>({
    resolver: zodResolver(editMovieSchema),
    defaultValues: {
      monitored: movie.monitored,
      qualityProfileId: movie.qualityProfileId,
      path: movie.path,
      title: movie.title,
      overview: movie.overview,
      studio: movie.studio,
      certification: movie.certification,
      genres: movie.genres,
    },
  });

  // Reset form when movie changes
  useEffect(() => {
    reset({
      monitored: movie.monitored,
      qualityProfileId: movie.qualityProfileId,
      path: movie.path,
      title: movie.title,
      overview: movie.overview,
      studio: movie.studio,
      certification: movie.certification,
      genres: movie.genres,
    });
  }, [movie, reset]);

  const onSubmit = async (data: EditMovieFormData) => {
    try {
      const updateData: UpdateMovieInput = {
        monitored: data.monitored,
        qualityProfileId: data.qualityProfileId,
        title: data.title,
        overview: data.overview,
        studio: data.studio,
        certification: data.certification,
        genres: data.genres,
      };

      if (data.path && data.path !== movie.path) {
        updateData.path = data.path;
      }

      await api.movieApi.update(movie.id, updateData);

      pushToast({
        title: 'Movie updated',
        message: `"${movie.title}" has been updated successfully.`,
        variant: 'success',
      });

      onSave?.();
      onClose();
    } catch (error) {
      pushToast({
        title: 'Failed to update movie',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel={`Edit ${movie.title}`}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <ModalHeader title={`Edit ${movie.title}`} onClose={onClose} />
      <ModalBody>
        <form id="edit-movie-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <input
              id="title"
              type="text"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              {...register('title')}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-status-error">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monitored">Monitored</Label>
              <select
                id="monitored"
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                {...register('monitored', { valueAsNumber: false })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <Label htmlFor="qualityProfileId">Quality Profile</Label>
              <input
                id="qualityProfileId"
                type="number"
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                {...register('qualityProfileId', { valueAsNumber: true })}
              />
              {errors.qualityProfileId && (
                <p className="mt-1 text-xs text-status-error">{errors.qualityProfileId.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="path">Path</Label>
            <input
              id="path"
              type="text"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              placeholder="/Movies/Title (Year)"
              {...register('path')}
            />
          </div>

          <div>
            <Label htmlFor="overview">Overview</Label>
            <textarea
              id="overview"
              rows={3}
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              placeholder="Movie overview..."
              {...register('overview')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="studio">Studio</Label>
              <input
                id="studio"
                type="text"
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                {...register('studio')}
              />
            </div>

            <div>
              <Label htmlFor="certification">Certification</Label>
              <input
                id="certification"
                type="text"
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                placeholder="PG-13"
                {...register('certification')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="genres">Genres (comma-separated)</Label>
            <input
              id="genres"
              type="text"
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              placeholder="Action, Adventure, Sci-Fi"
              {...register('genres')}
            />
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" form="edit-movie-form" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
