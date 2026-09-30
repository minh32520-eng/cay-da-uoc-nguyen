import type { Vec3 } from './types';

/**
 * Hằng số bầu trời dùng chung (logic thuần, không phụ thuộc three.js).
 * Toạ độ tính trong "khung nhìn gốc": camera ở VIEW_ORIGIN nhìn về −z.
 * Khi camera xoay quanh cây, trăng và đường bay của xe trượt tuyết xoay theo
 * cùng góc phương vị nên luôn ở cùng chỗ trên bầu trời (FR-001-20).
 */
export const VIEW_ORIGIN: Vec3 = [0, 5.6, 15.5];
export const MOON_POSITION: Vec3 = [-18, 17, -60];
export const MOON_RADIUS = 6.5;
