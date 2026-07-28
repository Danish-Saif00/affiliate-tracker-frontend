import type { ReactNode } from 'react';

type GlassPanelProps = {
  as?: 'article' | 'div' | 'section';
  children: ReactNode;
  className?: string;
};

export function GlassPanel({
  as: Component = 'div',
  children,
  className,
}: GlassPanelProps) {
  return (
    <Component className={`glass-panel specular-panel ${className ?? ''}`}>
      {children}
    </Component>
  );
}
