import { useState, useRef } from 'react';
import type { Category, Item, ItemType } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Field, TypeTag } from '../../components/shared';
import { useConfirm } from '../../components/ui/confirm';
import { animateExit } from '../../services/motion';
import { useMotion } from '../preferences/motion';
import { catalogRepository } from '../../repositories/catalog';
export function ItemEditor({
  item,
  categories,
  onSaved,
  run,
}: {
  item: Item;
  categories: Category[];
  onSaved: () => Promise<void>;
  run: (action: () => Promise<void>, message: string) => Promise<void>;
}) {
  const motion = useMotion(),
    row = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(item.name),
    [type, setType] = useState(item.type),
    [categoryId, setCategoryId] = useState(item.categoryId),
    confirm = useConfirm();
  return (
    <div className="admin-item" ref={row}>
      <div className="admin-item-info">
        <strong>{item.name}</strong>
        <TypeTag type={item.type} />
        {!item.active && (
          <span className="inactive-label" key={String(item.active)}>
            Inactivo
          </span>
        )}
      </div>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await catalogRepository.updateItem(item.id, { name, type, categoryId });
              setEditing(false);
              await onSaved();
            }, 'Ítem guardado.');
          }}
        >
          <div className="item-edit-grid">
            <Field label="Nombre">
              {(id) => (
                <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />
              )}
            </Field>
            <Field label="Tipo">
              {(id) => (
                <select id={id} value={type} onChange={(e) => setType(e.target.value as ItemType)}>
                  <option value="GOOD">Bueno</option>
                  <option value="BAD">Malo</option>
                </select>
              )}
            </Field>
            <Field label="Categoría">
              {(id) => (
                <select id={id} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? ' (inactiva)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="actions">
            <Button type="submit">Guardar ítem</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="actions compact-actions">
          <Button
            variant="ghost"
            onClick={() => {
              setName(item.name);
              setType(item.type);
              setCategoryId(item.categoryId);
              setEditing(true);
            }}
            aria-label={`Editar ${item.name}`}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              void run(
                async () => {
                  await catalogRepository.updateItem(item.id, { active: !item.active });
                  await onSaved();
                },
                item.active ? 'Ítem desactivado.' : 'Ítem activado.',
              )
            }
            aria-label={`${item.active ? 'Desactivar' : 'Activar'} ${item.name}`}
          >
            {item.active ? 'Desactivar' : 'Activar'}
          </Button>
          <Button
            variant="destructive"
            aria-label={`Eliminar ${item.name}`}
            onClick={async () => {
              if (
                await confirm(
                  `¿Eliminar ${item.name}?`,
                  'Se eliminará del catálogo. Las partidas existentes conservan su copia.',
                  'Eliminar ítem',
                )
              )
                void run(async () => {
                  await catalogRepository.deleteItem(item.id);
                  animateExit(row.current, motion);
                  await onSaved();
                }, 'Ítem eliminado.');
            }}
          >
            Eliminar
          </Button>
        </div>
      )}
    </div>
  );
}
