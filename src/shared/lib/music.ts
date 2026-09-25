/**
 * Nhạc nền Trung Thu tổng hợp bằng Web Audio — không cần file âm thanh.
 * Giai điệu ngũ cung vui, lặp lại (FR-001-12).
 */
const NOTE: Record<string, number> = {
  G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880,
};

// [nốt, số phách] — nhịp nhanh, tươi như "Rước đèn"
const MELODY: [string | null, number][] = [
  ['C5', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['G5', 2], ['E5', 2],
  ['D5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['A4', 2], [null, 2],
  ['G4', 1], ['A4', 1], ['C5', 1], ['D5', 1], ['E5', 2], ['G5', 2],
  ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 3], [null, 1],
];
const BEAT = 0.3;

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | undefined;
  private nextTime = 0;
  private step = 0;
  private volume = 0.3;

  async start(volume: number): Promise<boolean> {
    this.volume = volume;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      return false; // trình duyệt chặn (ERR-001-04)
    }
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.master.gain.value = this.volume * 0.25;
    if (this.timer === undefined) {
      this.nextTime = this.ctx.currentTime + 0.05;
      this.timer = window.setInterval(() => this.schedule(), 100);
    }
    return true;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v * 0.25;
  }

  pause() {
    window.clearInterval(this.timer);
    this.timer = undefined;
    void this.ctx?.suspend();
  }

  stop() {
    this.pause();
    this.step = 0;
  }

  private schedule() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    while (this.nextTime < ctx.currentTime + 0.3) {
      const [note, beats] = MELODY[this.step % MELODY.length]!;
      const dur = beats * BEAT;
      if (note) this.pluck(NOTE[note]!, this.nextTime, dur, master);
      if (this.step % 6 === 0) this.pluck(NOTE.C5! / 4, this.nextTime, BEAT * 4, master, 0.5);
      this.nextTime += dur;
      this.step++;
    }
  }

  private pluck(freq: number, at: number, dur: number, out: AudioNode, level = 1) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.6 * level, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + Math.max(0.2, dur * 0.95));
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

export const music = new MusicPlayer();
