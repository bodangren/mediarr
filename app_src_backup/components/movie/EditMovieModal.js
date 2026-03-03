'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@/components/primitives/Modal';
import { Label } from '@/components/primitives/Label';
import { useToast } from '@/components/providers/ToastProvider';
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
export function EditMovieModal({ isOpen, onClose, movie, onSave }) {
    const api = getApiClients();
    const { pushToast } = useToast();
    const { register, handleSubmit, reset, formState: { errors, isSubmitting }, } = useForm({
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
    const onSubmit = async (data) => {
        try {
            const updateData = {
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
        }
        catch (error) {
            pushToast({
                title: 'Failed to update movie',
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                variant: 'error',
            });
        }
    };
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: `Edit ${movie.title}`, onClose: onClose, maxWidthClassName: "max-w-2xl", children: [_jsx(ModalHeader, { title: `Edit ${movie.title}`, onClose: onClose }), _jsx(ModalBody, { children: _jsxs("form", { id: "edit-movie-form", onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "title", children: "Title" }), _jsx("input", { id: "title", type: "text", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none", ...register('title') }), errors.title && (_jsx("p", { className: "mt-1 text-xs text-status-error", children: errors.title.message }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "monitored", children: "Monitored" }), _jsxs("select", { id: "monitored", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none", ...register('monitored', { valueAsNumber: false }), children: [_jsx("option", { value: "true", children: "Yes" }), _jsx("option", { value: "false", children: "No" })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "qualityProfileId", children: "Quality Profile" }), _jsx("input", { id: "qualityProfileId", type: "number", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none", ...register('qualityProfileId', { valueAsNumber: true }) }), errors.qualityProfileId && (_jsx("p", { className: "mt-1 text-xs text-status-error", children: errors.qualityProfileId.message }))] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "path", children: "Path" }), _jsx("input", { id: "path", type: "text", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none", placeholder: "/Movies/Title (Year)", ...register('path') })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "overview", children: "Overview" }), _jsx("textarea", { id: "overview", rows: 3, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none", placeholder: "Movie overview...", ...register('overview') })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "studio", children: "Studio" }), _jsx("input", { id: "studio", type: "text", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none", ...register('studio') })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "certification", children: "Certification" }), _jsx("input", { id: "certification", type: "text", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none", placeholder: "PG-13", ...register('certification') })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "genres", children: "Genres (comma-separated)" }), _jsx("input", { id: "genres", type: "text", className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none", placeholder: "Action, Adventure, Sci-Fi", ...register('genres') })] })] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { variant: "primary", type: "submit", form: "edit-movie-form", disabled: isSubmitting, children: isSubmitting ? 'Saving...' : 'Save' })] })] }));
}
//# sourceMappingURL=EditMovieModal.js.map