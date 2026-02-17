/**
 * Custom Format API Routes
 *
 * Manages custom formats for release evaluation and scoring.
 * Custom formats allow users to define rules that match release properties
 * and assign scores for quality profile ranking.
 *
 * @module routes/customFormats
 */
import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';
import type {
  CustomFormatCondition,
  ConditionType,
  ConditionOperator,
  ConditionField,
} from '../../repositories/CustomFormatRepository';
import { CustomFormatScoringEngine } from '../../services/CustomFormatScoringEngine';

/** Valid condition types */
const VALID_CONDITION_TYPES: ConditionType[] = [
  'regex',
  'size',
  'language',
  'indexerFlag',
  'releaseGroup',
  'source',
  'resolution',
  'qualityModifier',
];

/** Valid condition operators */
const VALID_OPERATORS: ConditionOperator[] = [
  'equals',
  'contains',
  'notContains',
  'greaterThan',
  'lessThan',
  'regex',
  'notRegex',
];

/** Valid condition fields */
const VALID_FIELDS: ConditionField[] = [
  'title',
  'size',
  'language',
  'releaseGroup',
  'source',
  'resolution',
];

/**
 * Validate a custom format condition
 */
function validateCondition(condition: unknown, index: number): string | null {
  if (typeof condition !== 'object' || condition === null) {
    return `Condition ${index}: must be an object`;
  }

  const cond = condition as Record<string, unknown>;

  // Validate type
  if (!cond.type || typeof cond.type !== 'string') {
    return `Condition ${index}: 'type' is required and must be a string`;
  }

  if (!VALID_CONDITION_TYPES.includes(cond.type as ConditionType)) {
    return `Condition ${index}: invalid type '${cond.type}'. Valid types: ${VALID_CONDITION_TYPES.join(', ')}`;
  }

  // Validate field if present
  if (cond.field !== undefined) {
    if (typeof cond.field !== 'string' || !VALID_FIELDS.includes(cond.field as ConditionField)) {
      return `Condition ${index}: invalid field '${cond.field}'. Valid fields: ${VALID_FIELDS.join(', ')}`;
    }
  }

  // Validate operator if present
  if (cond.operator !== undefined) {
    if (typeof cond.operator !== 'string' || !VALID_OPERATORS.includes(cond.operator as ConditionOperator)) {
      return `Condition ${index}: invalid operator '${cond.operator}'. Valid operators: ${VALID_OPERATORS.join(', ')}`;
    }
  }

  // Validate value
  if (cond.value === undefined || cond.value === null) {
    return `Condition ${index}: 'value' is required`;
  }

  if (typeof cond.value !== 'string' && typeof cond.value !== 'number') {
    return `Condition ${index}: 'value' must be a string or number`;
  }

  // Validate negate if present
  if (cond.negate !== undefined && typeof cond.negate !== 'boolean') {
    return `Condition ${index}: 'negate' must be a boolean`;
  }

  // Validate required if present
  if (cond.required !== undefined && typeof cond.required !== 'boolean') {
    return `Condition ${index}: 'required' must be a boolean`;
  }

  // Type-specific validation
  if (cond.type === 'size' && typeof cond.value !== 'number') {
    return `Condition ${index}: size condition requires numeric value`;
  }

  if (cond.type === 'resolution' && typeof cond.value !== 'number') {
    return `Condition ${index}: resolution condition requires numeric value`;
  }

  return null;
}

/**
 * Validate custom format conditions array
 */
function validateConditions(conditions: unknown): string | null {
  if (!Array.isArray(conditions)) {
    return "'conditions' must be an array";
  }

  for (let i = 0; i < conditions.length; i++) {
    const error = validateCondition(conditions[i], i);
    if (error) {
      return error;
    }
  }

  return null;
}

/**
 * Validate scores array
 */
