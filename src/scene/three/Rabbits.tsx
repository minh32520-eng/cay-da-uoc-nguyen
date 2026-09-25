import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { GROUND_OBSTACLES } from '../groundLayout';
import { createBrain, stepBrain, type RabbitBrain } from '../rabbitBrain';

/**
 * Thỏ ngọc quanh gốc đa. Dáng thỏ thật: mông & đùi sau to, thân hình quả lê,
 * mắt lồi hai bên đầu, môi chẻ, ria, tai dài có lòng hồng, bàn chân sau dài.
 * Lông mịn dùng "sheen" của MeshPhysicalMaterial; lưng sẫm hơn bụng.
 * Hành vi: nhảy từng đợt (chân sau đạp, chân trước với), dừng đánh hơi,
 * thỉnh thoảng đứng thẳng nhìn quanh, tai xoay độc lập.
 */

interface Coat {
  back: string;
  belly: string;
  ear: string;
}

const COATS: Coat[] = [
  { back: '#f1ece4', belly: '#ffffff', ear: '#f3b4bf' }, // thỏ ngọc trắng
  { back: '#8a6a4f', belly: '#eadfcf', ear: '#c99a8a' }, // thỏ rừng nâu
  { back: '#f1ece4', belly: '#ffffff', ear: '#f3b4bf' },
  { back: '#9d958f', belly: '#e6e2dd', ear: '#d6a8ad' }, // xám
  { back: '#c4945f', belly: '#f4e6d2', ear: '#e3a99c' }, // vàng nâu
  { back: '#7a5a42', belly: '#e4d4c0', ear: '#c2928a' },
];

/** Khối cầu có nhiễu nhẹ để viền lông trông mềm, không tròn tuyệt đối. */
function furSphere(seed: number, amp = 0.018): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 32, 24);
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

/** Tai: hình lá dài, gốc hẹp, giữa rộng, đầu tròn; mỏng theo trục z. */
function earGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * (0.55 + 0.45 * Math.sin(Math.PI * t * 0.9));
    pts.push(new THREE.Vector2(Math.max(0.001, w), t));
  }
  const g = new THREE.LatheGeometry(pts, 20);
  g.scale(1, 1, 0.35);
  g.computeVertexNormals();
  return g;
}

