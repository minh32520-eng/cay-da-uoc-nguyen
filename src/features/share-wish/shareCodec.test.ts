import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { makeWish } from '@/test/factories';
import {
  buildShareUrl,
  decodeWish,
  encodeWish,
  isDuplicateOf,
  MAX_SHARE_URL_LENGTH,
  parseShareHash,
} from './shareCodec';

const loc = { origin: 'https://cay-da.example', pathname: '/uoc-nguyen/', search: '' };
const encodeRaw = (o: unknown) => compressToEncodedURIComponent(JSON.stringify(o));

describe('shareCodec (006)', () => {
  it('AC-006-01: link dạng …#/w/<payload>', () => {
    const r = buildShareUrl(makeWish(), loc);
    expect(r.ok && r.value).toMatch(/^https:\/\/cay-da\.example\/uoc-nguyen\/#\/w\/.+/);
  });

  it('AC-006-02: round-trip giữ 5 trường, không lộ id/slotId/source', () => {
    const w = makeWish({ content: 'Trăng rằm 🌕 thật tròn', author: 'Hằng', category: 'love', paperColor: 'pink' });
    const payload = encodeWish(w);
    const raw = JSON.parse(decompressFromEncodedURIComponent(payload)!);
    expect(Object.keys(raw).sort()).toEqual(['a', 'c', 'k', 'p', 't', 'v']);
    const r = decodeWish(payload);
    expect(r.ok && r.value).toEqual({
      draft: { content: w.content, author: w.author, category: w.category, paperColor: w.paperColor },
      originalCreatedAt: w.createdAt,
    });
  });

  it('AC-006-10: payload bị cắt cụt → lỗi', () => {
    const payload = encodeWish(makeWish());
    const r = decodeWish(payload.slice(0, Math.floor(payload.length / 2)));
    expect(r.ok).toBe(false);
  });

  it('ERR-006-02: phiên bản lạ → BAD_VERSION', () => {
    expect(decodeWish(encodeRaw({ v: 2, c: 'x', a: 'y', k: 'other', p: 'red', t: new Date().toISOString() }))).toEqual({
      ok: false,
      error: 'BAD_VERSION',
    });
  });

  it('AC-006-11: nội dung HTML được giữ nguyên dạng văn bản', () => {
    const r = decodeWish(
      encodeRaw({ v: 1, c: '<script>alert(1)</script>', a: 'x', k: 'other', p: 'red', t: new Date().toISOString() }),
    );
    expect(r.ok && r.value.draft.content).toBe('<script>alert(1)</script>');
  });

  it('ERR-006-03: nội dung chứa từ cấm → PROFANITY', () => {
    const r = decodeWish(encodeRaw({ v: 1, c: 'đồ óc chó', a: 'x', k: 'other', p: 'red', t: new Date().toISOString() }));
    expect(r).toEqual({ ok: false, error: 'PROFANITY' });
  });

  it('từ chối thuộc tính thừa (strict)', () => {
    const r = decodeWish(encodeRaw({ v: 1, c: 'x', a: 'y', k: 'other', p: 'red', t: new Date().toISOString(), id: 'hack' }));
    expect(r).toEqual({ ok: false, error: 'INVALID' });
  });

  it('AC-006-12: ước nguyện dài nhất vẫn ≤ 2000 ký tự', () => {
    const content = 'Ước ông bà mạnh khoẻ, bố mẹ bình an, em học giỏi 🌕🏮 '.repeat(10);
    const w = makeWish({
      content: Array.from(new Intl.Segmenter().segment(content), (s) => s.segment).slice(0, 200).join(''),
      author: 'Nguyễn Thị Phương Thảo Trần Lê'.slice(0, 30),
    });
    const r = buildShareUrl(w, loc);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.length).toBeLessThanOrEqual(MAX_SHARE_URL_LENGTH);
  });

  it('AC-006-13: payload > 4096 ký tự → TOO_LONG mà không giải nén', () => {
    expect(decodeWish('A'.repeat(5000))).toEqual({ ok: false, error: 'TOO_LONG' });
  });

  it('parseShareHash', () => {
    expect(parseShareHash('#/w/abc')).toBe('abc');
    expect(parseShareHash('#/')).toBeNull();
    expect(parseShareHash('')).toBeNull();
    expect(parseShareHash('#/w/')).toBeNull();
  });

  it('AC-006-08: phát hiện ước nguyện đã có', () => {
    const w = makeWish({ source: 'shared' });
    const r = decodeWish(encodeWish(w));
    if (!r.ok) throw new Error();
    expect(isDuplicateOf(r.value, [w])).toBe(true);
    expect(isDuplicateOf(r.value, [makeWish()])).toBe(false);
  });
});
