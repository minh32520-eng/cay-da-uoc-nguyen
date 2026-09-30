import * as THREE from 'three';

/** Khối cầu có nhiễu nhẹ để viền lông / tuyết trông mềm, không tròn tuyệt đối. */
export function lumpySphere(seed: number, amp = 0.018, w = 32, h = 24): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, w, h);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 9 + seed) * Math.sin(v.y * 11 + seed * 2) * Math.sin(v.z * 7 - seed);
    v.multiplyScalar(1 + n * amp);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Tô gradient lưng sẫm → bụng sáng theo trục y của khối. */
export function withVerticalGradient(src: THREE.BufferGeometry, back: THREE.Color, belly: THREE.Color): THREE.BufferGeometry {
  const g = src.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(belly).lerp(back, 0.25 + 0.75 * THREE.MathUtils.smoothstep(pos.getY(i), -0.9, 0.9));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Vật liệu lông mịn (sheen) — color hoặc vertexColors. */
export function furMaterial(color?: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: color ?? '#ffffff',
    vertexColors: color === undefined,
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#ffffff'),
    emissive: '#141a30',
    emissiveIntensity: 0.35,
  });
}
