// Adapted from shadcn/ui's new-york badge registry (MIT).
import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
const badgeVariants = cva('type-tag', {
  variants: { variant: { default: '', good: 'good', bad: 'bad' } },
  defaultVariants: { variant: 'default' },
});
type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
