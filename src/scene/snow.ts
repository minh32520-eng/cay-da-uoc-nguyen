/** Ngân sách bông tuyết (NFR-001-09): desktop 3000, màn nhỏ / chất lượng thấp 1200. */
export const SNOW_DESKTOP = 3000;
export const SNOW_MOBILE = 1200;
export const SNOW_MOBILE_BREAKPOINT = 768;

export function snowflakeCount(viewportWidth: number, lowQuality: boolean): number {
  return lowQuality || viewportWidth < SNOW_MOBILE_BREAKPOINT ? SNOW_MOBILE : SNOW_DESKTOP;
}
