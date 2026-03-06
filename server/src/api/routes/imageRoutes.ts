import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import type { ApiDependencies } from '../types';

export function registerImageRoutes(
  app: FastifyInstance,
  _deps: ApiDependencies,
): void {
  app.get('/api/images/proxy', {
    schema: {
      querystring: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { url } = request.query as { url: string };

    // Security: Only allow TMDB and TVDB domains
    const allowedDomains = [
      'image.tmdb.org',
      'artworks.thetvdb.com',
      'www.thetvdb.com',
      'thetvdb.com',
    ];

    try {
      const parsedUrl = new URL(url);
      if (!allowedDomains.includes(parsedUrl.hostname)) {
        throw new ValidationError(`Domain ${parsedUrl.hostname} is not allowed for image proxying`);
      }
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError('Invalid URL provided');
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return reply.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      const buffer = await response.arrayBuffer();
      return reply.send(Buffer.from(buffer));
    } catch (error) {
      app.log.error(error, `Failed to proxy image: ${url}`);
      return reply.status(500).send('Internal Server Error while proxying image');
    }
  });
}
