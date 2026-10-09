import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react';
import type { Category, Item, ItemType } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, description: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id, `${id}-hint`)}
      <div id={`${id}-hint`}>
        {error ? (
          <p className="error-text">{error}</p>
        ) : hint ? (
          <p className="field-hint">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
export function PageHeading({
  title,
  description,
  back,
  children,
}: {
  title: string;
  description?: string;
  back?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      {back && (
        <Link className="back-link" to={back}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver
        </Link>
      )}
      <div className="heading-row">
        <div>
          <h1>{title}</h1>
          {description && <p className="muted">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <Button
          key={o.value}
          variant="ghost"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && <Check size={16} aria-hidden="true" />}
          {o.label}
        </Button>
      ))}
    </div>
  );
}
export function Composition({ good, bad }: { good: number; bad: number }) {
  return (
    <span className="composition">
      <span className="good">{good} buenos</span>
      <span aria-hidden="true"> + </span>
      <span className="bad">{bad} malos</span>
    </span>
  );
}
export function TypeTag({ type }: { type: ItemType }) {
  return (
    <Badge variant={type === 'GOOD' ? 'good' : 'bad'}>
      {type === 'GOOD' ? '✓ Bueno' : '× Malo'}
    </Badge>
  );
}
export function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <Button asChild>
        <Link to="/game/new">Nueva partida</Link>
      </Button>
    </div>
  );
}
export function CategoryCard({ category, items }: { category: Category; items: Item[] }) {
  const active = items.filter((i) => i.active);
  return (
    <Link className="category-card" to={`/game/new?category=${encodeURIComponent(category.id)}`}>
      <div className="category-card-top">
        <span className="category-emoji" aria-hidden="true">
          {category.emoji || '◇'}
        </span>
        <ArrowUpRight aria-hidden="true" size={22} />
      </div>
      <h2>{category.name}</h2>
      <p className="muted">{category.description || 'Elige tus opciones y prepara la mesa.'}</p>
      <Composition
        good={active.filter((i) => i.type === 'GOOD').length}
        bad={active.filter((i) => i.type === 'BAD').length}
      />
    </Link>
  );
}
