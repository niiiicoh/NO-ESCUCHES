import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';
type Ask = (title: string, description: string, action?: string) => Promise<boolean>;
const Context = createContext<Ask>(async () => false);
export const useConfirm = () => useContext(Context);
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{
    title: string;
    description: string;
    action: string;
  } | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null),
    trigger = useRef<HTMLElement | null>(null);
  const ask: Ask = (title, description, action = 'Confirmar') =>
    new Promise((resolve) => {
      trigger.current = document.activeElement as HTMLElement;
      resolver.current = resolve;
      setRequest({ title, description, action });
    });
  function finish(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }
  return (
    <Context.Provider value={ask}>
      {children}
      <AlertDialog.Root
        open={!!request}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content
            className="dialog-content"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              trigger.current?.focus();
            }}
          >
            <AlertDialog.Title asChild>
              <h2>{request?.title}</h2>
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <p className="muted">{request?.description}</p>
            </AlertDialog.Description>
            <div className="actions">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" onClick={() => finish(false)}>
                  Cancelar
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={() => finish(true)}>{request?.action}</Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Context.Provider>
  );
}
