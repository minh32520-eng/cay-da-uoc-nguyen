import { describe, expect, it } from 'vitest';
import { makeWish } from '@/test/factories';
import { DEFAULT_FILTER, filterWishes, formatWishDate, getAdjacentWishId } from './filterWishes';

describe('filterWishes (004)', () => {
  it('AC-004-04: mặc định sắp xếp mới nhất lên đầu', () => {
    const a = makeWish({ createdAt: '2026-09-01T00:00:00.000Z' });
    const b = makeWish({ createdAt: '2026-09-03T00:00:00.000Z' });
    expect(filterWishes([a, b], DEFAULT_FILTER).map((w) => w.id)).toEqual([b.id, a.id]);
  });

  it('AC-004-05: tìm không dấu, không phân biệt hoa thường', () => {
    const w = makeWish({ content: 'Đỗ Đại Học Bách Khoa' });
    const other = makeWish({ content: 'Mạnh khoẻ' });
    expect(filterWishes([w, other], { ...DEFAULT_FILTER, query: 'do dai' })).toEqual([w]);
  });

  it('tìm theo tên người ước', () => {
    const w = makeWish({ author: 'Nguyễn Thị Hằng' });
    expect(filterWishes([w, makeWish()], { ...DEFAULT_FILTER, query: 'hang' })).toEqual([w]);
  });

  it('AC-004-06: AND giữa nhóm, OR trong nhóm', () => {
    const A = makeWish({ category: 'study', paperColor: 'red' });
    const B = makeWish({ category: 'study', paperColor: 'yellow' });
    const C = makeWish({ category: 'family', paperColor: 'red' });
    expect(filterWishes([A, B, C], { ...DEFAULT_FILTER, categories: ['study'], paperColors: ['red'] })).toEqual([A]);
    expect(
      filterWishes([A, B, C], { ...DEFAULT_FILTER, categories: ['study', 'family'], paperColors: ['red'], sort: 'oldest' }),
    ).toEqual([A, C]);
  });

  it('AC-004-07: sắp xếp Tên A→Z theo tiếng Việt', () => {
    const binh = makeWish({ author: 'Bình' });
    const an = makeWish({ author: 'An' });
    const dung = makeWish({ author: 'Đức' });
    expect(filterWishes([binh, dung, an], { ...DEFAULT_FILTER, sort: 'author-asc' }).map((w) => w.author)).toEqual([
      'An',
      'Bình',
      'Đức',
    ]);
  });

  it('AC-004-10: không có kết quả → danh sách rỗng', () => {
    expect(filterWishes([makeWish()], { ...DEFAULT_FILTER, query: 'xyzxyz' })).toEqual([]);
  });

  it('lọc theo nguồn "Được chia sẻ"', () => {
    const s = makeWish({ source: 'shared' });
    expect(filterWishes([makeWish(), s], { ...DEFAULT_FILTER, sources: ['shared'] })).toEqual([s]);
  });
});

describe('getAdjacentWishId', () => {
  const list = [makeWish(), makeWish(), makeWish()];
  it('AC-004-03: sau mục cuối là mục đầu (vòng tròn)', () => {
    expect(getAdjacentWishId(list, list[2]!.id, 'next')).toBe(list[0]!.id);
    expect(getAdjacentWishId(list, list[0]!.id, 'prev')).toBe(list[2]!.id);
  });
  it('danh sách rỗng → null', () => {
    expect(getAdjacentWishId([], 'x', 'next')).toBeNull();
  });
});

it('formatWishDate: dd/MM/yyyy', () => {
  expect(formatWishDate(new Date(2026, 8, 5, 12).toISOString())).toBe('05/09/2026');
});
