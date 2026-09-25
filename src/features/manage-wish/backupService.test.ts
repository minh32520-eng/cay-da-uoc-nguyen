import { describe, expect, it } from 'vitest';
import { WishExportSchema } from '@/entities/wish';
import { makeWish } from '@/test/factories';
import { backupService, exportFileName, MAX_IMPORT_BYTES, parseBackupText } from './backupService';

describe('backupService (005)', () => {
  it('AC-005-06: tên file và nội dung xuất đúng định dạng', () => {
    const now = new Date(2026, 8, 25, 20, 30);
    expect(exportFileName(now)).toBe('cay-da-uoc-nguyen-20260925-2030.json');
    const data = backupService.buildExport([makeWish(), makeWish(), makeWish(), makeWish(), makeWish()], now);
    expect(WishExportSchema.safeParse(data).success).toBe(true);
    expect(data.wishes).toHaveLength(5);
  });

  it('xuất rồi nhập lại cho kết quả giống hệt (round-trip)', () => {
    const wishes = [makeWish(), makeWish({ source: 'shared' })];
    const text = JSON.stringify(backupService.buildExport(wishes));
    const parsed = parseBackupText(text);
    if (!parsed.ok) throw new Error();
    const p = backupService.preview(parsed.value, []);
    expect(p.ok && p.value.valid).toEqual(wishes);
  });

  it('AC-005-07: tóm tắt 3 hợp lệ / 1 trùng / 2 không hợp lệ', () => {
    const existing = makeWish();
    const file = backupService.buildExport([
      makeWish(),
      makeWish(),
      makeWish(),
      existing,
      { ...makeWish(), content: '' },
      { ...makeWish(), id: 'not-a-uuid' },
    ]);
    const p = backupService.preview(file, [existing]);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.value.valid).toHaveLength(3);
    expect(p.value.duplicateIds).toEqual([existing.id]);
    expect(p.value.invalidCount).toBe(2);
  });

  it('ERR-005-06: sai app/version → BAD_FORMAT', () => {
    expect(backupService.preview({ app: 'khac', version: 1, exportedAt: new Date().toISOString(), wishes: [] }, [])).toEqual({
      ok: false,
      error: 'BAD_FORMAT',
    });
    expect(backupService.preview([1, 2, 3], []).ok).toBe(false);
  });

  it('AC-005-12: file không phải JSON → NOT_JSON', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])], 'anh.json');
    expect(await backupService.readFile(png)).toEqual({ ok: false, error: 'NOT_JSON' });
  });

  it('ERR-005-04: file > 1 MB bị từ chối', async () => {
    const big = new File(['x'.repeat(MAX_IMPORT_BYTES + 1)], 'big.json');
    expect(await backupService.readFile(big)).toEqual({ ok: false, error: 'TOO_LARGE' });
  });

  it('AC-005-14: chống prototype pollution & bỏ thuộc tính lạ', () => {
    const w = makeWish();
    const text = `{"app":"cay-da-uoc-nguyen","version":1,"exportedAt":"${new Date().toISOString()}","wishes":[${JSON.stringify(w).slice(0, -1)},"__proto__":{"x":1},"evil":true}]}`;
    const parsed = parseBackupText(text);
    if (!parsed.ok) throw new Error();
    const p = backupService.preview(parsed.value, []);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(p.ok && p.value.valid[0]).toEqual(w);
    expect(p.ok && 'evil' in p.value.valid[0]!).toBe(false);
  });
});
