import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRANCH_SLOTS } from '@/scene/branchSlots';
import { makeDraft, makeWish } from '@/test/factories';
import { STORAGE_KEYS } from './constants';
import { pickSlot } from './slotAllocator';
import type { ImportPreview, Wish } from './types';
import { useWishStore } from './wishStore';

const store = () => useWishStore.getState();
const saved = (): { version: number; wishes: Wish[] } =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.wishes) ?? 'null');

function fillTree(count: number): Wish[] {
  const wishes = BRANCH_SLOTS.slice(0, count).map((s) => makeWish({ slotId: s.id }));
  useWishStore.setState({ wishes });
  return wishes;
}

beforeEach(() => {
  vi.restoreAllMocks();
  useWishStore.setState({ wishes: [], hydrated: false, persisted: true, animation: null, falling: [] });
});

describe('003 — treo ước nguyện', () => {
  it('AC-003-01: tạo Wish với UUID hợp lệ, source local, lưu vào localStorage', () => {
    const r = store().hangWish(makeDraft());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.wish.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.wish.source).toBe('local');
    expect(r.wish.createdAt).toBe(r.wish.updatedAt);
    expect(saved().wishes).toHaveLength(1);
  });

  it('AC-003-02: 99 wish → wish mới vào slot trống duy nhất', () => {
    fillTree(99);
    const r = store().hangWish(makeDraft());
    expect(r.ok && r.wish.slotId).toBe(BRANCH_SLOTS[99]!.id);
    const slots = store().wishes.map((w) => w.slotId);
    expect(new Set(slots).size).toBe(100);
  });

  it('AC-003-03: ưu tiên slot tầng thấp', () => {
    const slot = pickSlot(BRANCH_SLOTS, () => 0.5);
    expect(slot?.tier).toBe('low');
    const noLow = BRANCH_SLOTS.filter((s) => s.tier !== 'low');
    expect(pickSlot(noLow, () => 0.5)?.tier).toBe('mid');
  });

  it('AC-003-04: tự chọn cành treo đúng slot; slot đã có → SLOT_TAKEN', () => {
    const r = store().hangWish(makeDraft(), { slotId: 'slot-042' });
    expect(r.ok && r.wish.slotId).toBe('slot-042');
    const again = store().hangWish(makeDraft(), { slotId: 'slot-042' });
    expect(again).toEqual({ ok: false, error: 'SLOT_TAKEN' });
  });

  it('AC-003-06: reload giữ nguyên wish và slot', () => {
    store().hangWish(makeDraft({ content: 'A' }));
    store().hangWish(makeDraft({ content: 'B' }));
    const before = store().wishes;
    useWishStore.setState({ wishes: [] });
    store().hydrate();
    expect(store().wishes.map((w) => [w.id, w.slotId]).sort()).toEqual(before.map((w) => [w.id, w.slotId]).sort());
  });

  it('AC-003-07: bỏ qua bản ghi hỏng, giữ bản hợp lệ, cảnh báo console', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const good = [makeWish({ slotId: 'slot-001' }), makeWish({ slotId: 'slot-002' })];
    const bad = { ...makeWish(), content: undefined };
    localStorage.setItem(STORAGE_KEYS.wishes, JSON.stringify({ version: 1, wishes: [...good, bad] }));
    store().hydrate();
    expect(store().wishes).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('AC-003-08: 2 bản ghi cùng slot → bản sớm hơn giữ slot', () => {
    const early = makeWish({ slotId: 'slot-005', createdAt: '2026-09-01T00:00:00.000Z' });
    const late = makeWish({ slotId: 'slot-005', createdAt: '2026-09-02T00:00:00.000Z' });
    localStorage.setItem(STORAGE_KEYS.wishes, JSON.stringify({ version: 1, wishes: [late, early] }));
    store().hydrate();
    const byId = new Map(store().wishes.map((w) => [w.id, w.slotId]));
    expect(byId.get(early.id)).toBe('slot-005');
    expect(byId.get(late.id)).not.toBe('slot-005');
    expect(byId.get(late.id)).toMatch(/^slot-\d{3}$/);
  });

  it('AC-003-09: cây đầy → TREE_FULL', () => {
    fillTree(100);
    expect(store().hangWish(makeDraft())).toEqual({ ok: false, error: 'TREE_FULL' });
  });

  it('AC-003-12: localStorage đầy → vẫn treo trong phiên, persisted=false', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const r = store().hangWish(makeDraft());
    expect(r.ok && r.persisted).toBe(false);
    expect(store().wishes).toHaveLength(1);
  });

  it('ERR-003-05: JSON hỏng → sao lưu chuỗi gốc, khởi tạo rỗng', () => {
    localStorage.setItem(STORAGE_KEYS.wishes, '{not json');
    store().hydrate();
    expect(store().wishes).toEqual([]);
    expect(store().corruptedOnLoad).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.backup)).toBe('{not json');
  });
});