function validateScores(scores: unknown): string | null {
  if (!Array.isArray(scores)) {
    return "'scores' must be an array";
  }

  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    if (typeof score !== 'object' || score === null) {
      return `Score ${i}: must be an object`;
    }

    const s = score as Record<string, unknown>;

    if (typeof s.qualityProfileId !== 'number' || !Number.isInteger(s.qualityProfileId)) {
      return `Score ${i}: 'qualityProfileId' must be an integer`;
    }

    if (typeof s.score !== 'number' || !Number.isInteger(s.score)) {
      return `Score ${i}: 'score' must be an integer`;
    }
  }

  return null;
}

export function registerCustomFormatRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/custom-formats - List all custom formats
  app.get('/api/custom-formats', async (_request, reply) => {
    if (!deps.customFormatRepository?.findAll) {
      throw new ValidationError('Custom format repository is not configured');
    }

    const formats = await deps.customFormatRepository.findAll();
    return sendSuccess(reply, formats);
  });

  // GET /api/custom-formats/:id - Get single custom format
  app.get('/api/custom-formats/:id', {
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
    if (!deps.customFormatRepository?.findById) {
      throw new ValidationError('Custom format repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'custom format');
    const format = await deps.customFormatRepository.findById(id);

    if (!format) {
      throw new NotFoundError(`Custom format ${id} not found`);
    }

    return sendSuccess(reply, format);
  });

  // POST /api/custom-formats - Create custom format
  app.post('/api/custom-formats', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'conditions'],
        properties: {
          name: { type: 'string' },
          includeCustomFormatWhenRenaming: { type: 'boolean' },
          conditions: { type: 'array' },
          scores: { type: 'array' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.customFormatRepository?.create || !deps.customFormatRepository?.nameExists) {
      throw new ValidationError('Custom format repository is not configured');
    }

    const payload = request.body as Record<string, unknown>;
    const name = payload.name as string;
    const conditions = payload.conditions;
    const scores = payload.scores;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Name is required and must be a non-empty string');
    }

    // Check name uniqueness
    if (await deps.customFormatRepository.nameExists(name)) {
      throw new ConflictError(`Custom format with name "${name}" already exists`);
    }

    // Validate conditions
    const conditionsError = validateConditions(conditions);
    if (conditionsError) {
      throw new ValidationError(conditionsError);
    }

    // Validate scores if provided
    if (scores !== undefined) {
      const scoresError = validateScores(scores);
      if (scoresError) {
        throw new ValidationError(scoresError);
      }
    }

    const created = await deps.customFormatRepository.create({
      name: name.trim(),
      includeCustomFormatWhenRenaming: (payload.includeCustomFormatWhenRenaming as boolean) ?? false,
      conditions: conditions as CustomFormatCondition[],
      ...(scores !== undefined ? { scores: scores as Array<{ qualityProfileId: number; score: number }> } : {}),
    });

    return sendSuccess(reply, created, 201);
  });

  // PUT /api/custom-formats/:id - Update custom format
  app.put('/api/custom-formats/:id', {
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
          includeCustomFormatWhenRenaming: { type: 'boolean' },
          conditions: { type: 'array' },
          scores: { type: 'array' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.customFormatRepository?.update || !deps.customFormatRepository?.nameExists || !deps.customFormatRepository?.findById) {
      throw new ValidationError('Custom format repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'custom format');
    const payload = request.body as Record<string, unknown>;

    // Check if exists
    const existing = await deps.customFormatRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Custom format ${id} not found`);
    }

    // Check name uniqueness if name is being changed
    const newName = payload.name as string | undefined;
    if (newName && newName !== existing.name) {
      if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
        throw new ValidationError('Name must be a non-empty string');
      }
      if (await deps.customFormatRepository.nameExists(newName, id)) {
        throw new ConflictError(`Custom format with name "${newName}" already exists`);
      }
    }

    // Validate conditions if provided
    if (payload.conditions !== undefined) {
      const conditionsError = validateConditions(payload.conditions);
      if (conditionsError) {
        throw new ValidationError(conditionsError);
      }
    }

    // Validate scores if provided
    if (payload.scores !== undefined) {
      const scoresError = validateScores(payload.scores);
      if (scoresError) {
        throw new ValidationError(scoresError);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (newName !== undefined) {
      updateData.name = newName.trim();
    }
    if (payload.includeCustomFormatWhenRenaming !== undefined) {
      updateData.includeCustomFormatWhenRenaming = payload.includeCustomFormatWhenRenaming;
    }
    if (payload.conditions !== undefined) {
      updateData.conditions = payload.conditions;
    }
    if (payload.scores !== undefined) {
      updateData.scores = payload.scores;
    }

    const updated = await deps.customFormatRepository.update(id, updateData as Parameters<typeof deps.customFormatRepository.update>[1]);

    return sendSuccess(reply, updated);
  });

  // DELETE /api/custom-formats/:id - Delete custom format
  app.delete('/api/custom-formats/:id', {
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
    if (!deps.customFormatRepository?.delete || !deps.customFormatRepository?.exists) {
      throw new ValidationError('Custom format repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'custom format');

    if (!(await deps.customFormatRepository.exists(id))) {
      throw new NotFoundError(`Custom format ${id} not found`);
    }

    const deleted = await deps.customFormatRepository.delete(id);
    return sendSuccess(reply, deleted);
  });

  // POST /api/custom-formats/:id/test - Test a custom format against a sample release
  app.post('/api/custom-formats/:id/test', {
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
        required: ['title'],
        properties: {
          title: { type: 'string' },
          size: { type: 'number' },
          language: { type: 'string' },
          releaseGroup: { type: 'string' },
          source: { type: 'string' },
          resolution: { type: 'number' },
          indexerFlags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.customFormatRepository?.findById) {
      throw new ValidationError('Custom format repository is not configured');
    }

    const id = parseIdParam((request.params as { id: string }).id, 'custom format');
    const format = await deps.customFormatRepository.findById(id);

    if (!format) {
      throw new NotFoundError(`Custom format ${id} not found`);
    }

    const engine = new CustomFormatScoringEngine();

    const payload = request.body as Record<string, unknown>;

    const releaseCandidate = {
      title: payload.title as string,
      size: (payload.size as number) ?? 0,
      indexerId: 0,
      protocol: 'torrent' as const,
      language: payload.language as string | undefined,
      releaseGroup: payload.releaseGroup as string | undefined,
      source: payload.source as string | undefined,
      resolution: payload.resolution as number | undefined,
      indexerFlags: payload.indexerFlags as string[] | undefined,
    };

    const matches = engine.evaluate(releaseCandidate, format);
    const conditionResults = format.conditions.map((condition, index) => {
      // Create a format with just this condition to test
      const singleConditionFormat = { ...format, conditions: [condition] };
      const conditionMatches = engine.evaluate(releaseCandidate, singleConditionFormat);
      return {
        index,
        type: condition.type,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        negate: condition.negate,
        matches: conditionMatches,
      };
    });

    return sendSuccess(reply, {
      formatId: format.id,
      formatName: format.name,
      matches,
      conditionResults,
    });
  });

  // GET /api/custom-formats/schema - Get valid condition types, operators, and fields
  app.get('/api/custom-formats/schema', async (_request, reply) => {
    return sendSuccess(reply, {
      conditionTypes: VALID_CONDITION_TYPES,
      operators: VALID_OPERATORS,
      fields: VALID_FIELDS,
      examples: {
        regex: {
          type: 'regex',
          field: 'title',
          operator: 'contains',
          value: 'HDR10',
          description: 'Match releases containing "HDR10" in the title',
        },
        size: {
          type: 'size',
          operator: 'greaterThan',
          value: 10737418240,
          description: 'Match releases larger than 10GB',
        },
        releaseGroup: {
          type: 'releaseGroup',
          operator: 'equals',
          value: 'RARBG',
          description: 'Match releases from RARBG group',
        },
      },
    });
  });
}
