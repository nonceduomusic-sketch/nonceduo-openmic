import React, { useState, useRef, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Image as ImageIcon,
  Download,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Globe,
  Palette,
  RefreshCw,
  Check,
  Instagram,
  Layout,
  Sparkles,
  Wand2,
  RotateCcw,
  Type,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type EventType = 'public' | 'private';
type StylePreset = 'minimal' | 'gradient' | 'neon';
type ImageFormat = 'story' | 'square' | 'portrait';
type OverlayPosition = 'bottom' | 'top' | 'center';
type TextSize = 'small' | 'medium' | 'large';

interface EventStoryConfig {
  venueName: string;
  eventDate: Date | undefined;
  eventTime: string;
  eventType: EventType;
  stylePreset: StylePreset;
  imageFormat: ImageFormat;
  overlayPosition: OverlayPosition;
  textSize: TextSize;
  aiTheme: string;
}

const STORAGE_KEY = 'ncd_story_generator_config';

const DEFAULT_CONFIG: EventStoryConfig = {
  venueName: '',
  eventDate: undefined,
  eventTime: '',
  eventType: 'public',
  stylePreset: 'neon',
  imageFormat: 'story',
  overlayPosition: 'center',
  textSize: 'medium',
  aiTheme: '',
};

const STYLE_PRESETS: Record<StylePreset, { label: string; description: string; bg: string; accent: string }> = {
  minimal: {
    label: 'Minimal Scuro',
    description: 'Elegante, moderno',
    bg: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
    accent: '#ffffff',
  },
  gradient: {
    label: 'Gradient Viola',
    description: 'Vivace, accattivante',
    bg: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)',
    accent: '#a855f7',
  },
  neon: {
    label: 'Neon Pink',
    description: 'Stile club/lounge',
    bg: 'linear-gradient(180deg, #0d0d1a 0%, #1a0d1a 50%, #0d0d1a 100%)',
    accent: '#ff2d92',
  },
};

const IMAGE_FORMATS: Record<ImageFormat, { label: string; description: string; width: number; height: number }> = {
  story: {
    label: 'Storia 9:16',
    description: 'Storie IG/FB',
    width: 1080,
    height: 1920,
  },
  square: {
    label: 'Quadrato 1:1',
    description: 'Post IG/FB',
    width: 1080,
    height: 1080,
  },
  portrait: {
    label: 'Verticale 4:5',
    description: 'Feed Instagram',
    width: 1080,
    height: 1350,
  },
};

const OVERLAY_POSITIONS: Record<OverlayPosition, { label: string; icon: React.ReactNode }> = {
  top: { label: 'In alto', icon: <Layout className="w-4 h-4" /> },
  center: { label: 'Centrale', icon: <Layout className="w-4 h-4 rotate-90" /> },
  bottom: { label: 'In basso', icon: <Layout className="w-4 h-4 rotate-180" /> },
};

const TEXT_SIZES: Record<TextSize, { label: string; scale: number }> = {
  small: { label: 'Piccolo', scale: 0.75 },
  medium: { label: 'Medio', scale: 1 },
  large: { label: 'Grande', scale: 1.25 },
};

// AI Theme presets
const AI_THEME_SUGGESTIONS = [
  'matrimonio',
  'evento elegante',
  'sagra paesana',
  'festa estiva',
  'serata jazz',
  'notte latina',
  'aperitivo',
];

// Helper to serialize/deserialize config with Date
const serializeConfig = (config: EventStoryConfig): string => {
  return JSON.stringify({
    ...config,
    eventDate: config.eventDate ? config.eventDate.toISOString() : null,
  });
};

const deserializeConfig = (json: string): EventStoryConfig | null => {
  try {
    const parsed = JSON.parse(json);
    return {
      ...parsed,
      eventDate: parsed.eventDate ? new Date(parsed.eventDate) : undefined,
    };
  } catch {
    return null;
  }
};

