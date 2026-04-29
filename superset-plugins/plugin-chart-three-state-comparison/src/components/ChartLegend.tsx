import React from 'react';

interface ChartLegendProps {
  segments: string[];
  colors: Record<string, string>;
  position: 'bottom' | 'right';
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  segments,
  colors,
  position,
}) => {
  const isHorizontal = position === 'bottom';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: isHorizontal ? 16 : 6,
        justifyContent: isHorizontal ? 'center' : 'flex-start',
        padding: '8px 12px',
      }}
    >
      {segments.map(segment => (
        <div
          key={segment}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              backgroundColor: colors[segment] || '#999',
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#445066' }}>
            {segment}
          </span>
        </div>
      ))}
    </div>
  );
};
