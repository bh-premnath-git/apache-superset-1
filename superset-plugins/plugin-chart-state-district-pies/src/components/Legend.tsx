import React from 'react';

export interface LegendProps {
  categories: string[];
  colorFor: (category: string) => string;
}

export function Legend({ categories, colorFor }: LegendProps) {
  if (!categories.length) return null;
  return (
    <div
      className="sdp-legend"
      role="list"
      aria-label="Pie category legend"
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        padding: '4px 8px',
        background: 'rgba(255,255,255,0.9)',
        borderRadius: 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        fontSize: 11,
        color: '#222',
      }}
    >
      {categories.map(category => (
        <span
          key={category}
          role="listitem"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: colorFor(category),
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
            }}
          />
          {category}
        </span>
      ))}
    </div>
  );
}
