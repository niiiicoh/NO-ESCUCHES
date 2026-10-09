import { describe, it, expect, vi, afterEach } from 'vitest';
import { AudioService } from './audio';
import { effectiveMotion } from '../features/preferences/motion';
import { preferencesSchema, type Preferences } from '../features/preferences/store';
const prefs: Preferences = { version: 1, soundEnabled: true, volume: 35, motion: 'system' };
function fixture() {
  const started: ReturnType<typeof vi.fn>[] = [],
    stopped: ReturnType<typeof vi.fn>[] = [],
    gain = {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createOscillator() {
      const start = vi.fn(),
        stop = vi.fn();
      started.push(start);
      stopped.push(stop);
      return {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start,
        stop,
        onended: null,
      };
    },
    createGain() {
      return { gain, connect: vi.fn(), disconnect: vi.fn() };
    },
  } as unknown as AudioContext;
  return { service: new AudioService(() => ctx), started, stopped, gain };
}
afterEach(() => vi.useRealTimers());
describe('audio local y cancelación', () => {
  it('apagado inicialmente no crea ni reproduce recursos', async () => {
    const create = vi.fn(() => {
        throw new Error('blocked');
      }),
      service = new AudioService(create);
    await service.unlock();
    service.play({ id: '1', kind: 'START' });
    expect(create).not.toHaveBeenCalled();
  });
  it('compra con reparto y fin secuencia sonidos y silencio cancela todo', async () => {
    vi.useFakeTimers();
    const { service, started, stopped } = fixture();
    service.configure(prefs);
    await service.unlock();
    service.play({ id: '1', kind: 'PURCHASE', autoCount: 3, finished: true });
    expect(started).toHaveLength(2);
    service.configure({ ...prefs, soundEnabled: false });
    vi.runAllTimers();
    expect(started).toHaveLength(2);
    expect(stopped.every((stop) => stop.mock.calls.length >= 2)).toBe(true);
  });
  it('reparto es un solo efecto por lote y termina en menos de 900ms', async () => {
    vi.useFakeTimers();
    const { service, started } = fixture();
    service.configure(prefs);
    await service.unlock();
    service.play({ id: '1', kind: 'PURCHASE', autoCount: 8, finished: true });
    vi.advanceTimersByTime(900);
    expect(started).toHaveLength(6);
    service.stop();
  });
  it('deshacer cancela la secuencia pendiente', async () => {
    vi.useFakeTimers();
    const { service, started } = fixture();
    service.configure(prefs);
    await service.unlock();
    service.play({ id: '1', kind: 'PURCHASE', autoCount: 3, finished: true });
    service.play({ id: '2', kind: 'UNDO' });
    vi.runAllTimers();
    expect(started).toHaveLength(4);
  });
  it('volumen 0 corta ticks pendientes y no emite nuevos efectos', async () => {
    vi.useFakeTimers();
    const { service, started } = fixture();
    service.configure(prefs);
    await service.unlock();
    service.ticks(2600);
    service.configure({ ...prefs, volume: 0 });
    vi.runAllTimers();
    service.test();
    expect(started).toHaveLength(0);
  });
  it('fallo de audio se informa sin lanzar error funcional', async () => {
    const report = vi.fn(),
      service = new AudioService(() => {
        throw new Error('blocked');
      }, report);
    service.configure(prefs);
    await expect(service.unlock()).resolves.toBeUndefined();
    expect(report).toHaveBeenCalledWith(expect.stringContaining('seguir jugando'));
  });
  it('respeta sistema reducido incluso con modo Sistema', () => {
    expect(effectiveMotion('system', true)).toBe('reduced');
    expect(effectiveMotion('none', true)).toBe('none');
    expect(effectiveMotion('reduced', false)).toBe('reduced');
    expect(effectiveMotion('system', false)).toBe('full');
  });
  it('valida el rango de preferencias recuperadas', () => {
    expect(preferencesSchema.safeParse({ ...prefs, volume: 101 }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...prefs, motion: 'crazy' }).success).toBe(false);
  });
});
