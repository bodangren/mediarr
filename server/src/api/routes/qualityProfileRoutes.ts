/**
 * Quality Profile API Routes
 *
 * Manages quality profiles that define acceptable video qualities for downloads.
 * Quality profiles contain a list of allowed qualities and a cutoff quality.
 *
 * @module routes/qualityProfiles
 */
import type { FastifyInstance } from 'fastify';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';
import { getQualityDefinitions, getQualityById } from '../../seeds/qualities';
import type { QualityProfileItem } from '../../repositories/QualityProfileRepository';

/**
 * Validates that quality profile items are properly formatted
 * @param items - Unknown items array to validate
 * @returns Validated QualityProfileItem array
 * @throws ValidationError if items are invalid
 */
function validateQualityItems(items: unknown): QualityProfileItem[] {
  if (!Array.isArray(items)) {
    throw new ValidationError('items must be an array');
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new ValidationError('each item must be an object');
    }
    if (!item.quality || typeof item.quality !== 'object') {
      throw new ValidationError('each item must have a quality object');
    }
    if (typeof item.quality.id !== 'number') {
      throw new ValidationError('quality.id must be a number');
    }
    if (typeof item.allowed !== 'boolean') {
      throw new ValidationError('item.allowed must be a boolean');
    }
  }

  return items as QualityProfileItem[];
}

function validateCutoff(cutoff: unknown, items: QualityProfileItem[]): number {
  if (typeof cutoff !== 'number') {
    throw new ValidationError('cutoff must be a number');
  }

  const allowedQualityIds = items.filter(i => i.allowed).map(i => i.quality.id);
  if (!allowedQualityIds.includes(cutoff)) {
    throw new ValidationError(
      'cutoff must be one of the allowed qualities',
      { cutoff, allowedQualityIds }
    );
  }

  return cutoff;
}

function validateAtLeastOneAllowed(items: QualityProfileItem[]): void {
  const hasAllowed = items.some(item => item.allowed);
  if (!hasAllowed) {
    throw new ValidationError('at least one quality must be allowed');
  }
}

function enrichItemsWithQualityData(items: QualityProfileItem[]): QualityProfileItem[] {
  return items.map(item => {
    const qualityDef = getQualityById(item.quality.id);
    if (!qualityDef) {
      throw new ValidationError(`invalid quality id: ${item.quality.id}`);
    }
    return {
      quality: {
        id: qualityDef.id,
        name: qualityDef.name,
        source: qualityDef.source,
        resolution: qualityDef.resolution,
      },
      allowed: item.allowed,
    };
  });
}

export function registerQualityProfileRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/quality-profiles - List all quality profiles
  app.get('/api/quality-profiles', async (_request, reply) => {
    if (!deps.qualityProfileRepository?.findAll) {
      throw new ValidationError('Quality profile repository is not configured');
    }

    const profiles = await deps.qualityProfileRepository.findAll();
    return sendSuccess(reply, profiles);
  });

  // GET /api/quality-profiles/:id - Get single quality profile
  app.get('/api/quality-profiles/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.qualityProfileRepository?.findById) {
      throw new ValidationError('Quality profile repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'quality profile');
    const profile = await deps.qualityProfileRepository.findById(id);

    if (!profile) {
      throw new NotFoundError(`Quality profile ${id} not found`);
    }

    return sendSuccess(reply, profile);
  });

  // GET /api/quality-definitions - Get all quality definitions
  app.get('/api/quality-definitions', async (_request, reply) => {
    const definitions = getQualityDefinitions();
    return sendSuccess(reply, definitions);
  });

  // POST /api/quality-profiles - Create new quality profile
  app.post('/api/quality-profiles', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'cutoff', 'items'],
        properties: {
          name: { type: 'string' },
          cutoff: { type: 'number' },
          items: { type: 'array' },
          languageProfileId: { type: ['number', 'null'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.qualityProfileRepository?.create || !deps.qualityProfileRepository?.findByName) {
      throw new ValidationError('Quality profile repository is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const name = payload.name;

    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('name is required and must be a non-empty string');
    }

    // Check for duplicate name
    const existing = await deps.qualityProfileRepository.findByName(name);
    if (existing) {
      throw new ConflictError(`Quality profile with name "${name}" already exists`);
    }

    // Validate and enrich items
    const items = validateQualityItems(payload.items);
    validateAtLeastOneAllowed(items);
    const enrichedItems = enrichItemsWithQualityData(items);

    // Validate cutoff
    const cutoff = validateCutoff(payload.cutoff, enrichedItems);

    const created = await deps.qualityProfileRepository.create({
      name: name.trim(),
      cutoff,
      items: enrichedItems,
      languageProfileId: payload.languageProfileId as number | null | undefined,
    });

    return sendSuccess(reply, created, 201);
  });

  // PUT /api/quality-profiles/:id - Update quality profile
  app.put('/api/quality-profiles/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          cutoff: { type: 'number' },
          items: { type: 'array' },
          languageProfileId: { type: ['number', 'null'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.qualityProfileRepository?.update || !deps.qualityProfileRepository?.findById || !deps.qualityProfileRepository?.findByName) {
      throw new ValidationError('Quality profile repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'quality profile');
    const payload = request.body as Record<string, unknown>;

    // Check if profile exists
    const existing = await deps.qualityProfileRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Quality profile ${id} not found`);
    }

    // Validate name if provided
    let name = existing.name;
    if (payload.name !== undefined) {
      if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
        throw new ValidationError('name must be a non-empty string');
      }
      name = payload.name.trim();
      
      // Check for duplicate name (if name changed)
      if (name !== existing.name) {
        const duplicate = await deps.qualityProfileRepository.findByName(name);
        if (duplicate) {
          throw new ConflictError(`Quality profile with name "${name}" already exists`);
        }
      }
    }

    // Validate and process items if provided
    let items = existing.items;
    if (payload.items !== undefined) {
      items = validateQualityItems(payload.items);
      validateAtLeastOneAllowed(items);
      items = enrichItemsWithQualityData(items);
    }

    // Validate cutoff if provided
    let cutoff = existing.cutoff;
    if (payload.cutoff !== undefined) {
      cutoff = validateCutoff(payload.cutoff, items);
    } else if (payload.items !== undefined) {
      // If items changed but cutoff didn't, re-validate cutoff against new items
      try {
        validateCutoff(existing.cutoff, items);
      } catch {
        throw new ValidationError(
          'cutoff is no longer valid after items update; please provide a new cutoff',
          { currentCutoff: existing.cutoff }
        );
      }
    }

    const updated = await deps.qualityProfileRepository.update(id, {
      name,
      cutoff,
      items,
      languageProfileId: payload.languageProfileId as number | null | undefined,
    });

    return sendSuccess(reply, updated);
  });

  // DELETE /api/quality-profiles/:id - Delete quality profile
  app.delete('/api/quality-profiles/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.qualityProfileRepository?.delete || !deps.qualityProfileRepository?.findById || !deps.qualityProfileRepository?.isInUse) {
      throw new ValidationError('Quality profile repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'quality profile');

    // Check if profile exists
    const existing = await deps.qualityProfileRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Quality profile ${id} not found`);
    }

    // Check if profile is in use
    const inUse = await deps.qualityProfileRepository.isInUse(id);
    if (inUse) {
      throw new ConflictError(
        `Cannot delete quality profile "${existing.name}" because it is in use by media items`,
        { profileId: id, profileName: existing.name }
      );
    }

    const deleted = await deps.qualityProfileRepository.delete(id);
    return sendSuccess(reply, deleted);
  });
}
