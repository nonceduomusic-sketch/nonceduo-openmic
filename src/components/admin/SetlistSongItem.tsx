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
        "flex flex-col gap-2 p-3 bg-muted/30 rounded-xl transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/50 z-50"
      )}
    >
      {/* Top row: drag handle + position + song info */}
      <div className="flex items-center gap-2">
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
        <Badge variant="outline" className="w-7 h-7 flex items-center justify-center rounded-full text-xs shrink-0">
          {index + 1}
        </Badge>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm sm:text-base truncate">{title}</p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{artist}</p>
        </div>

        {/* Mobile: Up/Down arrows */}
        {canFull && (
          <div className="flex flex-col gap-0.5 sm:hidden shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onMoveUp}
              disabled={isFirst}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onMoveDown}
              disabled={isLast}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom row: action buttons — full width */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        {/* Broadcast button */}
        <Button
          size="sm"
          onClick={() => onBroadcast(songId)}
          disabled={!canManage}
          className="flex-1 h-10 text-sm"
        >
          <Play className="w-4 h-4 mr-1.5" />
          Play
        </Button>

        {/* Delete button */}
        {canFull && (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm text-destructive hover:text-destructive"
            onClick={() => onRemove(id)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Rimuovi
          </Button>
        )}
      </div>
    </div>
  );
}
