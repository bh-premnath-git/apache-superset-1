import React from 'react';

interface PercentLabelProps {
  x: number;
  y: number;
  percentage: number;
  decimals: number;
  color?: string;
  fontSize?: number;
}

/** SVG text element showing a formatted percentage value. */
export const PercentLabel: React.FC<PercentLabelProps> = ({
  x,
  y,
  percentage,
  decimals,
  color = '#333',
  fontSize = 12,
}) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    dominantBaseline="middle"
    fill={color}
    fontSize={fontSize}
    fontWeight={600}
    style={{ pointerEvents: 'none' }}
  >
    {`${percentage.toFixed(decimals)}%`}
  </text>
);
