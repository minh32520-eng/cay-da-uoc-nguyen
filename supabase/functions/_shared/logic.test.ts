import { describe, expect, it } from 'vitest';
import clientWords from '../../../src/entities/wish/profanity-vi.json';
import { clientIp, corsHeaders, hmacSha256Hex, sha256Hex, validateWishInput } from './logic';
import { PROFANITY_WORDS } from './profanity';

const valid = { content: 'Cả nhà bình an', author: 'Lan', category: 'family', paperColor: 'red', ownerToken: 'a'.repeat(43) };

describe('Edge Function — logic thuần (007)', () => {
  it('AC-007-08: băm IP bằng HMAC-SHA256, không lộ IP gốc, salt khác → băm khác', async () => {
    const ip = clientIp(new Headers({ 'cf-connecting-ip': '1.2.3.4' }));
    expect(ip).toBe('1.2.3.4');
    const a = await hmacSha256Hex('salt-1', ip!);
    const b = await hmacSha256Hex('salt-2', ip!);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('1.2.3.4');
    expect(a).not.toBe(b);
    expect(await hmacSha256Hex('salt-1', ip!)).toBe(a);
  });

  it('AC-007-09: lấy IP đầu tiên trong x-forwarded-for; ưu tiên cf-connecting-ip, x-real-ip', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '5.6.7.8' }))).toBe('9.9.9.9');
    expect(clientIp(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '9.9.9.9' }))).toBe('1.1.1.1');
    expect(clientIp(new Headers())).toBeNull(); // ERR-007-09
  });

  it('sha256Hex dùng để băm owner token', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('AC-007-10: validate giống client', () => {
    const ok = validateWishInput({ ...valid, author: '  ' });
    expect(ok.ok && ok.data.author).toBe('Ẩn danh');
    expect(validateWishInput({ ...valid, content: '   ' })).toEqual({ ok: false, error: 'VALIDATION' });
    expect(validateWishInput({ ...valid, content: 'a'.repeat(201) })).toEqual({ ok: false, error: 'VALIDATION' });
    expect(validateWishInput({ ...valid, content: '🌕'.repeat(200) }).ok).toBe(true);
    expect(validateWishInput({ ...valid, content: 'đồ óc chó' })).toEqual({ ok: false, error: 'PROFANITY' });
    expect(validateWishInput({ ...valid, paperColor: 'black' })).toEqual({ ok: false, error: 'VALIDATION' });
    expect(validateWishInput({ ...valid, ownerToken: 'short' })).toEqual({ ok: false, error: 'VALIDATION' });
    expect(validateWishInput(null)).toEqual({ ok: false, error: 'VALIDATION' });
  });

  it('AC-007-11: danh sách từ cấm của server giống hệt client', () => {
    expect([...PROFANITY_WORDS]).toEqual(clientWords);
  });

  it('AC-007-17: CORS chỉ cho origin được phép', () => {
    const allowed = ['https://minh32520-eng.github.io', 'http://localhost:5173'];
    expect(corsHeaders('https://minh32520-eng.github.io', allowed)['Access-Control-Allow-Origin']).toBe(
      'https://minh32520-eng.github.io',
    );
    expect(corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Origin']).toBeUndefined();
    expect(corsHeaders(null, allowed)['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
