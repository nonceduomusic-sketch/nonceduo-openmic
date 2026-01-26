import React, { useState, useRef, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ImagePlus,
  Download,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Globe,
  Palette,
  RefreshCw,
  Check,
  Facebook,
  Upload,
  X,
  Layout,
  Music,
  Type,
  Sparkles,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Brand logo assets
import brandLogoText from '@/assets/brand-logo-text.png';
import brandLogoSplash from '@/assets/brand-logo-splash.png';
import { PositionGrid, Position, getPositionCoordinates, MARGIN_PRESETS } from './PositionGrid';
import { Slider } from '@/components/ui/slider';

type EventType = 'public' | 'private';
type StylePreset = 'minimal' | 'gradient' | 'neon';
type ImageFormat = 'square' | 'portrait' | 'story';
type OverlayPosition = 'bottom' | 'top' | 'center';
type TextSize = 'small' | 'medium' | 'large';

interface EventPosterConfig {
  venueName: string;
  eventDate: Date | undefined;
  eventTime: string;
  eventType: EventType;
  stylePreset: StylePreset;
  imageFormat: ImageFormat;
  overlayPosition: OverlayPosition;
  textSize: TextSize;
  additionalInfo: string;
  uploadedImage: string | null;
  aiTheme: string;
  useBrandLogo: boolean;
  showSplash: boolean;
  fotoPosition: Position;
  logoPosition: Position;
  elementMargin: number;
}

const STORAGE_KEY = 'ncd_poster_generator_config';

const DEFAULT_CONFIG: EventPosterConfig = {
  venueName: '',
  eventDate: undefined,
  eventTime: '',
  eventType: 'public',
  stylePreset: 'neon',
  imageFormat: 'square',
  overlayPosition: 'bottom',
  textSize: 'medium',
  additionalInfo: '',
  uploadedImage: null,
  aiTheme: '',
  useBrandLogo: true,
  showSplash: false,
  fotoPosition: 'middle-center',
  logoPosition: 'bottom-center',
  elementMargin: MARGIN_PRESETS.standard,
};

const STYLE_PRESETS: Record<StylePreset, { label: string; accent: string }> = {
  minimal: {
    label: 'Minimal',
    accent: '#ffffff',
  },
  gradient: {
    label: 'Viola',
    accent: '#a855f7',
  },
  neon: {
    label: 'Neon',
    accent: '#ff2d92',
  },
};

const IMAGE_FORMATS: Record<ImageFormat, { label: string; description: string; width: number; height: number }> = {
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
  story: {
    label: 'Storia 9:16',
    description: 'Storie IG/FB',
    width: 1080,
    height: 1920,
  },
};

const OVERLAY_POSITIONS: Record<OverlayPosition, { label: string; icon: React.ReactNode }> = {
  bottom: { label: 'In basso', icon: <Layout className="w-4 h-4 rotate-180" /> },
  top: { label: 'In alto', icon: <Layout className="w-4 h-4" /> },
  center: { label: 'Centrale', icon: <Type className="w-4 h-4" /> },
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
// IMPORTANT: Exclude uploadedImage from localStorage to avoid quota exceeded errors
const serializeConfig = (config: EventPosterConfig): string => {
  const { uploadedImage, ...configWithoutImage } = config;
  return JSON.stringify({
    ...configWithoutImage,
    eventDate: config.eventDate ? config.eventDate.toISOString() : null,
  });
};

const deserializeConfig = (json: string): EventPosterConfig | null => {
  try {
    const parsed = JSON.parse(json);
    return {
      ...parsed,
      eventDate: parsed.eventDate ? new Date(parsed.eventDate) : undefined,
      uploadedImage: null, // Never restore image from localStorage
    };
  } catch {
    return null;
  }
};

export const EventPosterGeneratorCard: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiGeneratedBg, setAiGeneratedBg] = useState<string | null>(null);
  
  // Load config from localStorage on mount
  const [config, setConfig] = useState<EventPosterConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = deserializeConfig(stored);
      if (parsed) return parsed;
    }
    return DEFAULT_CONFIG;
  });

  // Save config to localStorage on change (excluding images to avoid quota errors)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeConfig(config));
    } catch (e) {
      console.warn('Failed to save config to localStorage:', e);
    }
  }, [config]);

  const updateConfig = useCallback(<K extends keyof EventPosterConfig>(key: K, value: EventPosterConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setPreviewUrl(null);
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setPreviewUrl(null);
    setAiGeneratedBg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: 'Dati resettati',
      description: 'Tutti i campi sono stati svuotati.',
    });
  }, [toast]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'File non valido',
        description: 'Seleziona un file immagine (JPG, PNG, WEBP).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File troppo grande',
        description: 'L\'immagine deve essere inferiore a 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updateConfig('uploadedImage', event.target?.result as string);
      setAiGeneratedBg(null); // Clear AI bg when uploading custom image
    };
    reader.readAsDataURL(file);
  }, [toast, updateConfig]);

  const removeImage = useCallback(() => {
    updateConfig('uploadedImage', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Generate AI background based on theme (or edit existing image)
  const generateAIBackground = useCallback(async () => {
    if (!config.aiTheme.trim()) {
      toast({
        title: 'Tema mancante',
        description: 'Scrivi un tema o istruzioni (es. "migliora lo sfondo", "aggiungi effetto neon"...)',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAI(true);

    try {
      const formatConfig = IMAGE_FORMATS[config.imageFormat];
      
      // If there's an uploaded image, send it for editing
      const sourceImage = config.uploadedImage;
      const hasSourceImage = !!sourceImage;
      
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
          type: 'poster',
          // Pass the uploaded image for editing if available
          sourceImage: sourceImage || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'AI generation failed');
      }
      
      if (data.imageUrl) {
        setAiGeneratedBg(data.imageUrl);
        updateConfig('uploadedImage', null); // Clear uploaded image since we now have AI result
        toast({
          title: hasSourceImage ? 'Immagine modificata!' : 'Sfondo AI generato!',
          description: 'Ora genera la locandina completa.',
        });
      } else {
        throw new Error('No image in response');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Errore generazione AI',
        description: error instanceof Error ? error.message : 'Riprova o carica una foto manualmente.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [config.aiTheme, config.imageFormat, config.uploadedImage, toast, updateConfig]);

  const generatePosterImage = useCallback(async () => {
    const backgroundImage = config.uploadedImage || aiGeneratedBg;
    
    // If no image at all and user has a theme, auto-generate AI background first
    if (!backgroundImage && config.aiTheme.trim()) {
      toast({
        title: 'Generazione sfondo AI...',
        description: 'Attendi qualche secondo.',
      });
      await generateAIBackground();
      return; // The user will click generate again after AI bg is ready
    }
    
    if (!backgroundImage) {
      toast({
        title: 'Sfondo mancante',
        description: 'Scrivi un tema per generare lo sfondo AI, oppure carica una foto.',
        variant: 'destructive',
      });
      return;
    }

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

      // Load and draw the background image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Calculate cover dimensions
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
          resolve();
        };
        img.onerror = reject;
        img.src = backgroundImage;
      });

      // Determine overlay area based on position
      const overlayHeight = config.imageFormat === 'story' ? 500 : (config.imageFormat === 'portrait' ? 400 : 350);
      let overlayY: number;
      
      if (config.overlayPosition === 'top') {
        overlayY = 0;
      } else if (config.overlayPosition === 'center') {
        overlayY = (canvas.height - overlayHeight) / 2;
      } else {
        overlayY = canvas.height - overlayHeight;
      }

      // Draw overlay background
      const overlayGradient = ctx.createLinearGradient(0, overlayY, 0, overlayY + overlayHeight);
      
      if (config.overlayPosition === 'top') {
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        overlayGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
        overlayGradient.addColorStop(1, 'transparent');
      } else if (config.overlayPosition === 'center') {
        overlayGradient.addColorStop(0, 'transparent');
        overlayGradient.addColorStop(0.2, 'rgba(0, 0, 0, 0.8)');
        overlayGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
        overlayGradient.addColorStop(1, 'transparent');
      } else {
        overlayGradient.addColorStop(0, 'transparent');
        overlayGradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      }
      
      ctx.fillStyle = overlayGradient;
      ctx.fillRect(0, overlayY, canvas.width, overlayHeight);

      // Calculate text positions
      const textCenterY = overlayY + overlayHeight / 2;
      const padding = 60;

      ctx.textAlign = 'center';

      // Add accent glow for neon style
      if (config.stylePreset === 'neon') {
        ctx.shadowColor = style.accent;
        ctx.shadowBlur = 20;
      }

      // Text size scale
      const textScale = TEXT_SIZES[config.textSize].scale;
      const baseTitleSize = 56;
      const baseDateSize = 36;
      const scaledTitleSize = Math.round(baseTitleSize * textScale);
      const scaledDateSize = Math.round(baseDateSize * textScale);
      const lineHeight = Math.round(65 * textScale);

      // Draw brand title - logo, text, and/or splash (independent)
      let currentY = textCenterY - 80;
      
      // Draw "Foto" (duo photo) FIRST if enabled - using position grid
      if (config.showSplash) {
        try {
          const fotoImg = new Image();
          await new Promise<void>((resolve, reject) => {
            fotoImg.onload = () => resolve();
            fotoImg.onerror = reject;
            fotoImg.src = brandLogoSplash;
          });
          
          // Calculate proportional size maintaining aspect ratio - MUCH BIGGER for wow effect
          const fotoAspect = fotoImg.width / fotoImg.height;
          const elementMargin = config.elementMargin;
          const maxFotoHeight = config.imageFormat === 'story' 
            ? canvas.height * 0.65 
            : (config.imageFormat === 'portrait' ? canvas.height * 0.6 : canvas.height * 0.55);
          const maxFotoWidth = canvas.width - elementMargin * 2;
          
          let fotoWidth, fotoHeight;
          if (fotoAspect > 1) {
            fotoWidth = Math.min(maxFotoWidth, maxFotoHeight * fotoAspect);
            fotoHeight = fotoWidth / fotoAspect;
          } else {
            fotoHeight = maxFotoHeight;
            fotoWidth = fotoHeight * fotoAspect;
            if (fotoWidth > maxFotoWidth) {
              fotoWidth = maxFotoWidth;
              fotoHeight = fotoWidth / fotoAspect;
            }
          }
          
          // Use position grid for placement with user-defined margin
          const { x: fotoX, y: fotoY } = getPositionCoordinates(
            config.fotoPosition,
            canvas.width,
            canvas.height,
            fotoWidth,
            fotoHeight,
            elementMargin
          );
          
          ctx.globalAlpha = 0.7;
          ctx.drawImage(fotoImg, fotoX, fotoY, fotoWidth, fotoHeight);
          ctx.globalAlpha = 1;
        } catch (e) {
          console.error('Failed to load foto:', e);
        }
      }
      
      // Draw logo OR text based on useBrandLogo - using position grid
      if (config.useBrandLogo) {
        try {
          const logoImg = new Image();
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = reject;
            logoImg.src = brandLogoText;
          });
          
          const logoMaxWidth = 450;
          const logoAspect = logoImg.width / logoImg.height;
          const logoWidth = Math.min(logoMaxWidth, canvas.width - config.elementMargin * 2);
          const logoHeight = logoWidth / logoAspect;
          
          // Use position grid for placement with user-defined margin
          const { x: logoX, y: logoY } = getPositionCoordinates(
            config.logoPosition,
            canvas.width,
            canvas.height,
            logoWidth,
            logoHeight,
            config.elementMargin
          );
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          currentY = logoY + logoHeight + 30;
        } catch (e) {
          console.error('Failed to load logo:', e);
          ctx.font = `bold ${scaledTitleSize}px "Orbitron", sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText("NON C'È DUO", canvas.width / 2, currentY);
          currentY += lineHeight;
        }
      } else {
        // Draw text title
        ctx.font = `bold ${scaledTitleSize}px "Orbitron", sans-serif`;
        ctx.fillStyle = '#ffffff';
        
        ctx.fillText("NON C'È DUO", canvas.width / 2, currentY);
        currentY += lineHeight;
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw venue name as subtitle - OPTIONAL
      if (config.venueName) {
        const venueSize = Math.round(scaledTitleSize * 0.5);
        ctx.font = `500 ${venueSize}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
        // Word wrap
        const maxWidth = canvas.width - padding * 2;
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
        
        const venueLineHeight = Math.round(lineHeight * 0.55);
        lines.forEach((line, i) => {
          ctx.fillText(`@ ${line}`, canvas.width / 2, currentY + i * venueLineHeight);
        });
        
        currentY += lines.length * venueLineHeight + 15;
      }

      // Draw date and time if provided - OPTIONAL
      if (config.eventDate || config.eventTime) {
        let dateTimeText = '';
        
        if (config.eventDate) {
          const formattedDate = format(config.eventDate, "d MMMM", { locale: it });
          dateTimeText = formattedDate.toUpperCase();
        }
        
        if (config.eventTime) {
          dateTimeText += dateTimeText ? ` • ORE ${config.eventTime}` : `ORE ${config.eventTime}`;
        }
        
        ctx.font = `600 ${scaledDateSize}px "Inter", sans-serif`;
        ctx.fillStyle = style.accent;
        
        if (config.stylePreset === 'neon') {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 15;
        }
        
        ctx.fillText(dateTimeText, canvas.width / 2, currentY);
        currentY += 50;
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Draw event type badge if private - OPTIONAL
      if (config.eventType === 'private') {
        const badgeText = 'EVENTO PRIVATO';
        ctx.font = '500 24px "Inter", sans-serif';
        const badgeWidth = ctx.measureText(badgeText).width + 60;
        
        ctx.fillStyle = 'rgba(255, 45, 146, 0.3)';
        ctx.beginPath();
        ctx.roundRect(
          canvas.width / 2 - badgeWidth / 2 - 10,
          currentY - 20,
          badgeWidth + 20,
          45,
          22
        );
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 45, 146, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = style.accent;
        ctx.fillText(`🔒 ${badgeText}`, canvas.width / 2, currentY + 8);
        currentY += 55;
      }

      // Draw additional info if provided - OPTIONAL
      if (config.additionalInfo) {
        ctx.font = '400 24px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
        const maxWidth = canvas.width - padding * 2;
        const words = config.additionalInfo.split(' ');
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
        
        lines.slice(0, 3).forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, currentY + 15 + i * 32);
        });
      }

      // Draw branding at bottom (only for bottom/center positions)
      if (config.overlayPosition !== 'top') {
        ctx.font = '500 28px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText("NON C'È DUO • LIVE", canvas.width / 2, canvas.height - 35);
      } else {
        ctx.font = '500 28px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText("NON C'È DUO • LIVE", canvas.width / 2, 50);
      }

      // Generate preview URL
      const url = canvas.toDataURL('image/png');
      setPreviewUrl(url);

      toast({
        title: 'Locandina generata!',
        description: 'Ora puoi scaricarla o rigenerarla.',
      });
    } catch (error) {
      console.error('Error generating poster image:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile generare la locandina.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [config, aiGeneratedBg, toast, generateAIBackground]);

  const downloadImage = useCallback(async () => {
    if (!previewUrl) return;

    const formatConfig = IMAGE_FORMATS[config.imageFormat];
    const dateStr = config.eventDate ? format(config.eventDate, 'yyyy-MM-dd') : 'evento';
    const nameStr = config.venueName ? config.venueName.toLowerCase().replace(/\s+/g, '-') : 'locandina';
    const fileName = `poster-${nameStr}-${dateStr}-${formatConfig.width}x${formatConfig.height}.png`;
    
    try {
      // Convert base64 to blob for better mobile compatibility
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = fileName;
      link.href = blobUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast({
        title: 'Download avviato',
        description: 'La locandina è stata scaricata.',
      });
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab for manual save
      window.open(previewUrl, '_blank');
      toast({
        title: 'Aperto in nuova scheda',
        description: 'Tieni premuto sull\'immagine per salvarla.',
      });
    }
  }, [previewUrl, config, toast]);

  const hasBackground = config.uploadedImage || aiGeneratedBg;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImagePlus className="w-5 h-5 text-emerald-400" />
            Locandina Evento
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
          Carica una foto come sfondo, poi aggiungi i dettagli.
          Tutti i campi di testo sono opzionali!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4" />
            Carica Foto
            <span className="text-xs text-muted-foreground">(alternativo all'AI)</span>
          </Label>
          
          {config.uploadedImage ? (
            <div className="relative">
              <img
                src={config.uploadedImage}
                alt="Uploaded preview"
                className="w-full h-40 object-cover rounded-xl border border-border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clicca per caricare
              </span>
              <span className="text-xs text-muted-foreground/60">
                JPG, PNG, WEBP • Max 10MB
              </span>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
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
                  <RadioGroupItem value={fmt} id={`fmt-${fmt}`} className="peer sr-only" />
                  <Label
                    htmlFor={`fmt-${fmt}`}
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
          <Label>Posizione Testo</Label>
          <RadioGroup
            value={config.overlayPosition}
            onValueChange={(value) => updateConfig('overlayPosition', value as OverlayPosition)}
            className="grid grid-cols-3 gap-2"
          >
            {(Object.keys(OVERLAY_POSITIONS) as OverlayPosition[]).map((pos) => {
              const posConfig = OVERLAY_POSITIONS[pos];
              return (
                <div key={pos}>
                  <RadioGroupItem value={pos} id={`pos-${pos}`} className="peer sr-only" />
                  <Label
                    htmlFor={`pos-${pos}`}
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
                  <RadioGroupItem value={size} id={`size-${size}`} className="peer sr-only" />
                  <Label
                    htmlFor={`size-${size}`}
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

        {/* Brand Elements (Independent) with Position Controls */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Elementi Brand</p>
          
          {/* Margin Slider - Professional spacing control */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Margini elementi</Label>
              <span className="text-xs font-medium text-muted-foreground">{config.elementMargin}px</span>
            </div>
            <Slider
              value={[config.elementMargin]}
              onValueChange={(v) => updateConfig('elementMargin', v[0])}
              min={MARGIN_PRESETS.compact}
              max={MARGIN_PRESETS.ultra}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>Compatto</span>
              <span>Standard</span>
              <span>Spazioso</span>
              <span>Ultra</span>
            </div>
          </div>
          
          {/* Logo Toggle + Position */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="poster-use-brand-logo" className="flex items-center gap-2 cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                <span>Logo Scritta</span>
              </Label>
              <Switch
                id="poster-use-brand-logo"
                checked={config.useBrandLogo}
                onCheckedChange={(checked) => updateConfig('useBrandLogo', checked)}
              />
            </div>
            {config.useBrandLogo && (
              <div className="flex items-start gap-4 pl-6">
                <PositionGrid
                  value={config.logoPosition}
                  onChange={(pos) => updateConfig('logoPosition', pos)}
                  label="Posizione Logo"
                />
              </div>
            )}
          </div>
          
          {/* Foto Toggle + Position */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="poster-show-splash" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4" />
                <span>Foto</span>
              </Label>
              <Switch
                id="poster-show-splash"
                checked={config.showSplash}
                onCheckedChange={(checked) => updateConfig('showSplash', checked)}
              />
            </div>
            {config.showSplash && (
              <div className="flex items-start gap-4 pl-6">
                <PositionGrid
                  value={config.fotoPosition}
                  onChange={(pos) => updateConfig('fotoPosition', pos)}
                  label="Posizione Foto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Venue Name (Optional - shown as subtitle under band name) */}
        <div className="space-y-2">
          <Label htmlFor="poster-venue" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Locale / Evento
            <span className="text-xs text-muted-foreground">(sottotitolo)</span>
          </Label>
          <Input
            id="poster-venue"
            placeholder="Es. Bar Roma, Matrimonio Rossi..."
            value={config.venueName}
            onChange={(e) => updateConfig('venueName', e.target.value)}
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            Apparirà sotto il logo/titolo come @NOME LOCALE
          </p>
        </div>

        {/* Date & Time Row (Optional) */}
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
                    format(config.eventDate, "d MMM", { locale: it })
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
            <Label htmlFor="poster-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Orario
              <span className="text-xs text-muted-foreground">(opz.)</span>
            </Label>
            <Input
              id="poster-time"
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
              <RadioGroupItem value="public" id="poster-public" className="peer sr-only" />
              <Label
                htmlFor="poster-public"
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  "border-muted hover:border-muted-foreground/50",
                  config.eventType === 'public' && "border-green-500 bg-green-500/10"
                )}
              >
                <Globe className={cn(
                  "w-4 h-4",
                  config.eventType === 'public' ? "text-green-500" : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium">Pubblico</span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="private" id="poster-private" className="peer sr-only" />
              <Label
                htmlFor="poster-private"
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  "border-muted hover:border-muted-foreground/50",
                  config.eventType === 'private' && "border-pink-500 bg-pink-500/10"
                )}
              >
                <Lock className={cn(
                  "w-4 h-4",
                  config.eventType === 'private' ? "text-pink-500" : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium">Privato</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Style Preset */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Accento Colore
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
                  <RadioGroupItem value={preset} id={`poster-${preset}`} className="peer sr-only" />
                  <Label
                    htmlFor={`poster-${preset}`}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      "border-muted hover:border-muted-foreground/50",
                      config.stylePreset === preset && "border-primary bg-primary/10"
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-white/30"
                      style={{ backgroundColor: presetStyle.accent }}
                    />
                    <span className="text-xs font-medium">{presetStyle.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Additional Info */}
        <div className="space-y-2">
          <Label htmlFor="poster-info" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Info Aggiuntive
            <span className="text-xs text-muted-foreground">(opzionale)</span>
          </Label>
          <Textarea
            id="poster-info"
            placeholder="Es. Ingresso libero, Aperitivo dalle 19:00, Dress code elegante..."
            value={config.additionalInfo}
            onChange={(e) => updateConfig('additionalInfo', e.target.value)}
            className="bg-muted/50 resize-none"
            rows={2}
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={generatePosterImage}
          disabled={!hasBackground || isGenerating}
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
              Rigenera Locandina
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              Genera Locandina
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
                alt="Poster preview"
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
