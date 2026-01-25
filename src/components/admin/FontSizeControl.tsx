import React from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type FontSize = 'small' | 'medium' | 'large';

interface FontSizeControlProps {
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
}

const sizes: { key: FontSize; label: string; preview: string }[] = [
  { key: 'small', label: 'Piccolo', preview: 'Aa' },
  { key: 'medium', label: 'Medio', preview: 'Aa' },
  { key: 'large', label: 'Grande', preview: 'Aa' },
];

export const FontSizeControl: React.FC<FontSizeControlProps> = ({
  fontSize,
  onFontSizeChange,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg"
          title="Dimensione testo"
        >
          <Type className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 bg-card border-border z-50">
        {sizes.map((size) => (
          <DropdownMenuItem
            key={size.key}
            onClick={() => onFontSizeChange(size.key)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              fontSize === size.key && "bg-primary/10 text-primary"
            )}
          >
            <span className={cn(
              size.key === 'small' && 'text-xs',
              size.key === 'medium' && 'text-sm',
              size.key === 'large' && 'text-base',
            )}>
              {size.preview}
            </span>
            <span className="text-sm">{size.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
