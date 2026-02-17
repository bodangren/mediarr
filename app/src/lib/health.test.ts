import { describe, expect, it } from 'vitest';
import { healthStatus } from './health';

describe('healthStatus', () => {
  it('should return "completed" when failureCount is 0', () => {
    const result = healthStatus({ health: { failureCount: 0 } });
    expect(result).toBe('completed');
  });

  it('should return "warning" when failureCount is 1', () => {
    const result = healthStatus({ health: { failureCount: 1 } });
    expect(result).toBe('warning');
  });

  it('should return "warning" when failureCount is 2', () => {
    const result = healthStatus({ health: { failureCount: 2 } });
    expect(result).toBe('warning');
  });

  it('should return "error" when failureCount is 3', () => {
    const result = healthStatus({ health: { failureCount: 3 } });
    expect(result).toBe('error');
  });

  it('should return "error" when failureCount is greater than 3', () => {
    const result = healthStatus({ health: { failureCount: 5 } });
    expect(result).toBe('error');
  });

  it('should return "completed" when failureCount is undefined', () => {
    const result = healthStatus({ health: {} });
    expect(result).toBe('completed');
  });

  it('should return "completed" when health is undefined', () => {
    const result = healthStatus({});
    expect(result).toBe('completed');
  });

  it('should return "completed" when health is null', () => {
    const result = healthStatus({ health: null });
    expect(result).toBe('completed');
  });
});
