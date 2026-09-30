/**
 * Bản sao danh sách từ cấm của client (src/entities/wish/profanity-vi.json).
 * Edge Function chạy trên Deno nên không import được file JSON của frontend;
 * test AC-007-11 đảm bảo hai danh sách luôn giống hệt nhau.
 */
export const PROFANITY_WORDS: readonly string[] = [
  'địt', 'đụ', 'lồn', 'cặc', 'buồi', 'đéo', 'đĩ', 'đm', 'đmm', 'dm', 'dmm', 'đcm', 'dcm',
  'vcl', 'vkl', 'clm', 'cmm', 'óc chó', 'thằng chó', 'mẹ mày', 'fuck', 'shit', 'bitch',
];
