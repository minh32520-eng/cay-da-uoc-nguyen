import { z } from 'zod';
import { graphemeLength } from '@/shared/lib/text';
import { DEFAULT_AUTHOR, MAX_AUTHOR, MAX_CONTENT } from './constants';
import { containsProfanity } from './profanity';
import { PAPER_COLORS, WISH_CATEGORIES, type WishDraft } from './types';

const nfcTrim = (s: string) => s.normalize('NFC').trim();

export const ContentSchema = z
  .string()
  .transform(nfcTrim)
  .refine((s) => s.length > 0, { message: 'EMPTY' })
  .refine((s) => graphemeLength(s) <= MAX_CONTENT, { message: 'TOO_LONG' })
  .refine((s) => !containsProfanity(s), { message: 'PROFANITY' });

export const AuthorSchema = z
  .string()
  .transform(nfcTrim)
  .refine((s) => graphemeLength(s) <= MAX_AUTHOR, { message: 'TOO_LONG' })
  .refine((s) => !containsProfanity(s), { message: 'PROFANITY' })
  .transform((s) => s || DEFAULT_AUTHOR);

export const WishDraftSchema = z.object({
  content: ContentSchema,
  author: AuthorSchema,
  category: z.enum(WISH_CATEGORIES),
  paperColor: z.enum(PAPER_COLORS),
});

/** Mặc định Zod strip thuộc tính lạ (NFR-005-03). */
export const WishSchema = WishDraftSchema.extend({
  id: z.string().uuid(),
  slotId: z.string().regex(/^slot-\d{3}$/),
  source: z.enum(['local', 'shared']),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const WishStorageSchema = z.object({
  version: z.literal(1),
  wishes: z.array(z.unknown()),
});

export const WishExportSchema = z.object({
  app: z.literal('cay-da-uoc-nguyen'),
  version: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  wishes: z.array(z.unknown()).max(1000),
});

export type DraftIssue = 'EMPTY' | 'TOO_LONG' | 'PROFANITY';
export type DraftErrors = Partial<Record<keyof WishDraft, DraftIssue>>;

export function validateDraft(
  input: unknown,
): { ok: true; data: WishDraft } | { ok: false; errors: DraftErrors } {
  const r = WishDraftSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const errors: DraftErrors = {};
  for (const issue of r.error.issues) {
    const field = issue.path[0] as keyof WishDraft | undefined;
    if (field && !errors[field]) {
      const msg = issue.message;
      errors[field] = msg === 'TOO_LONG' || msg === 'PROFANITY' ? msg : 'EMPTY';
    }
  }
  return { ok: false, errors };
}

/** Parse từng phần tử, trả về bản ghi hợp lệ và số bản ghi hỏng (FR-003-10). */
export function parseWishList(items: unknown[]): { wishes: z.infer<typeof WishSchema>[]; invalid: number } {
  const wishes: z.infer<typeof WishSchema>[] = [];
  let invalid = 0;
  for (const item of items) {
    const r = WishSchema.safeParse(item);
    if (r.success) wishes.push(r.data);
    else invalid++;
  }
  return { wishes, invalid };
}
