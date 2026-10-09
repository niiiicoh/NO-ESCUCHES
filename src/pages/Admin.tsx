import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Copy, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '../features/game/store';
import { catalogRepository } from '../repositories/catalog';
import { useAuth } from '../services/auth';
import { useConfirm } from '../components/ui/confirm';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Composition, Field, PageHeading, Empty } from '../components/shared';
import { ItemEditor } from '../features/admin/ItemEditor';
import type { ItemType } from '../types';
import { emitEffect } from '../services/events';
import { audioService } from '../services/audio';
import { useMotion } from '../features/preferences/motion';
import { animateExit } from '../services/motion';
function useAdminActions() {
  const refresh = useAppStore((s) => s.refreshCatalog),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  async function run(action: () => Promise<void>, message: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    void audioService.unlock();
    try {
      await action();
      await refresh();
      setNotice(message);
      emitEffect(
        message.toLocaleLowerCase().includes('eliminad') ? 'CATALOG_DELETE' : 'CATALOG_SAVE',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      emitEffect('REJECT');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { run, notice, error, busy, refresh };
}
export function Admin() {
  const motion = useMotion();
  const catalog = useAppStore((s) => s.catalog),
    auth = useAuth(),
    actions = useAdminActions(),
    navigate = useNavigate(),
    confirm = useConfirm();
  const [query, setQuery] = useState(''),
    [name, setName] = useState(''),
    [emoji, setEmoji] = useState(''),
    [description, setDescription] = useState('');
  if (!auth.isAdmin)
    return <Empty title="Sin acceso" description="La administración requiere acceso habilitado." />;
  return (
    <>
      <PageHeading
        title="Detrás del juego."
        description="Administración local · acceso de demostración"
      />
      <div className="admin-layout">
        <section>
          <Field label="Buscar categorías">
            {(id) => (
              <Input
                id={id}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            )}
          </Field>
          <fieldset disabled={actions.busy} className="admin-list">
            {catalog?.categories
              .filter((c) => c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
              .map((c) => {
                const all = catalog.items.filter((i) => i.categoryId === c.id),
                  active = all.filter((i) => i.active);
                return (
                  <article className="admin-category panel" key={c.id}>
                    <div className="between">
                      <span className="category-emoji" aria-hidden="true">
                        {c.emoji || '◇'}
                      </span>
                      <span className={c.active ? 'active-label' : 'inactive-label'}>
                        {c.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h2>{c.name}</h2>
                    <p className="muted">{c.description}</p>
                    <Composition
                      good={active.filter((i) => i.type === 'GOOD').length}
                      bad={active.filter((i) => i.type === 'BAD').length}
                    />
                    <p className="field-hint">{all.length - active.length} ítems inactivos</p>
                    <div className="actions">
                      <Button asChild variant="secondary">
                        <Link to={`/admin/categories/${c.id}`}>
                          Editar
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          void actions.run(async () => {
                            const copy = await catalogRepository.duplicateCategory(c.id);
                            navigate(`/admin/categories/${copy.id}`);
                          }, 'Categoría duplicada. Puedes cambiar su nombre.')
                        }
                      >
                        <Copy size={16} aria-hidden="true" />
                        Duplicar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          void actions.run(
                            () => catalogRepository.updateCategory(c.id, { active: !c.active }),
                            'Estado actualizado.',
                          )
                        }
                      >
                        {c.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async (e) => {
                          const card = e.currentTarget.closest<HTMLElement>('.admin-category');
                          if (
                            await confirm(
                              `¿Eliminar ${c.name}?`,
                              `También se eliminarán sus ${all.length} ítems del catálogo. Las partidas existentes conservarán sus copias.`,
                              'Eliminar categoría',
                            )
                          )
                            void actions.run(async () => {
                              await catalogRepository.deleteCategory(c.id);
                              animateExit(card, motion);
                            }, 'Categoría eliminada.');
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </article>
                );
              })}
            {!catalog?.categories.length && (
              <p className="panel muted">
                No tienes categorías. Crea una y añade sus primeros ítems.
              </p>
            )}
          </fieldset>
        </section>
        <aside>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              void actions.run(async () => {
                const c = await catalogRepository.createCategory({ name, emoji, description });
                navigate(`/admin/categories/${c.id}`);
              }, 'Categoría creada. Añade sus primeros ítems.');
            }}
          >
            <h2>Una nueva temática</h2>
            <fieldset disabled={actions.busy}>
              <Field label="Nombre">
                {(id) => (
                  <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required />
                )}
              </Field>
              <Field label="Emoji (opcional)">
                {(id) => <Input id={id} value={emoji} onChange={(e) => setEmoji(e.target.value)} />}
              </Field>
              <Field label="Descripción (opcional)">
                {(id) => (
                  <textarea
                    id={id}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" className="full">
                <Plus size={18} aria-hidden="true" />
                Crear categoría
              </Button>
            </fieldset>
          </form>
          <div role="status">
            {actions.notice && <p className="notice">{actions.notice}</p>}
            {actions.error && <p className="notice error-notice">{actions.error}</p>}
          </div>
          <p className="field-hint">
            Cambios guardados en este navegador. El acceso de demostración no tiene protección real.
          </p>
        </aside>
      </div>
    </>
  );
}
export function AdminCategory() {
  const { id } = useParams(),
    catalog = useAppStore((s) => s.catalog),
    category = catalog?.categories.find((c) => c.id === id);
  if (!category)
    return (
      <Empty
        title="Categoría no disponible."
        description="Vuelve a Admin para seleccionar o crear una categoría."
      />
    );
  return <CategoryEditor key={category.id} categoryId={category.id} />;
}
function CategoryEditor({ categoryId }: { categoryId: string }) {
  const catalog = useAppStore((s) => s.catalog)!,
    category = catalog.categories.find((c) => c.id === categoryId)!,
    actions = useAdminActions(),
    auth = useAuth();
  const [name, setName] = useState(category.name),
    [emoji, setEmoji] = useState(category.emoji),
    [description, setDescription] = useState(category.description ?? ''),
    [query, setQuery] = useState(''),
    [itemName, setItemName] = useState(''),
    [type, setType] = useState<ItemType>('GOOD');
  const items = catalog.items.filter(
    (i) =>
      i.categoryId === categoryId && i.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  if (!auth.isAdmin)
    return <Empty title="Sin acceso" description="La administración requiere acceso habilitado." />;
  return (
    <>
      <PageHeading
        title={category.name}
        description="Administración local · acceso de demostración"
        back="/admin"
      />
      <div role="status">
        {actions.notice && <p className="notice">{actions.notice}</p>}
        {actions.error && <p className="notice error-notice">{actions.error}</p>}
      </div>
      <fieldset disabled={actions.busy}>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void actions.run(
              () => catalogRepository.updateCategory(categoryId, { name, emoji, description }),
              'Categoría guardada.',
            );
          }}
        >
          <h2>La temática</h2>
          <div className="two-columns">
            <Field label="Nombre de la categoría">
              {(id) => (
                <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />
              )}
            </Field>
            <Field label="Emoji">
              {(id) => <Input id={id} value={emoji} onChange={(e) => setEmoji(e.target.value)} />}
            </Field>
          </div>
          <Field label="Descripción">
            {(id) => (
              <textarea
                id={id}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit">Guardar categoría</Button>
        </form>
        <div className="admin-items-layout">
          <section className="panel">
            <div className="between">
              <h2>Los ítems</h2>
              <span className="muted">
                {catalog.items.filter((i) => i.categoryId === categoryId).length} en total
              </span>
            </div>
            <Field label="Buscar ítems">
              {(id) => <Input id={id} value={query} onChange={(e) => setQuery(e.target.value)} />}
            </Field>
            {items.map((item) => (
              <ItemEditor
                key={item.id}
                item={item}
                categories={catalog.categories}
                run={actions.run}
                onSaved={actions.refresh}
              />
            ))}
            {!items.length && (
              <p className="muted">
                {query
                  ? 'No hay ítems con ese nombre.'
                  : 'Esta categoría aún no tiene ítems. Añade uno bueno o malo.'}
              </p>
            )}
          </section>
          <form
            className="panel new-item-form"
            onSubmit={(e) => {
              e.preventDefault();
              void actions.run(async () => {
                await catalogRepository.createItem({ categoryId, name: itemName, type });
                setItemName('');
              }, 'Ítem añadido.');
            }}
          >
            <h2>Añadir un ítem</h2>
            <Field label="Nombre del ítem">
              {(id) => (
                <Input
                  id={id}
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              )}
            </Field>
            <Field label="Clasificación">
              {(id) => (
                <select id={id} value={type} onChange={(e) => setType(e.target.value as ItemType)}>
                  <option value="GOOD">Bueno</option>
                  <option value="BAD">Malo</option>
                </select>
              )}
            </Field>
            <Button type="submit" className="full">
              <Plus size={18} aria-hidden="true" />
              Añadir ítem
            </Button>
          </form>
        </div>
      </fieldset>
    </>
  );
}
