import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Move, GripVertical } from "lucide-react";

export interface DraggableElementConfig {
  id: string;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  enabled: boolean;
}

interface DraggablePreviewProps {
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundColor?: string;
  elements: DraggableElementConfig[];
  onElementMove: (id: string, x: number, y: number) => void;
  snapToGrid?: boolean;
  gridDivisions?: number; // default 3 (thirds)
  margin?: number; // percentage from edges, default 8
  className?: string;
}

const ELEMENT_STYLES: Record<string, { bg: string; border: string }> = {
  logo: { bg: "bg-primary/90", border: "border-primary" },
  foto: { bg: "bg-secondary/90", border: "border-secondary" },
  qr: { bg: "bg-accent/90", border: "border-accent" },
};

export const DraggablePreview: React.FC<DraggablePreviewProps> = ({
  width,
  height,
  backgroundImage,
  backgroundColor = "hsl(var(--muted))",
  elements,
  onElementMove,
  snapToGrid = true,
  gridDivisions = 3,
  margin = 8,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const gridSize = 100 / gridDivisions;

  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid) return value;
    // Snap to grid lines (0, 33.33, 66.66, 100 for thirds)
    const snapped = Math.round(value / gridSize) * gridSize;
    return Math.max(margin, Math.min(100 - margin, snapped));
  }, [snapToGrid, gridSize, margin]);

  const clampValue = useCallback((value: number): number => {
    return Math.max(margin, Math.min(100 - margin, value));
  }, [margin]);

  const handlePointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element?.enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDragging(elementId);
    setSelectedElement(elementId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clampedX = clampValue(x);
    const clampedY = clampValue(y);
    
    onElementMove(dragging, clampedX, clampedY);
  }, [dragging, clampValue, onElementMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    
    const element = elements.find(el => el.id === dragging);
    if (element && snapToGrid) {
      const snappedX = snapValue(element.x);
      const snappedY = snapValue(element.y);
      onElementMove(dragging, snappedX, snappedY);
    }
    
    setDragging(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [dragging, elements, snapToGrid, snapValue, onElementMove]);

  // Calculate preview dimensions maintaining aspect ratio
  const aspectRatio = width / height;
  const maxPreviewHeight = 320;
  const maxPreviewWidth = 280;
  
  let previewWidth: number;
  let previewHeight: number;
  
  if (aspectRatio > maxPreviewWidth / maxPreviewHeight) {
    previewWidth = maxPreviewWidth;
    previewHeight = previewWidth / aspectRatio;
  } else {
    previewHeight = maxPreviewHeight;
    previewWidth = previewHeight * aspectRatio;
  }

  const enabledElements = elements.filter(el => el.enabled);

  if (enabledElements.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5" />
          Trascina per posizionare
        </span>
        {snapToGrid && (
          <span className="text-primary/70 text-[10px]">Snap attivo</span>
        )}
      </div>

      {/* Preview Container */}
      <div
        ref={containerRef}
        className="relative mx-auto rounded-xl overflow-hidden border-2 border-border shadow-xl cursor-crosshair touch-none select-none"
        style={{
          width: previewWidth,
          height: previewHeight,
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid overlay (visible when dragging) */}
        {dragging && snapToGrid && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Vertical lines */}
            {Array.from({ length: gridDivisions - 1 }).map((_, i) => (
              <div 
                key={`v-${i}`}
                className="absolute top-0 bottom-0 w-px bg-white/30" 
                style={{ left: `${((i + 1) * 100) / gridDivisions}%` }}
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: gridDivisions - 1 }).map((_, i) => (
              <div 
                key={`h-${i}`}
                className="absolute left-0 right-0 h-px bg-white/30" 
                style={{ top: `${((i + 1) * 100) / gridDivisions}%` }}
              />
            ))}
            {/* Safe margin zone */}
            <div 
              className="absolute border border-dashed border-destructive/40 rounded"
              style={{
                top: `${margin}%`,
                left: `${margin}%`,
                right: `${margin}%`,
                bottom: `${margin}%`,
              }}
            />
          </div>
        )}

        {/* Draggable Elements */}
        {enabledElements.map((element) => {
          const styles = ELEMENT_STYLES[element.id] || { bg: "bg-muted", border: "border-muted-foreground" };
          const isSelected = selectedElement === element.id;
          const isDragging = dragging === element.id;
          
          return (
            <div
              key={element.id}
              className={cn(
                "absolute flex items-center justify-center gap-1 rounded-lg border-2 transition-all",
                "cursor-grab active:cursor-grabbing select-none",
                styles.bg, styles.border,
                isSelected && "ring-2 ring-white ring-offset-1 ring-offset-background",
                isDragging && "scale-110 shadow-2xl z-50 opacity-90"
              )}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                transform: "translate(-50%, -50%)",
                padding: "6px 12px",
                minWidth: "70px",
              }}
              onPointerDown={(e) => handlePointerDown(e, element.id)}
              onClick={() => setSelectedElement(element.id)}
            >
              <GripVertical className="w-3 h-3 text-white/60" />
              <span className="text-xs font-semibold text-white drop-shadow-sm whitespace-nowrap">
                {element.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {enabledElements.map((element) => {
          const styles = ELEMENT_STYLES[element.id] || { bg: "bg-muted", border: "border-muted-foreground" };
          return (
            <div
              key={element.id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium",
                styles.bg, "text-white"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
              {element.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper to convert percentage to canvas pixel coordinates
export const percentageToCanvas = (
  percentX: number,
  percentY: number,
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number
): { x: number; y: number } => {
  // Convert percentage to pixel position (centered on the element)
  const x = (percentX / 100) * canvasWidth - elementWidth / 2;
  const y = (percentY / 100) * canvasHeight - elementHeight / 2;
  
  return { x, y };
};