export const EventStoryGeneratorCard: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiGeneratedBg, setAiGeneratedBg] = useState<string | null>(null);
  
  // Load config from localStorage on mount
  const [config, setConfig] = useState<EventStoryConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = deserializeConfig(stored);
      if (parsed) return parsed;
    }
    return DEFAULT_CONFIG;
  });

  // Save config to localStorage on change (with error handling to avoid quota errors)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeConfig(config));
    } catch (e) {
      console.warn('Failed to save config to localStorage:', e);
    }
  }, [config]);

  const updateConfig = <K extends keyof EventStoryConfig>(key: K, value: EventStoryConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setPreviewUrl(null);
  };

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setPreviewUrl(null);
    setAiGeneratedBg(null);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: 'Dati resettati',
      description: 'Tutti i campi sono stati svuotati.',
    });
  }, [toast]);

  // Generate AI background based on theme
  const generateAIBackground = useCallback(async () => {
    if (!config.aiTheme.trim()) {
      toast({
        title: 'Tema mancante',
        description: 'Scrivi un tema (es. matrimonio, sagra, jazz...)',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAI(true);

    try {
      const formatConfig = IMAGE_FORMATS[config.imageFormat];
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-event-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          theme: config.aiTheme,
          width: formatConfig.width,
          height: formatConfig.height,
          type: 'story',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'AI generation failed');
      }
      
      if (data.imageUrl) {
        setAiGeneratedBg(data.imageUrl);
        toast({
          title: 'Sfondo AI generato!',
          description: 'Ora genera la grafica completa.',
        });
      } else {
        throw new Error('No image in response');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Errore generazione AI',
        description: error instanceof Error ? error.message : 'Riprova o usa lo stile predefinito.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [config.aiTheme, config.imageFormat, toast]);

  const generateStoryImage = useCallback(async () => {
    setIsGenerating(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const formatConfig = IMAGE_FORMATS[config.imageFormat];
      canvas.width = formatConfig.width;
      canvas.height = formatConfig.height;

      const style = STYLE_PRESETS[config.stylePreset];
      
      // If AI background exists, use it
      if (aiGeneratedBg) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // Cover the canvas
            const imgRatio = img.width / img.height;
            const canvasRatio = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imgRatio > canvasRatio) {
              drawHeight = canvas.height;
              drawWidth = drawHeight * imgRatio;
              drawX = (canvas.width - drawWidth) / 2;
              drawY = 0;
            } else {
              drawWidth = canvas.width;
              drawHeight = drawWidth / imgRatio;
              drawX = 0;
              drawY = (canvas.height - drawHeight) / 2;
            }
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            
            // Add dark overlay for text readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            resolve();
          };
          img.onerror = reject;
          img.src = aiGeneratedBg;
        });
      } else {
        // Draw default gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (config.stylePreset === 'minimal') {
          gradient.addColorStop(0, '#0a0a0a');
          gradient.addColorStop(1, '#1a1a1a');
        } else if (config.stylePreset === 'gradient') {
          gradient.addColorStop(0, '#1a0a2e');
          gradient.addColorStop(0.5, '#16213e');
          gradient.addColorStop(1, '#0f3460');
        } else {
          gradient.addColorStop(0, '#0d0d1a');
          gradient.addColorStop(0.5, '#1a0d1a');
          gradient.addColorStop(1, '#0d0d1a');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle noise/texture overlay
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 5000; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
          ctx.fillRect(x, y, 1, 1);
        }
        ctx.globalAlpha = 1;

        // Add glow effects for neon style
        if (config.stylePreset === 'neon') {
          const glowY = config.imageFormat === 'story' ? canvas.height * 0.3 : canvas.height * 0.4;
          const glowGradient = ctx.createRadialGradient(
            canvas.width / 2, glowY, 0,
            canvas.width / 2, glowY, 400
          );
          glowGradient.addColorStop(0, 'rgba(255, 45, 146, 0.15)');
          glowGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Adjust sizing based on format and text scale
      const isCompact = config.imageFormat !== 'story';
      const textScale = TEXT_SIZES[config.textSize].scale;
      const titleSize = Math.round((isCompact ? 56 : 72) * textScale);
      const dateSize = Math.round((isCompact ? 38 : 48) * textScale);
      const timeSize = Math.round((isCompact ? 32 : 42) * textScale);
      const badgeSize = Math.round((isCompact ? 26 : 32) * textScale);
      const pinTitleSize = Math.round((isCompact ? 28 : 36) * textScale);
      const pinBoxSize = Math.round((isCompact ? 48 : 64) * textScale);
      const subtitleSize = Math.round((isCompact ? 22 : 28) * textScale);
      const footerSize = Math.round((isCompact ? 20 : 24) * textScale);
      const lineHeight = Math.round((isCompact ? 70 : 90) * textScale);

      // Calculate vertical positions based on format and overlay position
      let titleStartY: number;
      if (config.overlayPosition === 'top') {
        titleStartY = isCompact ? canvas.height * 0.1 : 200;
      } else if (config.overlayPosition === 'bottom') {
        titleStartY = isCompact ? canvas.height * 0.5 : canvas.height - 700;
      } else {
        titleStartY = isCompact ? canvas.height * 0.2 : 380;
      }

      ctx.textAlign = 'center';

      // Draw venue name (main title) - OPTIONAL
      let currentY = titleStartY;
      if (config.venueName) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px "Orbitron", sans-serif`;
        
        if (config.stylePreset === 'neon' && !aiGeneratedBg) {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 30;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
        
        // Word wrap venue name
        const maxWidth = canvas.width - 120;
        const words = config.venueName.toUpperCase().split(' ');
        let lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, currentY + i * lineHeight);
        });

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Draw decorative line
        const lineY = currentY + lines.length * lineHeight + (isCompact ? 40 : 60);
        const lineGradient = ctx.createLinearGradient(200, lineY, canvas.width - 200, lineY);
        lineGradient.addColorStop(0, 'transparent');
        lineGradient.addColorStop(0.3, style.accent);
        lineGradient.addColorStop(0.7, style.accent);
        lineGradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(200, lineY);
        ctx.lineTo(canvas.width - 200, lineY);
        ctx.stroke();
        
        currentY = lineY + (isCompact ? 70 : 100);
      }

      // Draw date - OPTIONAL
      if (config.eventDate) {
        const formattedDate = format(config.eventDate, "EEEE d MMMM", { locale: it });
        const formattedDateUpper = formattedDate.toUpperCase();
        
        ctx.font = `600 ${dateSize}px "Orbitron", sans-serif`;
        ctx.fillStyle = style.accent;
        if (config.stylePreset === 'neon' && !aiGeneratedBg) {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 20;
        }
        ctx.fillText(formattedDateUpper, canvas.width / 2, currentY);
        currentY += isCompact ? 50 : 70;
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      
      // Draw time - OPTIONAL
      if (config.eventTime) {
        ctx.font = `500 ${timeSize}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`ORE ${config.eventTime}`, canvas.width / 2, currentY);
        currentY += isCompact ? 80 : 110;
      }

      // Draw event type badge
      const badgeY = currentY + (isCompact ? 30 : 50);
      const badgeText = config.eventType === 'public' ? 'EVENTO PUBBLICO' : 'EVENTO PRIVATO';
      const badgeIcon = config.eventType === 'public' ? '🌐' : '🔒';
      
      ctx.font = `600 ${badgeSize}px "Inter", sans-serif`;
      const badgeWidth = ctx.measureText(badgeText).width + 100;
      
      ctx.fillStyle = config.eventType === 'public' 
        ? 'rgba(34, 197, 94, 0.2)' 
        : 'rgba(255, 45, 146, 0.2)';
      ctx.beginPath();
      ctx.roundRect(
        canvas.width / 2 - badgeWidth / 2 - 20,
        badgeY - 35,
        badgeWidth + 40,
        70,
        35
      );
      ctx.fill();
      
      ctx.strokeStyle = config.eventType === 'public' 
        ? 'rgba(34, 197, 94, 0.5)' 
        : 'rgba(255, 45, 146, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = config.eventType === 'public' ? '#22c55e' : style.accent;
      ctx.fillText(`${badgeIcon}  ${badgeText}`, canvas.width / 2, badgeY + 12);

      // Draw secret PIN teaser section
      const pinSectionY = isCompact 
        ? canvas.height - (config.imageFormat === 'square' ? 320 : 380)
        : canvas.height - 650;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, pinSectionY - 40, canvas.width - 200, isCompact ? 200 : 280, 20);
      ctx.stroke();

      ctx.font = `700 ${pinTitleSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = style.accent;
      if (config.stylePreset === 'neon' && !aiGeneratedBg) {
        ctx.shadowColor = style.accent;
        ctx.shadowBlur = 15;
      }
      ctx.fillText('🎵 CODICE SEGRETO 🎵', canvas.width / 2, pinSectionY + 30);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      ctx.font = `800 ${pinBoxSize}px "Orbitron", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('? ? ? ?', canvas.width / 2, pinSectionY + (isCompact ? 90 : 120));
      
      ctx.font = `400 ${subtitleSize}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('Scoprilo partecipando all\'evento!', canvas.width / 2, pinSectionY + (isCompact ? 140 : 190));

      // Draw private event CTA if applicable (only for story format)
      if (config.eventType === 'private' && config.imageFormat === 'story') {
        const ctaY = canvas.height - 320;
        
        ctx.font = '500 28px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Per informazioni e accrediti:', canvas.width / 2, ctaY);
        
        ctx.font = '700 36px "Inter", sans-serif';
        ctx.fillStyle = style.accent;
        if (config.stylePreset === 'neon' && !aiGeneratedBg) {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 15;
        }
        ctx.fillText('Scrivici su Instagram 📩', canvas.width / 2, ctaY + 60);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Draw footer branding
      ctx.font = `400 ${footerSize}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('NONCE DUO • LIVE MUSIC', canvas.width / 2, canvas.height - (isCompact ? 40 : 100));

      const url = canvas.toDataURL('image/png');
      setPreviewUrl(url);

      toast({
        title: 'Grafica generata!',
        description: 'Ora puoi scaricarla o rigenerarla.',
      });
    } catch (error) {
      console.error('Error generating story image:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile generare la grafica.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [config, aiGeneratedBg, toast]);

  const downloadImage = useCallback(() => {
    if (!previewUrl) return;

    const formatConfig = IMAGE_FORMATS[config.imageFormat];
    const nameStr = config.venueName ? config.venueName.toLowerCase().replace(/\s+/g, '-') : 'grafica';
    const dateStr = config.eventDate ? format(config.eventDate, 'yyyy-MM-dd') : 'evento';
    
    const link = document.createElement('a');
    link.download = `story-${nameStr}-${dateStr}-${formatConfig.width}x${formatConfig.height}.png`;
    link.href = previewUrl;
    link.click();

    toast({
      title: 'Download avviato',
      description: 'La grafica è stata scaricata.',
    });
  }, [previewUrl, config, toast]);

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Instagram className="w-5 h-5 text-pink-400" />
            Grafica Storia Evento
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConfig}
            className="text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
        <CardDescription>
          Genera una grafica professionale per social. Tutti i campi sono opzionali.
          Usa l'AI per generare uno sfondo a tema!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Theme Generator - NEW */}
        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Genera Sfondo AI a Tema
            <span className="text-xs text-muted-foreground">(opzionale)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Es. matrimonio, sagra, jazz, elegante..."
              value={config.aiTheme}
              onChange={(e) => updateConfig('aiTheme', e.target.value)}
              className="bg-background/50 flex-1"
            />
            <Button
              onClick={generateAIBackground}
              disabled={isGeneratingAI || !config.aiTheme.trim()}
              variant="secondary"
              className="gap-2 shrink-0"
            >
              {isGeneratingAI ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Genera
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AI_THEME_SUGGESTIONS.map((theme) => (
              <button
                key={theme}
                onClick={() => updateConfig('aiTheme', theme)}
                className={cn(
                  "text-xs px-2 py-1 rounded-full border transition-colors",
                  config.aiTheme === theme
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                    : "border-border hover:border-purple-500/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {theme}
              </button>
            ))}
          </div>
          {aiGeneratedBg && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <Check className="w-3 h-3" />
              Sfondo AI pronto! Genera la grafica.
            </div>
          )}
        </div>

        {/* Image Format */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Formato Immagine
          </Label>
          <RadioGroup
            value={config.imageFormat}
            onValueChange={(value) => {
              updateConfig('imageFormat', value as ImageFormat);
              setAiGeneratedBg(null); // Reset AI bg when format changes
            }}
            className="grid grid-cols-3 gap-2"
          >
            {(Object.keys(IMAGE_FORMATS) as ImageFormat[]).map((fmt) => {
              const fmtConfig = IMAGE_FORMATS[fmt];
              return (
                <div key={fmt}>
                  <RadioGroupItem value={fmt} id={`story-fmt-${fmt}`} className="peer sr-only" />
                  <Label
                    htmlFor={`story-fmt-${fmt}`}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-center",
                      "border-muted hover:border-muted-foreground/50",
                      config.imageFormat === fmt && "border-primary bg-primary/10"
                    )}
                  >
                    <span className="text-xs font-medium">{fmtConfig.label}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtConfig.description}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Overlay Position */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Posizione Testo
          </Label>
          <RadioGroup
            value={config.overlayPosition}
            onValueChange={(value) => updateConfig('overlayPosition', value as OverlayPosition)}
            className="grid grid-cols-3 gap-2"
          >
            {(Object.keys(OVERLAY_POSITIONS) as OverlayPosition[]).map((pos) => {
              const posConfig = OVERLAY_POSITIONS[pos];
              return (
                <div key={pos}>
                  <RadioGroupItem value={pos} id={`story-pos-${pos}`} className="peer sr-only" />
                  <Label
                    htmlFor={`story-pos-${pos}`}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      "border-muted hover:border-muted-foreground/50",
                      config.overlayPosition === pos && "border-primary bg-primary/10"
                    )}
                  >
                    {posConfig.icon}
                    <span className="text-xs">{posConfig.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Text Size */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Dimensione Testo
          </Label>
          <RadioGroup
            value={config.textSize}
            onValueChange={(value) => updateConfig('textSize', value as TextSize)}
            className="grid grid-cols-3 gap-2"
          >
            {(Object.keys(TEXT_SIZES) as TextSize[]).map((size) => {
              const sizeConfig = TEXT_SIZES[size];
              return (
                <div key={size}>
                  <RadioGroupItem value={size} id={`story-size-${size}`} className="peer sr-only" />
                  <Label
                    htmlFor={`story-size-${size}`}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      "border-muted hover:border-muted-foreground/50",
                      config.textSize === size && "border-primary bg-primary/10"
                    )}
                  >
                    <span className="text-xs">{sizeConfig.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Venue Name - OPTIONAL */}
        <div className="space-y-2">
          <Label htmlFor="venue-name" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Nome del Locale
            <span className="text-xs text-muted-foreground">(opzionale)</span>
          </Label>
          <Input
            id="venue-name"
            placeholder="Es. Bar Roma, Club XYZ..."
            value={config.venueName}
            onChange={(e) => updateConfig('venueName', e.target.value)}
            className="bg-muted/50"
          />
        </div>

        {/* Date & Time Row - OPTIONAL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data
              <span className="text-xs text-muted-foreground">(opz.)</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-muted/50",
                    !config.eventDate && "text-muted-foreground"
                  )}
                >
                  {config.eventDate ? (
                    format(config.eventDate, "d MMM yyyy", { locale: it })
                  ) : (
                    <span>Seleziona...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={config.eventDate}
                  onSelect={(date) => updateConfig('eventDate', date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Orario
              <span className="text-xs text-muted-foreground">(opz.)</span>
            </Label>
            <Input
              id="event-time"
              type="time"
              value={config.eventTime}
              onChange={(e) => updateConfig('eventTime', e.target.value)}
              className="bg-muted/50"
            />
          </div>
        </div>

        {/* Event Type */}
        <div className="space-y-3">
          <Label>Tipologia Evento</Label>
          <RadioGroup
            value={config.eventType}
            onValueChange={(value) => updateConfig('eventType', value as EventType)}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem value="public" id="story-public" className="peer sr-only" />
              <Label
                htmlFor="story-public"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  "border-muted hover:border-muted-foreground/50",
                  config.eventType === 'public' && "border-green-500 bg-green-500/10"
                )}
              >
                <Globe className={cn(
                  "w-6 h-6",
                  config.eventType === 'public' ? "text-green-500" : "text-muted-foreground"
                )} />
                <span className="font-medium">Pubblico</span>
                <span className="text-xs text-muted-foreground text-center">
                  Aperto a tutti
                </span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="private" id="story-private" className="peer sr-only" />
              <Label
                htmlFor="story-private"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  "border-muted hover:border-muted-foreground/50",
                  config.eventType === 'private' && "border-pink-500 bg-pink-500/10"
                )}
              >
                <Lock className={cn(
                  "w-6 h-6",
                  config.eventType === 'private' ? "text-pink-500" : "text-muted-foreground"
                )} />
                <span className="font-medium">Privato</span>
                <span className="text-xs text-muted-foreground text-center">
                  Solo su richiesta
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Style Preset - Only shown if NO AI background */}
        {!aiGeneratedBg && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Stile Grafico
            </Label>
            <RadioGroup
              value={config.stylePreset}
              onValueChange={(value) => updateConfig('stylePreset', value as StylePreset)}
              className="grid grid-cols-3 gap-2"
            >
              {(Object.keys(STYLE_PRESETS) as StylePreset[]).map((preset) => {
                const presetStyle = STYLE_PRESETS[preset];
                return (
                  <div key={preset}>
                    <RadioGroupItem value={preset} id={`story-style-${preset}`} className="peer sr-only" />
                    <Label
                      htmlFor={`story-style-${preset}`}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                        "border-muted hover:border-muted-foreground/50",
                        config.stylePreset === preset && "border-primary bg-primary/10"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg border border-white/20"
                        style={{ background: presetStyle.bg }}
                      >
                        <div className="w-full h-full rounded-lg flex items-center justify-center">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: presetStyle.accent }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-center">{presetStyle.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateStoryImage}
          disabled={isGenerating}
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generazione...
            </>
          ) : previewUrl ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Rigenera Grafica
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Genera Grafica
            </>
          )}
        </Button>

        {/* Preview & Download */}
        {previewUrl && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Anteprima
              </span>
              <Button
                onClick={downloadImage}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Scarica PNG
              </Button>
            </div>
            
            <div className={cn(
              "relative mx-auto rounded-xl overflow-hidden border border-border bg-black",
              config.imageFormat === 'story' && "aspect-[9/16] max-h-[400px]",
              config.imageFormat === 'portrait' && "aspect-[4/5] max-h-[350px]",
              config.imageFormat === 'square' && "aspect-square max-h-[300px]"
            )}>
              <img
                src={previewUrl}
                alt="Story preview"
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Formato: {IMAGE_FORMATS[config.imageFormat].width}×{IMAGE_FORMATS[config.imageFormat].height}px
            </p>
          </div>
        )}

        {/* Hidden canvas for generation */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};
