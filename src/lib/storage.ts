import type { z } from 'zod';
export const keys = {
  catalog: 'no-escuches:catalog:v1',
  game: 'no-escuches:game:v1',
  preferences: 'no-escuches:preferences:v1',
};
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export class JsonStorage {
  constructor(private getStorage: () => StorageAdapter = () => window.localStorage) {}
  read<T>(key: string, schema: z.ZodType<T>): T | null {
    try {
      const raw = this.getStorage().getItem(key);
      return raw === null ? null : schema.parse(JSON.parse(raw));
    } catch {
      throw new Error(
        'No se pudieron recuperar los datos: el almacenamiento no está disponible o los datos están dañados.',
      );
    }
  }
  write(key: string, value: unknown) {
    try {
      this.getStorage().setItem(key, JSON.stringify(value));
    } catch {
      throw new Error(
        'No se pudo guardar. Tus cambios no se aplicaron. Revisa el almacenamiento del navegador y vuelve a intentar.',
      );
    }
  }
  remove(key: string) {
    try {
      this.getStorage().removeItem(key);
    } catch {
      throw new Error('No se pudo restablecer el almacenamiento.');
    }
  }
}
export const storage = new JsonStorage();
