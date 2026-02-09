import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SongbookSetlistSongItemProps {
  id: string;
  index: number;
  title: string;
  artist: string;
  fileId: string;
  canManage: boolean;
  canFull: boolean;
  onBroadcast: (fileId: string) => void;
  onRemove: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function SongbookSetlistSongItem({
  id,
  index,
  title,
  artist,
  fileId,
  canManage,
  canFull,
  onBroadcast,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SongbookSetlistSongItemProps) {
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
        "flex items-center gap-2 p-3 sm:p-4 bg-muted/30 rounded-xl transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/50 z-50"
      )}
    >
      {/* Drag Handle */}
      {canFull && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 hidden sm:block"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Position Badge */}
      <Badge 
        variant="outline" 
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm shrink-0"
      >
        {index + 1}
      </Badge>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm sm:text-base truncate">{title}</p>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{artist || 'Artista sconosciuto'}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Mobile: Up/Down arrows */}
        {canFull && (
          <div className="flex flex-col gap-0.5 sm:hidden">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={isFirst}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={isLast}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Broadcast button */}
        <Button
          size="sm"
          onClick={() => onBroadcast(fileId)}
          disabled={!canManage || !fileId}
          className="h-9 sm:h-10 px-3 sm:px-4"
        >
          <Play className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Play</span>
        </Button>

        {/* Delete button */}
        {canFull && (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onRemove(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
