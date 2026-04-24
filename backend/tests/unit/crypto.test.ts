import { encryptApiKey, decryptApiKey } from '../../src/core/crypto.js';

describe('Crypto', () => {
  it('should encrypt and decrypt an API key', () => {
    const key = 'sk-test123456789';
    const encrypted = encryptApiKey(key);

    expect(encrypted).toMatch(/^enc:/);

    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(key);
  });

  it('should return empty string for invalid encrypted data', () => {
    const decrypted = decryptApiKey('enc:invalid_data');
    expect(decrypted).toBe('');
  });

  it('should handle plain: prefix', () => {
    const decrypted = decryptApiKey('plain:mykey');
    expect(decrypted).toBe('mykey');
  });

  it('should return original string for non-encrypted data', () => {
    const key = 'some-random-key';
    const decrypted = decryptApiKey(key);
    expect(decrypted).toBe(key);
  });

  it('should handle empty string', () => {
    expect(encryptApiKey('')).toBe('');
    expect(decryptApiKey('')).toBe('');
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const key = 'sk-test123456789';
    const encrypted1 = encryptApiKey(key);
    const encrypted2 = encryptApiKey(key);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptApiKey(encrypted1)).toBe(key);
    expect(decryptApiKey(encrypted2)).toBe(key);
  });
});
