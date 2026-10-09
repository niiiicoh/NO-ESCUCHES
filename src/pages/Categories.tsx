import { useState } from 'react';
import { CategoryCard, PageHeading } from '../components/shared';
import { Input } from '../components/ui/input';
import { useAppStore } from '../features/game/store';
export function Categories() {
  const catalog = useAppStore((s) => s.catalog),
    [query, setQuery] = useState('');
  const categories =
    catalog?.categories.filter(
      (c) => c.active && c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ) ?? [];
  return (
    <>
      <PageHeading
        title="Elige tu problema."
        description="Temáticas listas para llevar a la mesa."
      />
      <label className="search-label" htmlFor="category-search">
        Buscar categorías
      </label>
      <Input
        id="category-search"
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pizza, batido, isla…"
      />
      <div className="category-grid">
        {categories.map((c) => (
          <CategoryCard
            key={c.id}
            category={c}
            items={catalog!.items.filter((i) => i.categoryId === c.id)}
          />
        ))}
      </div>
      {!categories.length && (
        <p className="panel muted">
          No hay categorías activas con ese nombre. Puedes crear una temática personalizada en Nueva
          partida.
        </p>
      )}
    </>
  );
}
