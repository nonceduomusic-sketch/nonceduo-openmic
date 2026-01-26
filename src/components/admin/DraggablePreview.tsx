import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Move, Check, Image, QrCode, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DraggableElementConfig {
  id: string;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  enabled: boolean; // Whether element will be rendered in final image
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
  freePositioning?: boolean; // When true, allows free positioning without snap
  className?: string;
}

// Icon mapping for element types
const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  logo: <Type className="w-3.5 h-3.5" />,
  foto: <Image className="w-3.5 h-3.5" />,
  qr: <QrCode className="w-3.5 h-3.5" />,
};

// Premium color scheme - subtle, professional
const ELEMENT_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  logo: { 
    bg: "from-violet-500/90 to-purple-600/90", 
    border: "border-violet-400/50",
    glow: "shadow-violet-500/30"
  },
  foto: { 
    bg: "from-rose-500/90 to-pink-600/90", 
    border: "border-rose-400/50",
    glow: "shadow-rose-500/30"
  },
  qr: { 
    bg: "from-emerald-500/90 to-teal-600/90", 
    border: "border-emerald-400/50",
    glow: "shadow-emerald-500/30"
  },
};

export const DraggablePreview: React.FC<DraggablePreviewProps> = ({
  width,
  height,
  backgroundImage,
  backgroundColor = "hsl(var(--muted))",
  elements,
  onElementMove,
  snapToGrid = false, // Default to free positioning
  gridDivisions = 3,
  margin = 8,
  freePositioning = true, // Default to free positioning
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  const gridSize = 100 / gridDivisions;

  // Snap to nearest grid intersection (only when snapToGrid is true and freePositioning is false)
  const snapValue = useCallback((value: number): number => {
    const clamped = Math.max(margin, Math.min(100 - margin, value));
    if (freePositioning || !snapToGrid) return clamped;
    const snapped = Math.round(clamped / gridSize) * gridSize;
    return Math.max(margin, Math.min(100 - margin, snapped));
  }, [snapToGrid, gridSize, margin, freePositioning]);

  const clampValue = useCallback((value: number): number => {
    return Math.max(margin, Math.min(100 - margin, value));
  }, [margin]);

  // Touch-friendly drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(elementId);
    setSelectedElement(elementId);
    setShowGrid(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Live position update (clamped but not snapped during drag)
    onElementMove(dragging, clampValue(x), clampValue(y));
  }, [dragging, clampValue, onElementMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    
    // Final snap on release
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const finalX = snapValue(rawX);
    const finalY = snapValue(rawY);
    
    onElementMove(dragging, finalX, finalY);
    
    setDragging(null);
    setShowGrid(false);
    
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Already released
    }
  }, [dragging, snapValue, onElementMove]);

  // Calculate preview dimensions maintaining aspect ratio
  const aspectRatio = width / height;
  const maxPreviewHeight = 280;
  const maxPreviewWidth = 240;
  
  let previewWidth: number;
  let previewHeight: number;
  
  if (aspectRatio > maxPreviewWidth / maxPreviewHeight) {
    previewWidth = maxPreviewWidth;
    previewHeight = previewWidth / aspectRatio;
  } else {
    previewHeight = maxPreviewHeight;
    previewWidth = previewHeight * aspectRatio;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Move className="w-3 h-3 text-primary" />
          </div>
          <span className="font-medium">Trascina per posizionare</span>
        </div>
        <AnimatePresence>
          {showGrid && !freePositioning && snapToGrid && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Snap attivo
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview Canvas */}
      <div className="flex justify-center">
        <motion.div
          ref={containerRef}
          className={cn(
            "relative rounded-2xl overflow-hidden",
            "ring-1 ring-border/50",
            "shadow-2xl shadow-black/20",
            "touch-none select-none",
            dragging && "ring-2 ring-primary/50"
          )}
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
          animate={{ scale: dragging ? 1.02 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Gradient overlay for better visibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

          {/* Grid overlay - visible during drag when snap is enabled */}
          <AnimatePresence>
            {showGrid && snapToGrid && !freePositioning && (
              <motion.div 
                className="absolute inset-0 pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Vertical grid lines */}
                {Array.from({ length: gridDivisions - 1 }).map((_, i) => (
                  <motion.div 
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 w-px"
                    style={{ 
                      left: `${((i + 1) * 100) / gridDivisions}%`,
                      background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), transparent)'
                    }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05 }}
                  />
                ))}
                {/* Horizontal grid lines */}
                {Array.from({ length: gridDivisions - 1 }).map((_, i) => (
                  <motion.div 
                    key={`h-${i}`}
                    className="absolute left-0 right-0 h-px"
                    style={{ 
                      top: `${((i + 1) * 100) / gridDivisions}%`,
                      background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)'
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.05 }}
                  />
                ))}
                
                {/* Safe zone indicator */}
                <div 
                  className="absolute border border-dashed border-white/20 rounded-lg"
                  style={{
                    top: `${margin}%`,
                    left: `${margin}%`,
                    right: `${margin}%`,
                    bottom: `${margin}%`,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Snap intersection dots - show when dragging with snap enabled */}
          <AnimatePresence>
            {showGrid && snapToGrid && !freePositioning && (
              <motion.div 
                className="absolute inset-0 pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: gridDivisions + 1 }).map((_, row) => (
                  Array.from({ length: gridDivisions + 1 }).map((_, col) => {
                    const x = (col * 100) / gridDivisions;
                    const y = (row * 100) / gridDivisions;
                    // Skip corners outside safe zone
                    if (x < margin || x > 100 - margin || y < margin || y > 100 - margin) return null;
                    
                    return (
                      <motion.div
                        key={`dot-${row}-${col}`}
                        className="absolute w-2 h-2 rounded-full bg-white/60 -translate-x-1 -translate-y-1"
                        style={{ left: `${x}%`, top: `${y}%` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (row + col) * 0.02, type: "spring" }}
                      />
                    );
                  })
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Draggable Elements */}
          {elements.map((element) => {
            const colors = ELEMENT_COLORS[element.id] || ELEMENT_COLORS.logo;
            const icon = ELEMENT_ICONS[element.id];
            const isSelected = selectedElement === element.id;
            const isDragging = dragging === element.id;
            const isDisabled = !element.enabled;
            
            return (
              <motion.div
                key={element.id}
                className={cn(
                  "absolute flex items-center gap-1.5 px-3 py-2 rounded-xl",
                  "cursor-grab active:cursor-grabbing",
                  "backdrop-blur-md",
                  `bg-gradient-to-r ${colors.bg}`,
                  `border ${colors.border}`,
                  isSelected && "ring-2 ring-white/80 ring-offset-2 ring-offset-transparent",
                  isDragging && `shadow-xl ${colors.glow}`,
                  isDisabled && "opacity-40 border-dashed"
                )}
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  x: "-50%",
                  y: "-50%",
                  zIndex: isDragging ? 50 : isSelected ? 40 : 30,
                }}
                animate={{
                  scale: isDragging ? 1.15 : isSelected ? 1.05 : 1,
                  boxShadow: isDragging 
                    ? "0 20px 40px rgba(0,0,0,0.3)" 
                    : isSelected 
                      ? "0 10px 20px rgba(0,0,0,0.2)" 
                      : "0 4px 12px rgba(0,0,0,0.15)"
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onPointerDown={(e) => handlePointerDown(e, element.id)}
                onClick={() => setSelectedElement(element.id)}
              >
                {/* Icon */}
                <span className="text-white/90">
                  {icon}
                </span>
                
                {/* Label */}
                <span className="text-xs font-semibold text-white tracking-wide">
                  {element.label}
                </span>
                
                {/* Status indicator */}
                {isDisabled ? (
                  <span className="text-[9px] text-white/50 uppercase tracking-wider ml-0.5">off</span>
                ) : (
                  <Check className="w-3 h-3 text-white/70 ml-0.5" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Element Legend - Apple-style pills */}
      <div className="flex flex-wrap gap-2 justify-center px-2">
        {elements.map((element) => {
          const colors = ELEMENT_COLORS[element.id] || ELEMENT_COLORS.logo;
          const icon = ELEMENT_ICONS[element.id];
          const isSelected = selectedElement === element.id;
          
          return (
            <motion.button
              key={element.id}
              type="button"
              onClick={() => setSelectedElement(element.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                "transition-all duration-200",
                "border",
                isSelected 
                  ? `bg-gradient-to-r ${colors.bg} text-white border-transparent shadow-lg`
                  : element.enabled
                    ? "bg-background/80 text-foreground border-border hover:border-primary/50"
                    : "bg-muted/30 text-muted-foreground border-border/50"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={cn(
                isSelected ? "text-white/90" : element.enabled ? "text-primary" : "text-muted-foreground"
              )}>
                {icon}
              </span>
              <span>{element.label}</span>
              {!element.enabled && (
                <span className="text-[9px] opacity-50 uppercase">off</span>
              )}
            </motion.button>
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
  const x = (percentX / 100) * canvasWidth - elementWidth / 2;
  const y = (percentY / 100) * canvasHeight - elementHeight / 2;
  return { x, y };
};
