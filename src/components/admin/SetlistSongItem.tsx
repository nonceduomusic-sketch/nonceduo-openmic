import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SetlistSongItemProps {
  id: string;
  index: number;
  title: string;
  artist: string;
  songId: string;
  canManage: boolean;
  canFull: boolean;
  onBroadcast: (songId: string) => void;
  onRemove: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function SetlistSongItem({
  id,
  index,
  title,
  artist,
  songId,
  canManage,
  canFull,
  onBroadcast,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SetlistSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 bg-muted/30 rounded-lg transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/50 z-50"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1"
        disabled={!canFull}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Position Badge */}
      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0">
        {index + 1}
      </Badge>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{artist}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Mobile: Up/Down arrows */}
        <div className="flex flex-col gap-0.5 sm:hidden">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onMoveUp}
            disabled={isFirst || !canFull}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onMoveDown}
            disabled={isLast || !canFull}
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        {/* Broadcast button */}
        <Button
          size="sm"
          onClick={() => onBroadcast(songId)}
          disabled={!canManage}
        >
          <Play className="w-4 h-4" />
        </Button>

        {/* Delete button */}
        {canFull && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
