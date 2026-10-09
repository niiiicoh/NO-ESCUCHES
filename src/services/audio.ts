import type { EffectEvent, EffectKind } from './events';
import type { Preferences } from '../features/preferences/store';
export class AudioService {
  private context: AudioContext | null = null;
  private nodes = new Set<AudioScheduledSourceNode>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private enabled = false;
  private volume = 35;
  private lastReject = 0;
  constructor(
    private createContext: () => AudioContext = () => new AudioContext(),
    private report: (message: string) => void = () => {},
  ) {}
  configure(p: Preferences) {
    this.enabled = p.soundEnabled;
    this.volume = p.volume;
    if (!this.enabled || !this.volume) this.stop();
  }
  async unlock() {
    if (!this.enabled || !this.volume) return;
    try {
      this.context ??= this.createContext();
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.context.state !== 'running') throw new Error('blocked');
      this.report('');
    } catch {
      this.report('El navegador no pudo activar el audio. Puedes seguir jugando.');
    }
  }
  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        /* Already ended. */
      }
      node.disconnect();
    }
    this.nodes.clear();
  }
  private later(callback: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, ms);
    this.timers.add(timer);
  }
  private tone(frequency: number, duration: number, delay = 0, wave: OscillatorType = 'sine') {
    if (!this.enabled || !this.volume || !this.context || this.context.state !== 'running') return;
    try {
      const ctx = this.context,
        start = ctx.currentTime + delay,
        osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.8), start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime((this.volume / 100) * 0.075, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this.nodes.add(osc);
      osc.onended = () => {
        this.nodes.delete(osc);
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {
      this.report('No se pudo reproducir un efecto. El juego sigue disponible.');
    }
  }
  private effect(kind: EffectKind) {
    const tones: Record<Exclude<EffectKind, 'DRAW'>, number[]> = {
      START: [262, 330, 392],
      DRAW_RESULT: [392, 523],
      PURCHASE: [760, 480],
      UNDO: [440, 330],
      AUTO_ASSIGN: [300, 420],
      FINISH: [330, 262],
      REVEAL: [294, 370, 440],
      CATALOG_SAVE: [520],
      CATALOG_DELETE: [260, 220],
      REJECT: [180],
    };
    if (kind === 'DRAW') return;
    const notes = tones[kind];
    notes.forEach((n, i) =>
      this.tone(
        n,
        ['START', 'FINISH', 'REVEAL'].includes(kind) ? 0.24 : 0.095,
        i * 0.1,
        kind === 'PURCHASE' ? 'triangle' : 'sine',
      ),
    );
  }
  play(event: EffectEvent) {
    if (!this.enabled || !this.volume) return;
    if (event.kind === 'UNDO') this.stop();
    if (event.kind === 'REJECT') {
      const now = Date.now();
      if (now - this.lastReject < 150) return;
      this.lastReject = now;
    }
    this.effect(event.kind);
    if (event.kind === 'PURCHASE') {
      if (event.autoCount) this.later(() => this.effect('AUTO_ASSIGN'), 220);
      if (event.finished) this.later(() => this.effect('FINISH'), 460);
    }
  }
  ticks(duration: number) {
    if (!this.enabled || !this.volume) return;
    let time = 0;
    for (let n = 0; n < 18; n++) {
      time += 55 + n * 8;
      if (time >= duration) break;
      this.later(() => this.tone(880, 0.04, 0, 'triangle'), time);
    }
  }
  test() {
    this.stop();
    this.effect('CATALOG_SAVE');
  }
}
export const audioService = new AudioService(undefined, (message) => {
  window.dispatchEvent(new CustomEvent('no-escuches:audio-status', { detail: message }));
});
