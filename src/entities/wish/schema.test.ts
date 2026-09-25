import { describe, expect, it } from 'vitest';
import { graphemeLength } from '@/shared/lib/text';
import { containsProfanity } from './profanity';
import { validateDraft } from './schema';
import { makeDraft } from '@/test/factories';

describe('validateDraft (002)', () => {
  it('AC-002-05: tên trống được gán "Ẩn danh"', () => {
    const r = validateDraft(makeDraft({ author: '   ' }));
    expect(r.ok && r.data.author).toBe('Ẩn danh');
  });

  it('AC-002-06: nội dung chỉ có khoảng trắng bị từ chối với lỗi EMPTY', () => {
    const r = validateDraft(makeDraft({ content: '  \n ' }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.content).toBe('EMPTY');
  });

  it('AC-002-07: nội dung chứa từ cấm bị chặn', () => {
    const r = validateDraft(makeDraft({ content: 'đồ óc chó' }));
    expect(!r.ok && r.errors.content).toBe('PROFANITY');
  });

  it('không bắt nhầm từ bình thường chứa chuỗi con giống từ cấm', () => {
    expect(containsProfanity('Ước con lớn lên khoẻ mạnh, học giỏi')).toBe(false);
    expect(containsProfanity('Mong mẹ vui')).toBe(false);
  });

  it('FR-002-03: nội dung > 200 ký tự bị từ chối', () => {
    const r = validateDraft(makeDraft({ content: 'a'.repeat(201) }));
    expect(!r.ok && r.errors.content).toBe('TOO_LONG');
    expect(validateDraft(makeDraft({ content: 'a'.repeat(200) })).ok).toBe(true);
  });

  it('AC-002-09: nội dung được trim và chuẩn hoá NFC', () => {
    const decomposed = '  Đỗ đại học  '.normalize('NFD');
    const r = validateDraft(makeDraft({ content: decomposed }));
    expect(r.ok && r.data.content).toBe('Đỗ đại học'.normalize('NFC'));
  });

  it('AC-002-14: emoji & chữ Việt tổ hợp đếm là 1 ký tự', () => {
    expect(graphemeLength('🌕🏮')).toBe(2);
    expect(graphemeLength('Đỗ'.normalize('NFD'))).toBe(2);
    expect(graphemeLength('👨‍👩‍👧')).toBe(1);
  });

  it('từ chối chủ đề / màu không hợp lệ', () => {
    expect(validateDraft({ ...makeDraft(), category: 'money' }).ok).toBe(false);
    expect(validateDraft({ ...makeDraft(), paperColor: 'black' }).ok).toBe(false);
  });
});
