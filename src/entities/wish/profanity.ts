import words from './profanity-vi.json';

const phrases = (words as string[]).map((w) => ` ${w.normalize('NFC').toLowerCase()} `);

/** So khớp theo từ nguyên vẹn, giữ dấu, để không bắt nhầm "lớn" thành từ cấm. */
export function containsProfanity(s: string): boolean {
  const tokens = s.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return false;
  const padded = ` ${tokens.join(' ')} `;
  return phrases.some((p) => padded.includes(p));
}
