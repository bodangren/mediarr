import { HttpResponse, http } from 'msw';
import { sendSuccess } from './helpers';

export function createPlaybackHandlers() {
  return [
    http.get('/api/playback/continue-watching', () => {
      return sendSuccess([
        { mediaType: 'movie', mediaId: 1, title: 'Continue Movie', position: 3600, duration: 7200, lastWatchedAt: new Date().toISOString() },
      ]);
    }),

    http.get('/api/playback/:id', ({ params }) => {
      return sendSuccess({ id: Number(params.id), mediaType: 'movie', mediaId: Number(params.id), sources: [{ url: `/api/stream/${params.id}`, quality: '1080p' }] });
    }),

    http.post('/api/playback/progress', () => {
      return sendSuccess({ saved: true });
    }),

    http.get('/api/playback/subtitles/:trackId', ({ params }) => {
      return sendSuccess({ trackId: params.trackId, language: 'en', url: `/api/stream/subtitles/${params.trackId}.vtt` });
    }),

    http.get('/api/stream/:id', ({ params }) => {
      const data = new TextEncoder().encode(`stream-data-${params.id}`).buffer;
      return HttpResponse.arrayBuffer(data, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
        },
      });
    }),
  ];
}
