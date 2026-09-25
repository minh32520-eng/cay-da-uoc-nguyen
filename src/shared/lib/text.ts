const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });

/** Đếm ký tự theo grapheme: emoji hay chữ Việt tổ hợp đều là 1 (NFR-002-05). */
export function graphemeLength(s: string): number {
  return Array.from(segmenter.segment(s)).length;
}

/** Cắt chuỗi còn tối đa `max` grapheme. */
export function truncateGraphemes(s: string, max: number): string {
  let out = '';
  let n = 0;
  for (const { segment } of segmenter.segment(s)) {
    if (n++ >= max) break;
    out += segment;
  }
  return out;
}

/** Chuẩn hoá tiếng Việt để tìm kiếm: thường, bỏ dấu, đ→d. */
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
