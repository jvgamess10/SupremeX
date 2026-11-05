export type Sfx = 'shot_ak' | 'shot_sniper' | 'shot_pulsar' | 'reload' | 'hit' | 'hurt' | 'explosion' | 'enemy_shot' | 'pickup' | 'empty';
/** Áudio sintetizado via WebAudio (provisório; trocar por samples reais é tarefa do módulo Audio). */
export class AudioManager {
  private ctx: AudioContext | null = null; private noise: AudioBuffer | null = null; private master: GainNode | null = null;
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext; this.ctx = new AC();
        this.master = this.ctx!.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx!.destination);
        const len = this.ctx!.sampleRate; this.noise = this.ctx!.createBuffer(1, len, this.ctx!.sampleRate);
        const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx!.state !== 'running') void this.ctx!.resume();
    } catch { /* sem áudio */ }
  }
  private tone(f: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(this.master!); o.start(); o.stop(c.currentTime + dur);
  }
  private burst(dur: number, vol: number, freq: number): void {
    const c = this.ctx!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(this.master!); s.start(); s.stop(c.currentTime + dur);
  }
  play(k: Sfx, v = 1): void {
    if (!this.ctx || !this.master || v < 0.03) return;
    switch (k) {
      case 'shot_ak': this.burst(0.12, 0.7 * v, 2500); this.tone(140, 0.1, 'square', 0.3 * v, 50); break;
      case 'shot_sniper': this.burst(0.35, 1 * v, 1800); this.tone(90, 0.3, 'sawtooth', 0.5 * v, 30); break;
      case 'shot_pulsar': this.tone(900, 0.12, 'sawtooth', 0.25 * v, 200); this.tone(1800, 0.06, 'sine', 0.15 * v, 600); break;
      case 'enemy_shot': this.burst(0.1, 0.4 * v, 1800); break;
      case 'reload': this.tone(300, 0.05, 'square', 0.25 * v); setTimeout(() => this.ctx && this.tone(500, 0.06, 'square', 0.25 * v), 350); break;
      case 'hit': this.tone(1200, 0.05, 'sine', 0.3 * v); break;
      case 'hurt': this.tone(110, 0.2, 'sawtooth', 0.4 * v, 60); break;
      case 'explosion': this.burst(0.9, 1 * v, 600); this.tone(60, 0.7, 'sine', 0.8 * v, 25); break;
      case 'pickup': this.tone(600, 0.08, 'sine', 0.3 * v); this.tone(900, 0.1, 'sine', 0.3 * v); break;
      case 'empty': this.tone(200, 0.04, 'square', 0.2 * v); break;
    }
  }
}
