import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Settings2, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/shared';
import { usePreferences, type MotionPreference } from './store';
import { audioService } from '../../services/audio';
import { useConfirm } from '../../components/ui/confirm';
export function setPreference(
  values: Parameters<ReturnType<typeof usePreferences.getState>['update']>[0],
) {
  const store = usePreferences.getState();
  if (store.update(values)) {
    audioService.configure(usePreferences.getState().preferences);
    void audioService.unlock();
  }
}
export function SoundToggle({ text = false }: { text?: boolean }) {
  const { soundEnabled, volume } = usePreferences((s) => s.preferences),
    silent = !soundEnabled || !volume;
  return (
    <Button
      variant="ghost"
      className="sound-toggle"
      aria-label={silent ? 'Activar sonidos' : 'Silenciar sonidos'}
      aria-pressed={!silent}
      onClick={() => {
        if (!silent) audioService.stop();
        setPreference({ soundEnabled: silent, volume: silent && volume === 0 ? 35 : volume });
      }}
    >
      {silent ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
      {text && (silent ? 'Activar sonidos' : 'Silenciar sonidos')}
    </Button>
  );
}
export function PreferencesDialog() {
  const store = usePreferences(),
    [open, setOpen] = useState(false),
    confirm = useConfirm();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" aria-label="Preferencias">
          <Settings2 size={18} aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content preferences-dialog">
          <Dialog.Title asChild>
            <h2>A tu ritmo.</h2>
          </Dialog.Title>
          <Dialog.Description asChild>
            <p className="muted">Sonidos y movimiento para esta mesa.</p>
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button className="dialog-close" variant="ghost" aria-label="Cerrar preferencias">
              <X size={18} aria-hidden="true" />
            </Button>
          </Dialog.Close>
          <SoundToggle text />
          <Field label={`Volumen · ${store.preferences.volume}%`} hint="0 equivale a silencio.">
            {(id) => (
              <input
                id={id}
                type="range"
                min="0"
                max="100"
                value={store.preferences.volume}
                onChange={(e) => setPreference({ volume: Number(e.target.value) })}
              />
            )}
          </Field>
          <Button
            variant="secondary"
            disabled={!store.preferences.soundEnabled || store.preferences.volume === 0}
            onClick={async () => {
              await audioService.unlock();
              audioService.test();
            }}
          >
            Probar sonido
          </Button>
          <Field
            label="Movimiento"
            hint="La preferencia del sistema por reducir movimiento se respeta siempre."
          >
            {(id) => (
              <select
                id={id}
                value={store.preferences.motion}
                onChange={(e) => setPreference({ motion: e.target.value as MotionPreference })}
              >
                <option value="system">Sistema</option>
                <option value="reduced">Reducido</option>
                <option value="none">Sin animaciones</option>
              </select>
            )}
          </Field>
          {store.error && (
            <div className="notice error-notice" role="alert">
              <p>{store.error}</p>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (
                    await confirm(
                      '¿Restablecer preferencias?',
                      'Se restablecerán solo el sonido, volumen y movimiento. La partida y el catálogo se conservan.',
                      'Restablecer',
                    )
                  )
                    store.reset();
                }}
              >
                Restablecer preferencias
              </Button>
            </div>
          )}
          <p className="field-hint">Las preferencias se guardan en este navegador.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
