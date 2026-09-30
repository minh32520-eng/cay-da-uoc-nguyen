import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Gạc tuần lộc phân nhánh (dùng chung cho tuần lộc dưới đất và đàn kéo xe). */
export function antlerGeometry(side: 1 | -1): THREE.BufferGeometry {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x * side, y, z);
  const beam = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.1, 0.2, -0.06), V(0.2, 0.42, -0.12), V(0.2, 0.62, -0.06), V(0.12, 0.78, 0.04)]);
  const parts: THREE.BufferGeometry[] = [];
  // Thân gạc thuôn dần về ngọn
  const main = new THREE.TubeGeometry(beam, 24, 1, 7, false);
  const pos = main.getAttribute('position') as THREE.BufferAttribute;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= 24; i++) {
    beam.getPointAt(i / 24, c);
    const r = 0.028 - 0.014 * (i / 24);
    for (let j = 0; j <= 7; j++) {
      const idx = i * 8 + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  main.computeVertexNormals();
  parts.push(main);
  const tine = (t: number, d: THREE.Vector3, r: number) => {
    const p = beam.getPointAt(t);
    const mid = p.clone().add(d.clone().multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.02, 0));
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, mid, p.clone().add(d)]), 8, r, 5, false));
    // Đầu nhánh bo tròn
    const tip = new THREE.SphereGeometry(r, 6, 4);
    tip.translate(...p.clone().add(d).toArray());
    parts.push(tip);
  };
  tine(0.12, V(0.02, 0.06, 0.2), 0.016); // gạc trán
  tine(0.35, V(0.04, 0.16, 0.12), 0.015);
  tine(0.55, V(0.1, 0.16, 0.08), 0.014);
  tine(0.75, V(-0.06, 0.15, 0.09), 0.013);
  const tip = new THREE.SphereGeometry(0.014, 6, 4);
  tip.translate(...beam.getPointAt(1).toArray());
  parts.push(tip);
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const g = mergeGeometries(nonIndexed, false) ?? new THREE.BufferGeometry();
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}