/** Tô gradient lưng sẫm → bụng sáng theo trục y của từng khối. */
function withVerticalGradient(src: THREE.BufferGeometry, back: THREE.Color, belly: THREE.Color): THREE.BufferGeometry {
  const g = src.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    c.copy(belly).lerp(back, 0.25 + 0.75 * THREE.MathUtils.smoothstep(y, -0.9, 0.9));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Trạng thái hoạt ảnh (tai, đầu, đứng); di chuyển nằm trong RabbitBrain. */
interface AnimState {
  standBlend: number;
  t: number;
  earTwitchL: number;
  earTwitchR: number;
  lookYaw: number;
  yaw: number;
}

/** Đàn thỏ dùng chung để tách nhau ra và cho camera xem thử (?rabbitcam). */
export const RABBIT_HERD: RabbitBrain[] = [];

function Rabbit({
  coat,
  seed,
  animate,
  brain,
}: {
  coat: Coat;
  seed: number;
  animate: boolean;
  brain: RabbitBrain;
}) {
  const root = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const nose = useRef<THREE.Mesh>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);
  const hindL = useRef<THREE.Group>(null);
  const hindR = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);

  const rnd = useMemo(() => mulberry32(seed * 7 + 1), [seed]);
  const s = useRef<AnimState>({ standBlend: 0, t: rnd() * 10, earTwitchL: 0, earTwitchR: 0, lookYaw: 0, yaw: brain.heading });

  const res = useMemo(() => {
    const back = new THREE.Color(coat.back);
    const belly = new THREE.Color(coat.belly);
    const fur = (m: THREE.Color) =>
      new THREE.MeshPhysicalMaterial({
        color: m,
        roughness: 1,
        sheen: 1,
        sheenRoughness: 0.45,
        sheenColor: new THREE.Color('#ffffff'),
        emissive: '#151829',
        emissiveIntensity: 0.4,
      });
    const furGrad = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 1,
      sheen: 1,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color('#ffffff'),
      emissive: '#151829',
      emissiveIntensity: 0.4,
    });
    const base = furSphere(seed * 0.37);
    return {
      furGrad,
      coat: fur(back),
      belly: fur(belly),
      earInner: new THREE.MeshStandardMaterial({ color: coat.ear, roughness: 0.7, emissive: '#2a1216', emissiveIntensity: 0.3 }),
      eye: new THREE.MeshPhysicalMaterial({ color: '#1b0c07', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
      eyeGlint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      nose: new THREE.MeshStandardMaterial({ color: '#d98a95', roughness: 0.5 }),
      whisker: new THREE.MeshBasicMaterial({ color: '#f3efe7', transparent: true, opacity: 0.7 }),
      bodyGeo: withVerticalGradient(base, back, belly),
      furGeo: base,
      tailGeo: furSphere(seed + 3, 0.12),
      smooth: new THREE.SphereGeometry(1, 20, 14),
      ear: earGeometry(),
      whiskerGeo: new THREE.CylinderGeometry(0.0016, 0.0008, 0.11, 3),
      legGeo: new THREE.CapsuleGeometry(0.02, 0.07, 4, 8),
    };
  }, [coat, seed]);

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const st = s.current;
    const dt = Math.min(rawDelta, 0.05);

    if (animate) {
      stepBrain(brain, dt, rnd, GROUND_OBSTACLES, RABBIT_HERD);
      st.t += dt;
      if (brain.mode !== 'hop') {
        if (rnd() < dt * 0.7) st.earTwitchL = 1;
        if (rnd() < dt * 0.7) st.earTwitchR = 1;
        if (rnd() < dt * 0.4) st.lookYaw = (rnd() - 0.5) * 1.2;
      } else st.lookYaw = 0;
      st.earTwitchL = Math.max(0, st.earTwitchL - dt * 5);
      st.earTwitchR = Math.max(0, st.earTwitchR - dt * 5);
      st.standBlend += ((brain.mode === 'stand' ? 1 : 0) - st.standBlend) * Math.min(1, dt * 6);
    }

    const hopping = brain.mode === 'hop';
    const p = brain.hopPhase;
    const air = hopping ? Math.sin(Math.PI * p) : 0;
    const { x, z } = brain;
    g.position.set(x, air * 0.17, z);
    let dh = brain.heading - st.yaw;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    st.yaw += dh * Math.min(1, dt * 12);
    g.rotation.y = st.yaw;
    if (shadow.current) {
      shadow.current.position.set(x, 0.005, z);
      shadow.current.scale.setScalar(1 - air * 0.35);
    }

    // Thân: chúi mũi khi đạp, ngẩng khi tiếp đất; đứng thẳng khi dò xét
    if (body.current) {
      const pitch = hopping ? -Math.sin(Math.PI * 2 * p) * 0.3 : 0;
      body.current.rotation.x = pitch - st.standBlend * 0.95;
      body.current.scale.set(1, 1 - air * 0.06, 1 + air * 0.14);
    }
    if (head.current) {
      const breathe = Math.sin(st.t * 3) * 0.015;
      head.current.rotation.x = (hopping ? 0.15 : -0.08 + breathe) + st.standBlend * 0.85;
      head.current.rotation.y += ((hopping ? 0 : st.lookYaw) - head.current.rotation.y) * Math.min(1, dt * 4);
    }
    if (nose.current) {
      const twitch = hopping ? 0 : Math.max(0, Math.sin(st.t * 22)) * 0.35;
      nose.current.scale.set(0.013, 0.009 * (1 + twitch), 0.009);
    }
    // Tai ép ra sau khi nhảy, dựng lên khi nghe ngóng
    const earBack = -0.3 - air * 0.55 + st.standBlend * 0.25;
    earL.current?.rotation.set(earBack - st.earTwitchL * 0.35, 0.35 + st.earTwitchL * 0.4, 0.16);
    earR.current?.rotation.set(earBack - st.earTwitchR * 0.35, -0.35 - st.earTwitchR * 0.4, -0.16);
    // Chân sau duỗi ra sau lúc bật, chân trước với tới lúc bay
    const hindKick = hopping ? Math.max(0, Math.sin(Math.PI * 2 * p)) * 1.1 : 0;
    hindL.current?.rotation.set(hindKick, 0, 0);
    hindR.current?.rotation.set(hindKick, 0, 0);
    const reach = hopping ? -Math.sin(Math.PI * p) * 0.9 : st.standBlend * -0.6;
    foreL.current?.rotation.set(reach, 0, 0);
    foreR.current?.rotation.set(reach, 0, 0);
  });

  const M = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number], sc: [number, number, number], rot?: [number, number, number]) => (
    <mesh geometry={geo} material={mat} position={p} scale={sc} rotation={rot} />
  );

  const Ear = ({ side }: { side: 1 | -1 }) => (
    <group ref={side === 1 ? earL : earR} position={[side * 0.026, 0.06, -0.005]}>
      <mesh geometry={res.ear} material={res.coat} scale={[0.028, 0.15, 0.028]} />
      <mesh geometry={res.ear} material={res.earInner} position={[0, 0.012, 0.006]} scale={[0.018, 0.125, 0.012]} />
    </group>
  );

  const Whiskers = ({ side }: { side: 1 | -1 }) => (
    <group position={[side * 0.025, -0.02, 0.125]}>
      {[-0.15, 0, 0.15].map((tilt) => (
        <mesh key={tilt} geometry={res.whiskerGeo} material={res.whisker} position={[side * 0.05, tilt * 0.08, -0.005]} rotation={[0, 0, side * (Math.PI / 2 + tilt)]} />
      ))}
    </group>
  );

  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <group ref={root} scale={1.15}>
        {/* Trục xoay thân đặt ở mông để có thể "đứng" bằng chân sau */}
        <group ref={body} position={[0, 0.05, -0.12]}>
          <group position={[0, -0.05, 0.12]}>
            {M(res.bodyGeo, res.furGrad, [0, 0.13, -0.08], [0.13, 0.125, 0.15])}
            {M(res.bodyGeo, res.furGrad, [0.085, 0.1, -0.1], [0.06, 0.085, 0.1])}
            {M(res.bodyGeo, res.furGrad, [-0.085, 0.1, -0.1], [0.06, 0.085, 0.1])}
            {M(res.bodyGeo, res.furGrad, [0, 0.15, 0.02], [0.11, 0.11, 0.13])}
            {M(res.furGeo, res.belly, [0, 0.14, 0.1], [0.08, 0.095, 0.085])}
            {M(res.bodyGeo, res.furGrad, [0, 0.2, 0.1], [0.07, 0.07, 0.07])}
            {M(res.tailGeo, res.belly, [0, 0.17, -0.225], [0.042, 0.042, 0.038])}

            {/* Chân sau: bàn chân dài áp đất */}
            {([1, -1] as const).map((sd) => (
              <group key={sd} ref={sd === 1 ? hindL : hindR} position={[sd * 0.08, 0.06, -0.1]}>
                {M(res.furGeo, res.coat, [0, -0.04, 0.07], [0.03, 0.022, 0.1])}
              </group>
            ))}
            {/* Chân trước */}
            {([1, -1] as const).map((sd) => (
              <group key={sd} ref={sd === 1 ? foreL : foreR} position={[sd * 0.04, 0.12, 0.13]}>
                <mesh geometry={res.legGeo} material={res.belly} position={[0, -0.055, 0.005]} />
                {M(res.smooth, res.belly, [0, -0.105, 0.018], [0.022, 0.017, 0.034])}
              </group>
            ))}

            <group ref={head} position={[0, 0.24, 0.14]}>
              {M(res.bodyGeo, res.furGrad, [0, 0.02, 0.05], [0.075, 0.07, 0.09])}
              {M(res.bodyGeo, res.furGrad, [0.045, -0.005, 0.07], [0.045, 0.045, 0.05])}
              {M(res.bodyGeo, res.furGrad, [-0.045, -0.005, 0.07], [0.045, 0.045, 0.05])}
              {M(res.smooth, res.belly, [0, -0.012, 0.115], [0.04, 0.035, 0.038])}
              {M(res.smooth, res.belly, [0.012, -0.03, 0.135], [0.016, 0.014, 0.012])}
              {M(res.smooth, res.belly, [-0.012, -0.03, 0.135], [0.016, 0.014, 0.012])}
              <mesh ref={nose} geometry={res.smooth} material={res.nose} position={[0, 0.002, 0.148]} scale={[0.013, 0.009, 0.009]} />
              {/* Mắt lồi hai bên đầu + chấm sáng */}
              {([1, -1] as const).map((sd) => (
                <group key={sd}>
                  {M(res.smooth, res.eye, [sd * 0.058, 0.025, 0.078], [0.017, 0.021, 0.02])}
                  {M(res.smooth, res.eyeGlint, [sd * 0.07, 0.034, 0.088], [0.004, 0.004, 0.004])}
                </group>
              ))}
              <Whiskers side={1} />
              <Whiskers side={-1} />
              <Ear side={1} />
              <Ear side={-1} />
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

export function Rabbits({ animate }: { animate: boolean }) {
  const brains = useMemo(() => {
    const herd = COATS.map((_, i) => createBrain(mulberry32(100 + i * 17), GROUND_OBSTACLES));
    RABBIT_HERD.splice(0, RABBIT_HERD.length, ...herd);
    return herd;
  }, []);
  return (
    <>
      {COATS.map((coat, i) => (
        <Rabbit key={i} coat={coat} seed={100 + i * 17} animate={animate} brain={brains[i]!} />
      ))}
    </>
  );
}
