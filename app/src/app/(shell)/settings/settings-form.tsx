'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsSchema, type SettingsFormData } from '@/lib/settings-schema';
import { getApiClients } from '@/lib/api/client';
import { useEffect } from 'react';

function toSettingsUpdatePayload(data: SettingsFormData) {
  return {
    ...data,
    torrentLimits: {
      ...data.torrentLimits,
      globalDownloadLimitKbps: data.torrentLimits.globalDownloadLimitKbps ?? null,
      globalUploadLimitKbps: data.torrentLimits.globalUploadLimitKbps ?? null,
    },
    apiKeys: {
      tmdbApiKey: data.apiKeys.tmdbApiKey ?? null,
      openSubtitlesApiKey: data.apiKeys.openSubtitlesApiKey ?? null,
    },
  };
}

export function SettingsForm() {
  const queryClient = useQueryClient();
  const api = getApiClients().settingsApi;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SettingsFormData) => api.update(toSettingsUpdatePayload(data)),
    onSuccess: (data) => {
        queryClient.setQueryData(['settings'], data);
        alert('Settings saved successfully'); // Simple feedback for now
    },
    onError: (error) => {
        console.error('Failed to save settings', error);
        alert('Failed to save settings');
    }
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      torrentLimits: {
        maxActiveDownloads: 3,
        maxActiveSeeds: 3,
      },
      schedulerIntervals: {
        rssSyncMinutes: 15,
        availabilityCheckMinutes: 30,
        torrentMonitoringSeconds: 5,
      },
      pathVisibility: {
        showDownloadPath: true,
        showMediaPath: true,
      },
      apiKeys: { tmdbApiKey: '', openSubtitlesApiKey: '' }
    }
  });

  useEffect(() => {
    if (settings) {
        form.reset({
            ...settings,
            apiKeys: {
                tmdbApiKey: settings.apiKeys?.tmdbApiKey ?? '',
                openSubtitlesApiKey: settings.apiKeys?.openSubtitlesApiKey ?? ''
            }
        });
    }
  }, [settings, form]);

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
      return <div className="p-6">Loading settings...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto p-6">
      
      {/* General / Torrent Limits */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">General & Torrent Limits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Active Downloads</label>
            <input 
              type="number"
              {...form.register('torrentLimits.maxActiveDownloads')}
              className="w-full p-2 border rounded"
            />
            {form.formState.errors.torrentLimits?.maxActiveDownloads && (
                <p className="text-red-500 text-xs">{form.formState.errors.torrentLimits.maxActiveDownloads.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Active Seeds</label>
            <input 
              type="number"
              {...form.register('torrentLimits.maxActiveSeeds')}
              className="w-full p-2 border rounded"
            />
             {form.formState.errors.torrentLimits?.maxActiveSeeds && (
                <p className="text-red-500 text-xs">{form.formState.errors.torrentLimits.maxActiveSeeds.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">API Keys</h2>
        <div>
            <label htmlFor="tmdbApiKey" className="block text-sm font-medium mb-1">TMDB API Key</label>
            <input 
                id="tmdbApiKey"
                {...form.register('apiKeys.tmdbApiKey')}
                className="w-full p-2 border rounded font-mono text-sm"
                placeholder="Enter your TMDB Read Access Token or API Key"
            />
            <p className="text-xs text-gray-500 mt-1">Required for fetching movie metadata.</p>
        </div>
        <div className="mt-4">
            <label htmlFor="openSubtitlesApiKey" className="block text-sm font-medium mb-1">OpenSubtitles API Key</label>
            <input 
                id="openSubtitlesApiKey"
                {...form.register('apiKeys.openSubtitlesApiKey')}
                className="w-full p-2 border rounded font-mono text-sm"
                placeholder="Enter your OpenSubtitles.com API Key"
            />
            <p className="text-xs text-gray-500 mt-1">Required for searching and downloading subtitles.</p>
        </div>
      </section>

      {/* Indexers Stub */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 opacity-50">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Indexers</h2>
        <p>Indexers are managed in the dedicated Indexers tab.</p>
      </section>

      {/* Download Clients Stub */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 opacity-50">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Download Clients</h2>
        <p>Download client configuration coming soon.</p>
      </section>

       <div className="flex items-center gap-4">
           <button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
           >
             {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
           </button>
           {updateMutation.isSuccess && <span className="text-green-600 text-sm">Saved!</span>}
       </div>
    </form>
  );
}
