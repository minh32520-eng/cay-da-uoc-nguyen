import {
  MAX_WISHES,
  parseWishList,
  wishRepository,
  WishExportSchema,
  type ImportPreview,
  type Result,
  type Wish,
  type WishExportV1,
} from '@/entities/wish';

export const MAX_IMPORT_BYTES = 1024 * 1024; // FR-005-14

const pad = (n: number) => String(n).padStart(2, '0');

export function exportFileName(now: Date = new Date()): string {
  return `cay-da-uoc-nguyen-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

/** Loại bỏ khoá nguy hiểm khi parse (NFR-005-03). */
function safeReviver(key: string, value: unknown): unknown {
  return key === '__proto__' || key === 'constructor' || key === 'prototype' ? undefined : value;
}

export function parseBackupText(text: string): Result<unknown, 'NOT_JSON'> {
  try {
    return { ok: true, value: JSON.parse(text, safeReviver) as unknown };
  } catch {
    return { ok: false, error: 'NOT_JSON' };
  }
}

export const backupService = {
  buildExport(wishes: Wish[], now: Date = new Date()): WishExportV1 {
    return { app: 'cay-da-uoc-nguyen', version: 1, exportedAt: now.toISOString(), wishes };
  },

  /** Tải file sao lưu xuống máy (FR-005-07). */
  exportToFile(wishes: Wish[], now: Date = new Date()): void {
    const blob = new Blob([JSON.stringify(this.buildExport(wishes, now), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Đọc file hoàn toàn trong trình duyệt (NFR-005-02). */
  async readFile(file: File): Promise<Result<unknown, 'TOO_LARGE' | 'NOT_JSON'>> {
    if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: 'TOO_LARGE' };
    const text = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
    return text === null ? { ok: false, error: 'NOT_JSON' } : parseBackupText(text);
  },

  /** Tóm tắt trước khi nhập (FR-005-08). */
  preview(raw: unknown, current: readonly Wish[]): Result<ImportPreview, 'BAD_FORMAT'> {
    const envelope = WishExportSchema.safeParse(raw);
    if (!envelope.success) return { ok: false, error: 'BAD_FORMAT' };
    const { wishes, invalid } = parseWishList(envelope.data.wishes);
    const existing = new Set(current.map((w) => w.id));
    const seen = new Set<string>();
    const valid: Wish[] = [];
    const duplicateIds: string[] = [];
    for (const w of wishes) {
      if (existing.has(w.id) || seen.has(w.id)) duplicateIds.push(w.id);
      else {
        seen.add(w.id);
        valid.push(w);
      }
    }
    return {
      ok: true,
      value: {
        valid,
        duplicateIds,
        invalidCount: invalid,
        overflowCount: Math.max(0, current.length + valid.length - MAX_WISHES),
      },
    };
  },

  snapshot(wishes: Wish[]): void {
    wishRepository.snapshot(wishes);
  },
};
