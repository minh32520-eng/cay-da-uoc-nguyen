import type { PaperColor } from './types';

export const MAX_WISHES = 100;
export const MAX_CONTENT = 200;
export const MAX_AUTHOR = 30;
export const DEFAULT_AUTHOR = 'Ẩn danh';
export const UNDO_MS = 8000;

export const STORAGE_KEYS = {
  wishes: 'banyan:wishes:v1',
  backup: 'banyan:wishes:backup',
  draft: 'banyan:draft:v1',
  settings: 'banyan:settings:v1',
  filter: 'banyan:filter:v1',
} as const;

export const PAPER_HEX: Record<PaperColor, string> = {
  red: '#d62828',
  yellow: '#f5c542',
  pink: '#f28bb3',
  green: '#4caf6e',
  blue: '#4a8fe7',
};

/** Màu chữ trên giấy, đảm bảo tương phản ≥ 4.5:1. */
export const PAPER_INK: Record<PaperColor, string> = {
  red: '#fff7e6',
  yellow: '#3b2300',
  pink: '#3a0a1c',
  green: '#062611',
  blue: '#06183a',
};

