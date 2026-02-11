export function serializeDate(value: Date): string {
  return value.toISOString();
}

export function normalizeEnumValue<T extends string>(value: T): T {
  return value;
}

function serializeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return serializeDate(value);
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeValue(item));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = serializeValue(item);
    }
    return result;
  }

  return value;
}

export function serializeApiPayload<T>(value: T): unknown {
  return serializeValue(value);
}

export function deserializeBigIntFields<T extends Record<string, unknown>>(
  input: T,
  fields: Array<keyof T>,
): T {
  const output: Record<string, unknown> = { ...input };

  for (const field of fields) {
    const rawValue = input[field];
    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      output[String(field)] = BigInt(rawValue);
      continue;
    }

    if (typeof rawValue === 'number' && Number.isInteger(rawValue)) {
      output[String(field)] = BigInt(rawValue);
    }
  }

  return output as T;
}
