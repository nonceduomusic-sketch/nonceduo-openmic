import React from 'react';
import { cn } from '@/lib/utils';

export type Position = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface PositionGridProps {
  value: Position;
  onChange: (position: Position) => void;
  label: string;
  disabled?: boolean;
}

const POSITIONS: Position[][] = [
  ['top-left', 'top-center', 'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

export const PositionGrid: React.FC<PositionGridProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-3 gap-1 w-fit">
        {POSITIONS.map((row, rowIndex) => (
          row.map((pos) => (
            <button
              key={pos}
              type="button"
              disabled={disabled}
              onClick={() => onChange(pos)}
              className={cn(
                "w-6 h-6 rounded-sm border transition-all duration-150",
                "hover:border-primary hover:bg-primary/10",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                value === pos
                  ? "bg-primary border-primary"
                  : "bg-muted/50 border-muted-foreground/30"
              )}
              title={pos.replace('-', ' ')}
            >
              {value === pos && (
                <div className="w-2 h-2 bg-primary-foreground rounded-full mx-auto" />
              )}
            </button>
          ))
        ))}
      </div>
    </div>
  );
};

// Helper to convert Position to canvas coordinates
export const getPositionCoordinates = (
  position: Position,
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number,
  margin: number = 60
): { x: number; y: number } => {
  let x: number, y: number;

  // Horizontal position
  if (position.includes('left')) {
    x = margin;
  } else if (position.includes('right')) {
    x = canvasWidth - elementWidth - margin;
  } else {
    x = (canvasWidth - elementWidth) / 2;
  }

  // Vertical position
  if (position.includes('top')) {
    y = margin;
  } else if (position.includes('bottom')) {
    y = canvasHeight - elementHeight - margin;
  } else {
    y = (canvasHeight - elementHeight) / 2;
  }

  return { x, y };
};
