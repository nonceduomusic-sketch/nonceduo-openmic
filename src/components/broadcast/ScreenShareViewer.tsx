import React, { useRef, useEffect } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenShareViewerProps {
  stream: MediaStream | null;
  isConnecting: boolean;
  className?: string;
}

export function ScreenShareViewer({ 
  stream, 
  isConnecting,
  className 
}: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  if (isConnecting) {
    return (
      <div className={cn(
        "min-h-screen bg-black flex flex-col items-center justify-center",
        className
      )}>
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
        <p className="text-white/70 text-xl">Connessione in corso...</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className={cn(
        "min-h-screen bg-black flex flex-col items-center justify-center",
        className
      )}>
        <Monitor className="w-16 h-16 text-white/30 mb-4" />
        <p className="text-white/50 text-xl">In attesa dello stream...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-black flex items-center justify-center",
      className
    )}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain max-h-screen"
      />
      
      {/* Overlay indicator */}
      <div className="fixed top-4 right-4 flex items-center gap-2 px-3 py-2 bg-red-600/90 rounded-full text-white text-sm font-medium z-50">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        Screen Share
      </div>
    </div>
  );
}
