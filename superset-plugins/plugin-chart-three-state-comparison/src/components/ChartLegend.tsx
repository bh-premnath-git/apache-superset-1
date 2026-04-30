import React from 'react';

interface ChartLegendProps {
  segments: string[];
  colors: Record<string, string>;
  position: 'bottom' | 'right';
  hoveredSegment?: string | null;
  onHoverSegment?: (segment: string | null) => void;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  segments,
  colors,
  position,
  hoveredSegment,
  onHoverSegment,
}) => {
  const isHorizontal = position === 'bottom';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: isHorizontal ? 8 : 4,
        justifyContent: isHorizontal ? 'center' : 'flex-start',
        alignContent: 'center',
        padding: isHorizontal ? '10px 12px' : '12px',
      }}
    >
      {segments.map(segment => {
        const isHovered = hoveredSegment === segment;
        const isDimmed = hoveredSegment != null && !isHovered;
        return (
          <div
            key={segment}
            onMouseEnter={() => onHoverSegment?.(segment)}
            onMouseLeave={() => onHoverSegment?.(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 999,
              background: isHovered ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
              opacity: isDimmed ? 0.55 : 1,
              transition: 'background 120ms ease-out, opacity 120ms ease-out',
              cursor: onHoverSegment ? 'default' : 'default',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                backgroundColor: colors[segment] || '#999',
                borderRadius: '50%',
                boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 0 3px rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                letterSpacing: 0.2,
              }}
            >
              {segment}
            </span>
          </div>
        );
      })}
    </div>
  );
};
