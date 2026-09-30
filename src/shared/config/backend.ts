/** Cấu hình backend Supabase (FR-007-01). Thiếu biến → chế độ local. */
export interface BackendConfig {
  url: string;
  anonKey: string;
}

export function resolveBackend(env: Record<string, string | undefined>): BackendConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export const BACKEND: BackendConfig | null = resolveBackend(import.meta.env as Record<string, string | undefined>);

export const isRemote = (): boolean => BACKEND !== null;
