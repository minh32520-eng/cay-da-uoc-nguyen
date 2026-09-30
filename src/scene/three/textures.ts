import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';

/**
 * Texture vẽ bằng canvas lúc chạy — không cần file ảnh, không tải tài nguyên ngoài.
 * Mỗi texture chỉ tạo một lần.
 */
const cache = new Map<string, THREE.Texture>();

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Lá đa: hình trứng, mũi nhọn, gân giữa. Màu trắng để instance color nhuộm. */
export function leafTexture() {
  return make('leaf', 128, (c, s) => {
    c.translate(s / 2, s / 2);
    c.beginPath();
    c.moveTo(0, -s * 0.46);
    c.bezierCurveTo(s * 0.36, -s * 0.3, s * 0.34, s * 0.28, 0, s * 0.42);
    c.bezierCurveTo(-s * 0.34, s * 0.28, -s * 0.36, -s * 0.3, 0, -s * 0.46);
    const g = c.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
    g.addColorStop(0, '#d9d9d9');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, '#cfcfcf');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.28)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, -s * 0.4);
    c.lineTo(0, s * 0.4);
    for (let i = -3; i <= 3; i++) {
      const y = i * s * 0.09;
      c.moveTo(0, y);
      c.quadraticCurveTo(s * 0.12, y - s * 0.05, s * 0.22, y - s * 0.1);
      c.moveTo(0, y);
      c.quadraticCurveTo(-s * 0.12, y - s * 0.05, -s * 0.22, y - s * 0.1);
    }
    c.lineWidth = 1.2;
    c.stroke();
  });
}

/** Quầng sáng tròn mềm (dùng cho quả châu, ngôi sao, trăng). */
export function glowTexture() {
  return make('glow', 128, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });
}

/** Mặt trăng mùa đông với các vùng biển trăng mờ. */
export function moonTexture() {
  return make('moon', 512, (c, s) => {
    const rnd = mulberry32(815);
    const base = c.createRadialGradient(s * 0.42, s * 0.4, s * 0.05, s / 2, s / 2, s * 0.62);
    base.addColorStop(0, '#fffdf2');
    base.addColorStop(0.6, '#fbeec2');
    base.addColorStop(1, '#eed28b');
    c.fillStyle = base;
    c.fillRect(0, 0, s, s);
    // Biển trăng
    for (let i = 0; i < 26; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const r = s * (0.03 + rnd() * 0.12);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(196,168,110,0.35)');
      g.addColorStop(1, 'rgba(196,168,110,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

/** Mây mỏng quanh trăng. */
export function cloudTexture() {
  return make('cloud', 256, (c, s) => {
    const rnd = mulberry32(42);
    for (let i = 0; i < 14; i++) {
      const x = s * (0.15 + rnd() * 0.7);
      const y = s * (0.4 + rnd() * 0.2);
      const r = s * (0.12 + rnd() * 0.15);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    }
  });
}

/** Tờ giấy ước nguyện: viền, nét chữ thư pháp mờ, dấu triện. Nền trắng để nhuộm màu. */
export function paperTexture() {
  return make('paper', 128, (c, s) => {
    const rnd = mulberry32(99);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(120,80,20,0.45)';
    c.lineWidth = 3;
    c.strokeRect(7, 7, s - 14, s - 14);
    c.strokeStyle = 'rgba(40,20,0,0.5)';
    c.lineCap = 'round';
    for (let col = 0; col < 3; col++) {
      const x = s * (0.7 - col * 0.2);
      let y = s * 0.18;
      while (y < s * (0.72 - col * 0.08)) {
        const h = 6 + rnd() * 8;
        c.lineWidth = 2 + rnd() * 2.5;
        c.beginPath();
        c.moveTo(x - 4 + rnd() * 3, y);
        c.quadraticCurveTo(x + 5, y + h * 0.4, x - 3 + rnd() * 6, y + h);
        c.stroke();
        y += h + 4;
      }
    }
    c.fillStyle = 'rgba(190,20,20,0.75)';
    c.fillRect(s * 0.18, s * 0.74, s * 0.14, s * 0.14);
  });
}

/** Cành thông: cuống giữa và nhiều lá kim hai bên. Màu trắng để instance color nhuộm. */
export function pineSprigTexture() {
  return make('pine', 128, (c, s) => {
    const rnd = mulberry32(7);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(s / 2, s * 0.95);
    c.lineTo(s / 2, s * 0.05);
    c.stroke();
    for (let i = 0; i < 26; i++) {
      const y = s * (0.1 + (i / 26) * 0.82);
      const len = s * (0.18 + 0.22 * Math.sin((i / 26) * Math.PI)) * (0.85 + rnd() * 0.3);
      for (const side of [-1, 1]) {
        const v = 215 + Math.floor(rnd() * 40);
        c.strokeStyle = `rgba(${v},${v},${v},1)`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(s / 2, y);
        c.lineTo(s / 2 + side * len, y - len * 0.55);
        c.stroke();
      }
    }
  });
}

/** Bông tuyết mềm, sáng ở tâm. */
export function snowflakeTexture() {
  return make('snowflake', 64, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });
}
