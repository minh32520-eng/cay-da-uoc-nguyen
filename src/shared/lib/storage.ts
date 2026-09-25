/** Bọc localStorage/sessionStorage an toàn: không bao giờ ném lỗi khi đọc. */
export class StorageError extends Error {
  constructor(public readonly cause: unknown) {
    super('STORAGE_FAILED');
  }
}

function getStore(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readRaw(key: string, kind: 'local' | 'session' = 'local'): string | null {
  try {
    return getStore(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Ném StorageError khi quota đầy hoặc storage bị chặn. */
export function writeRaw(key: string, value: string, kind: 'local' | 'session' = 'local'): void {
  const store = getStore(kind);
  if (!store) throw new StorageError(new Error('unavailable'));
  try {
    store.setItem(key, value);
  } catch (e) {
    throw new StorageError(e);
  }
}

export function removeKey(key: string, kind: 'local' | 'session' = 'local'): void {
  try {
    getStore(kind)?.removeItem(key);
  } catch {
    /* bỏ qua: không có gì để xoá */
  }
}

export function readJson(key: string, kind: 'local' | 'session' = 'local'): unknown {
  const raw = readRaw(key, kind);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined; // undefined = có dữ liệu nhưng hỏng
  }
}
