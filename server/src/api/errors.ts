import type { FastifyReply, FastifyRequest } from 'fastify';
import { mapDomainErrorToHttp } from '../errors/domainErrors';

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
    path?: string;
  };
}

export interface ErrorEnvelopeWithStatus {
  httpStatus: number;
  body: ErrorEnvelope;
}

export function buildErrorEnvelope(
  error: unknown,
  path?: string,
): ErrorEnvelopeWithStatus {
  const mapped = mapDomainErrorToHttp(error, path);

  return {
    httpStatus: mapped.httpStatus,
    body: {
      ok: false,
      error: {
        code: mapped.error.code,
        message: mapped.error.message,
        details: mapped.error.details,
        retryable: mapped.error.retryable,
        path: mapped.error.path,
      },
    },
  };
}

export function sendError(
  reply: FastifyReply,
  error: unknown,
  path?: string,
): FastifyReply {
  const envelope = buildErrorEnvelope(error, path);
  return reply.code(envelope.httpStatus).send(envelope.body);
}

export function registerApiErrorHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  error: any,
): FastifyReply {
  if (error.validation) {
    return reply.code(error.statusCode || 400).send({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation,
        retryable: false,
        path: request.url,
      },
    });
  }

  return sendError(reply, error, request.url);
}
