import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../server/src/utils/encryption';

describe('Encryption Utility', () => {
  const secretKey = 'my-super-secret-key';
  
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = secretKey;
  });

  it('should encrypt and decrypt text correctly', () => {
    const originalText = 'my-secret-api-key';
    const encrypted = encrypt(originalText);
    
    expect(encrypted).not.toBe(originalText);
    expect(encrypted).toContain(':');
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should throw error if ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
  });

  it('should throw error for invalid encrypted format', () => {
    process.env.ENCRYPTION_KEY = secretKey;
    expect(() => decrypt('invalidformat')).toThrow('Invalid encrypted text format');
  });
});