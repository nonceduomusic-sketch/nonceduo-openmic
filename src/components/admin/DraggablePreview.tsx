import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Move, Lock, Unlock } from "lucide-react";

export interface DraggableElement {
  id: string;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  enabled: boolean;
  locked?: boolean;
}

interface DraggablePreviewProps {
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundColor?: string;
  elements: DraggableElement[];
  onElementMove: (id: string, x: number, y: number) => void;
  onElementToggleLock?: (id: string) => void;
  snapToGrid?: boolean;
  gridSize?: number; // percentage, default 33.33 (thirds)
  margin?: number; // percentage from edges, default 8
  className?: string;
}

const ELEMENT_COLORS: Record<string, string> = {
  logo: "bg-primary/80 border-primary",
  foto: "bg-secondary/80 border-secondary",
  qr: "bg-accent/80 border-accent",
  testo: "bg-muted-foreground/80 border-muted-foreground",
};

export const DraggablePreview: React.FC<DraggablePreviewProps> = ({
  width,
  height,
  backgroundImage,
  backgroundColor = "#1a1a2e",
  elements,
  onElementMove,
  onElementToggleLock,
  snapToGrid = true,
  gridSize = 33.33,
  margin = 8,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid) return value;
    const snapped = Math.round(value / gridSize) * gridSize;
    return Math.max(margin, Math.min(100 - margin, snapped));
  }, [snapToGrid, gridSize, margin]);

  const clampValue = useCallback((value: number): number => {
    return Math.max(margin, Math.min(100 - margin, value));
  }, [margin]);

  const handlePointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element?.enabled || element.locked) return;
    
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

  const aspectRatio = width / height;
  const previewHeight = 300;
  const previewWidth = previewHeight * aspectRatio;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Move className="w-3 h-3" />
          Trascina gli elementi per posizionarli
        </span>
        {snapToGrid && (
          <span className="text-primary/70">Snap ai terzi attivo</span>
        )}
      </div>

      {/* Preview Container */}
      <div
        ref={containerRef}
        className="relative mx-auto rounded-lg overflow-hidden border-2 border-border shadow-lg cursor-crosshair touch-none"
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
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical lines */}
            <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/20" />
            <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/20" />
            {/* Horizontal lines */}
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/20" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/20" />
            {/* Margin zone */}
            <div 
              className="absolute border border-dashed border-red-400/30"
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
        {elements.filter(el => el.enabled).map((element) => {
          const colorClass = ELEMENT_COLORS[element.id] || "bg-white/80 border-white";
          const isSelected = selectedElement === element.id;
          const isDragging = dragging === element.id;
          
          return (
            <div
              key={element.id}
              className={cn(
                "absolute flex items-center justify-center rounded-md border-2 transition-all cursor-grab active:cursor-grabbing select-none",
                colorClass,
                isSelected && "ring-2 ring-white ring-offset-1",
                isDragging && "scale-110 shadow-xl z-50",
                element.locked && "opacity-50 cursor-not-allowed"
              )}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                transform: "translate(-50%, -50%)",
                minWidth: "60px",
                minHeight: "28px",
                padding: "4px 8px",
              }}
              onPointerDown={(e) => handlePointerDown(e, element.id)}
              onClick={() => setSelectedElement(element.id)}
            >
              <span className="text-xs font-medium text-white drop-shadow-md whitespace-nowrap">
                {element.label}
              </span>
              {element.locked && (
                <Lock className="w-3 h-3 ml-1 text-white/70" />
              )}
            </div>
          );
        })}
      </div>

      {/* Element List with Lock Toggle */}
      <div className="flex flex-wrap gap-2 justify-center">
        {elements.filter(el => el.enabled).map((element) => {
          const isSelected = selectedElement === element.id;
          return (
            <button
              key={element.id}
              onClick={() => {
                if (onElementToggleLock) {
                  onElementToggleLock(element.id);
                }
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-all",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {element.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {element.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