describe('005 — quản lý ước nguyện', () => {
  it('AC-005-02: sửa giữ id/slotId/createdAt, cập nhật nội dung & updatedAt', () => {
    const [w] = fillTree(1);
    const r = store().updateWish(w!.id, makeDraft({ content: 'Nội dung mới' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ id: w!.id, slotId: w!.slotId, createdAt: w!.createdAt, content: 'Nội dung mới' });
    expect(r.value.updatedAt > w!.updatedAt).toBe(true);
  });

  it('AC-005-03/04: gỡ rồi hoàn tác → trở lại đúng slot cũ', () => {
    const [w] = fillTree(1);
    const removed = store().removeWish(w!.id);
    expect(store().wishes).toHaveLength(0);
    if (!removed.ok) throw new Error('remove failed');
    const restored = store().restoreWish(removed.value);
    expect(restored.ok && restored.value).toEqual({ wish: w, moved: false });
  });

  it('AC-005-05: quá 8 s thì không hoàn tác được', () => {
    const [w] = fillTree(1);
    const removed = store().removeWish(w!.id);
    if (!removed.ok) throw new Error();
    expect(store().restoreWish({ ...removed.value, expiresAt: Date.now() - 1 })).toEqual({ ok: false, error: 'EXPIRED' });
  });

  it('ERR-005-02: hoàn tác khi slot đã bị chiếm → chuyển slot khác', () => {
    const [w] = fillTree(1);
    const removed = store().removeWish(w!.id);
    if (!removed.ok) throw new Error();
    store().hangWish(makeDraft(), { slotId: w!.slotId });
    const r = store().restoreWish(removed.value);
    expect(r.ok && r.value.moved).toBe(true);
    expect(new Set(store().wishes.map((x) => x.slotId)).size).toBe(2);
  });

  const preview = (valid: Wish[]): ImportPreview => ({ valid, duplicateIds: [], invalidCount: 0, overflowCount: 0 });

  it('AC-005-08: gộp — không slot trùng', () => {
    fillTree(2);
    const clash = makeWish({ slotId: BRANCH_SLOTS[0]!.id });
    const r = store().importWishes(preview([clash, makeWish({ slotId: 'slot-050' }), makeWish({ slotId: 'slot-051' })]), 'merge');
    expect(r.ok && r.value.added).toBe(3);
    expect(store().wishes).toHaveLength(5);
    expect(new Set(store().wishes.map((w) => w.slotId)).size).toBe(5);
  });

  it('AC-005-09: thay thế — chỉ còn dữ liệu file, bản cũ được sao lưu', () => {
    fillTree(4);
    const incoming = [makeWish({ slotId: 'slot-070' }), makeWish({ slotId: 'slot-071' })];
    store().importWishes(preview(incoming), 'replace');
    expect(store().wishes.map((w) => w.id).sort()).toEqual(incoming.map((w) => w.id).sort());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.backup)!).wishes).toHaveLength(4);
  });

  it('AC-005-10: gộp vượt 100 → chỉ nhập bản mới nhất cho đủ 100', () => {
    fillTree(95);
    const incoming = Array.from({ length: 10 }, (_, i) =>
      makeWish({ slotId: 'slot-001', createdAt: new Date(Date.UTC(2027, 0, 1, 0, 0, i)).toISOString() }),
    );
    const r = store().importWishes(preview(incoming), 'merge');
    expect(r.ok && r.value).toEqual({ added: 5, skipped: 5 });
    expect(store().wishes).toHaveLength(100);
    const importedIds = new Set(store().wishes.map((w) => w.id));
    expect(incoming.slice(5).every((w) => importedIds.has(w.id))).toBe(true);
  });

  it('AC-005-11: xoá toàn bộ làm trống cây và xoá bản nháp', () => {
    fillTree(3);
    localStorage.setItem(STORAGE_KEYS.draft, '{"content":"x"}');
    store().clearAll();
    expect(store().wishes).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBeNull();
  });

  it('AC-005-13: ghi storage lỗi khi nhập → dữ liệu cũ giữ nguyên', () => {
    const before = fillTree(4);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('fail');
    });
    const r = store().importWishes(preview([makeWish({ slotId: 'slot-090' })]), 'replace');
    expect(r).toEqual({ ok: false, error: 'STORAGE_FAILED' });
    expect(store().wishes).toEqual(before);
  });
});
