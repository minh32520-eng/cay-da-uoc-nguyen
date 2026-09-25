export type Vec3 = [x: number, y: number, z: number];

export interface BranchSlot {
  id: string; // "slot-001" … "slot-100"
  position: Vec3; // điểm buộc dây trên cành (world space)
  rotationY: number; // radian, hướng tờ giấy
  tier: 'low' | 'mid' | 'high';
}

export interface SceneSettings {
  musicEnabled: boolean;
  musicVolume: number;
  renderMode: 'auto' | '3d' | '2d';
}
