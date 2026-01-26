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
  QrCode,
  ImagePlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

// Brand logo assets
import brandLogoText from '@/assets/brand-logo-text.png';
import brandLogoSplash from '@/assets/brand-logo-splash.png';
import { PositionGrid, Position, getPositionCoordinates, MARGIN_PRESETS, PercentPosition, positionToPercent, percentToCanvas } from './PositionGrid';
import { Slider } from '@/components/ui/slider';
import { DraggablePreview, DraggableElementConfig } from './DraggablePreview';

type EventType = 'public' | 'private';
type StylePreset = 'minimal' | 'gradient' | 'neon';
type ImageFormat = 'story' | 'square' | 'portrait';
type OverlayPosition = 'bottom' | 'top' | 'center';
type TextSize = 'small' | 'medium' | 'large';
type QrSize = 'small' | 'medium' | 'large';
type QrPosition = 'left' | 'center' | 'right';
type QrDestination = 'app' | 'openmic' | 'dediche';

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
  showQrCode: boolean;
  qrSize: QrSize;
  qrPosition: QrPosition;
  qrDestination: QrDestination;
  additionalInfo: string;
  useBrandLogo: boolean;
  showSplash: boolean;
  // Percentage-based positions for drag & drop (0-100)
  fotoPos: PercentPosition;
  logoPos: PercentPosition;
  qrPos: PercentPosition;
  elementMargin: number;
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
  showQrCode: false,
  qrSize: 'medium',
  qrPosition: 'center',
  qrDestination: 'app',
  additionalInfo: '',
  useBrandLogo: true,
  showSplash: false,
  // Default positions: logo top-center, foto center, qr bottom-center
  fotoPos: { x: 50, y: 50 },
  logoPos: { x: 50, y: 16.67 },
  qrPos: { x: 50, y: 83.33 },
  elementMargin: MARGIN_PRESETS.standard,
};

const QR_SIZES: Record<QrSize, { label: string; scale: number }> = {
  small: { label: 'Piccolo', scale: 1 },
  medium: { label: 'Medio', scale: 1.6 },
  large: { label: 'Grande', scale: 2.2 },
};

const QR_POSITIONS: Record<QrPosition, { label: string }> = {
  left: { label: 'Sinistra' },
  center: { label: 'Centro' },
  right: { label: 'Destra' },
};

const QR_DESTINATIONS: Record<QrDestination, { label: string; path: string; cta: string }> = {
  app: { label: 'App (Hub)', path: '/app', cta: 'Scegli il formato!' },
  openmic: { label: 'Open Mic', path: '/app/openmic', cta: 'Prenota la tua canzone!' },
  dediche: { label: 'Dediche', path: '/app/dediche', cta: 'Invia una dedica!' },
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
    // Merge with DEFAULT_CONFIG to ensure new fields have fallback values
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      eventDate: parsed.eventDate ? new Date(parsed.eventDate) : undefined,
      // Ensure position objects exist with valid defaults
      fotoPos: parsed.fotoPos ?? DEFAULT_CONFIG.fotoPos,
      logoPos: parsed.logoPos ?? DEFAULT_CONFIG.logoPos,
      qrPos: parsed.qrPos ?? DEFAULT_CONFIG.qrPos,
      elementMargin: parsed.elementMargin ?? DEFAULT_CONFIG.elementMargin,
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

      // Draw brand title - logo, text, and/or splash (independent)
      let currentY = titleStartY;
      
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
          const maxFotoHeight = isCompact 
            ? canvas.height * 0.55 
            : canvas.height * 0.60;
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
          
          // Use percentage-based positioning for drag & drop
          const { x: fotoX, y: fotoY } = percentToCanvas(
            config.fotoPos.x,
            config.fotoPos.y,
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
          
          const logoMaxWidth = isCompact ? 500 : 700;
          const logoAspect = logoImg.width / logoImg.height;
          const logoWidth = Math.min(logoMaxWidth, canvas.width - config.elementMargin * 2);
          const logoHeight = logoWidth / logoAspect;
          
          // Use percentage-based positioning for drag & drop
          const { x: logoX, y: logoY } = percentToCanvas(
            config.logoPos.x,
            config.logoPos.y,
            canvas.width,
            canvas.height,
            logoWidth,
            logoHeight,
            config.elementMargin
          );
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          currentY = logoY + logoHeight + (isCompact ? 30 : 50);
        } catch (e) {
          console.error('Failed to load logo:', e);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${titleSize}px "Orbitron", sans-serif`;
          ctx.fillText("NON C'È DUO", canvas.width / 2, currentY);
          currentY += lineHeight;
        }
      } else {
        // Draw text title
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px "Orbitron", sans-serif`;
        
        if (config.stylePreset === 'neon' && !aiGeneratedBg) {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 30;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
        
        ctx.fillText("NON C'È DUO", canvas.width / 2, currentY);
        currentY += lineHeight;
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Draw venue name as subtitle - OPTIONAL
      if (config.venueName) {
        const venueSize = Math.round(titleSize * 0.55);
        ctx.font = `500 ${venueSize}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
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

        const venueLineHeight = Math.round(lineHeight * 0.6);
        lines.forEach((line, i) => {
          ctx.fillText(`@ ${line}`, canvas.width / 2, currentY + i * venueLineHeight);
        });

        currentY += lines.length * venueLineHeight + (isCompact ? 20 : 30);
      }

      // Draw decorative line
      const lineY = currentY + (isCompact ? 20 : 30);
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
      
      currentY = lineY + (isCompact ? 50 : 80);

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

      // Draw secret PIN teaser OR QR code section
      // Calculate QR size first to determine section height
      const baseQrSize = isCompact ? 100 : 140;
      const sizeScale = config.showQrCode ? QR_SIZES[config.qrSize].scale : 1;
      const qrSize = Math.round(baseQrSize * sizeScale);
      
      // Dynamic section height based on QR size
      const sectionHeight = config.showQrCode 
        ? qrSize + (isCompact ? 120 : 140) // QR + text below
        : (isCompact ? 200 : 280);
      
      // Position section from bottom, accounting for footer and additional info
      const footerSpace = isCompact ? 100 : 180;
      const pinSectionY = canvas.height - footerSpace - sectionHeight;
      
      // Draw section border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, pinSectionY - 20, canvas.width - 200, sectionHeight + 40, 20);
      ctx.stroke();

      if (config.showQrCode) {
        // Generate and draw QR code
        const baseUrl = 'https://nonceduo-openmic.lovable.app';
        const appUrl = baseUrl + QR_DESTINATIONS[config.qrDestination].path;
        
        try {
          // Generate QR at higher resolution for quality, then draw scaled
          const qrDataUrl = await QRCode.toDataURL(appUrl, {
            width: 256, // High res source
            margin: 1,
            color: {
              dark: '#ffffff',
              light: '#00000000', // transparent background
            },
          });
          
          const qrImg = new Image();
          await new Promise<void>((resolve, reject) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = reject;
            qrImg.src = qrDataUrl;
          });
          
          // Use percentage-based positioning for drag & drop
          const { x: qrX, y: qrY } = percentToCanvas(
            config.qrPos.x,
            config.qrPos.y,
            canvas.width,
            canvas.height,
            qrSize,
            qrSize,
            config.elementMargin
          );
          
          // QR background circle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.beginPath();
          ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, qrSize / 2 + 20, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          
          // Text below QR - position relative to QR
          const textX = qrX + qrSize / 2;
          const textStartY = qrY + qrSize + 40;
          
          ctx.textAlign = 'center';
          
          ctx.font = `600 ${pinTitleSize}px "Orbitron", sans-serif`;
          ctx.fillStyle = style.accent;
          if (config.stylePreset === 'neon' && !aiGeneratedBg) {
            ctx.shadowColor = style.accent;
            ctx.shadowBlur = 15;
          }
          ctx.fillText('📱 SCANSIONA IL QR', textX, textStartY);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          const destCta = QR_DESTINATIONS[config.qrDestination].cta;
          ctx.font = `400 ${subtitleSize}px "Inter", sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(`${destCta} (PIN richiesto)`, textX, textStartY + 35);
          
          ctx.textAlign = 'center';
        } catch (qrError) {
          console.error('QR generation error:', qrError);
          // Fallback to text if QR fails
          ctx.font = `700 ${pinTitleSize}px "Orbitron", sans-serif`;
          ctx.fillStyle = style.accent;
          ctx.fillText('🎵 CODICE SEGRETO 🎵', canvas.width / 2, pinSectionY + 30);
        }
      } else {
        // Original PIN teaser
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
      }

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

      // Draw additional info if provided (above footer)
      const additionalInfoText = config.additionalInfo || '';
      if (additionalInfoText.trim()) {
        const infoY = canvas.height - (isCompact ? 80 : 160);
        ctx.font = `500 ${subtitleSize}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        
        // Word wrap additional info
        const maxInfoWidth = canvas.width - 160;
        const infoWords = additionalInfoText.split(' ');
        let infoLines: string[] = [];
        let currentInfoLine = '';
        
        for (const word of infoWords) {
          const testLine = currentInfoLine ? `${currentInfoLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxInfoWidth && currentInfoLine) {
            infoLines.push(currentInfoLine);
            currentInfoLine = word;
          } else {
            currentInfoLine = testLine;
          }
        }
        if (currentInfoLine) infoLines.push(currentInfoLine);
        
        // Draw max 2 lines
        const linesToDraw = infoLines.slice(0, 2);
        linesToDraw.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, infoY - (linesToDraw.length - 1 - i) * 35);
        });
      }

      // Draw footer branding
      const brandingSize = isCompact ? 28 : 36;
      ctx.font = `500 ${brandingSize}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText("NON C'È DUO • LIVE", canvas.width / 2, canvas.height - (isCompact ? 40 : 100));

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

  const downloadImage = useCallback(async () => {
    if (!previewUrl) return;

    const formatConfig = IMAGE_FORMATS[config.imageFormat];
    const nameStr = config.venueName ? config.venueName.toLowerCase().replace(/\s+/g, '-') : 'grafica';
    const dateStr = config.eventDate ? format(config.eventDate, 'yyyy-MM-dd') : 'evento';
    const fileName = `story-${nameStr}-${dateStr}-${formatConfig.width}x${formatConfig.height}.png`;
    
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
        description: 'La grafica è stata scaricata.',
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
          Genera una grafica professionale per storie. Tutti i campi sono opzionali.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

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

        {/* Brand Elements with Drag & Drop Preview */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Elementi Brand</p>
          
          {/* Element Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
              <Label htmlFor="use-brand-logo" className="flex items-center gap-2 cursor-pointer text-sm">
                <ImagePlus className="w-4 h-4 text-primary" />
                Logo
              </Label>
              <Switch
                id="use-brand-logo"
                checked={config.useBrandLogo}
                onCheckedChange={(checked) => updateConfig('useBrandLogo', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
              <Label htmlFor="show-splash" className="flex items-center gap-2 cursor-pointer text-sm">
                <Sparkles className="w-4 h-4 text-secondary" />
                Foto
              </Label>
              <Switch
                id="show-splash"
                checked={config.showSplash}
                onCheckedChange={(checked) => updateConfig('showSplash', checked)}
              />
            </div>
          </div>

          {/* Draggable Preview */}
          {(config.useBrandLogo || config.showSplash || config.showQrCode) && (
            <DraggablePreview
              width={IMAGE_FORMATS[config.imageFormat].width}
              height={IMAGE_FORMATS[config.imageFormat].height}
              backgroundImage={aiGeneratedBg || undefined}
              backgroundColor="hsl(var(--muted))"
              elements={[
                { id: 'logo', label: 'Logo', x: config.logoPos.x, y: config.logoPos.y, enabled: config.useBrandLogo },
                { id: 'foto', label: 'Foto', x: config.fotoPos.x, y: config.fotoPos.y, enabled: config.showSplash },
                { id: 'qr', label: 'QR', x: config.qrPos.x, y: config.qrPos.y, enabled: config.showQrCode },
              ]}
              onElementMove={(id, x, y) => {
                if (id === 'logo') updateConfig('logoPos', { x, y });
                else if (id === 'foto') updateConfig('fotoPos', { x, y });
                else if (id === 'qr') updateConfig('qrPos', { x, y });
              }}
              margin={8}
            />
          )}
          
          {/* Margin Slider */}
          <div className="space-y-2 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Margini</Label>
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
          </div>
        </div>

        {/* Venue Name - OPTIONAL (shown as subtitle under band name) */}
        <div className="space-y-2">
          <Label htmlFor="venue-name" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Locale / Evento
            <span className="text-xs text-muted-foreground">(sottotitolo)</span>
          </Label>
          <Input
            id="venue-name"
            placeholder="Es. Bar Roma, Matrimonio Rossi..."
            value={config.venueName}
            onChange={(e) => updateConfig('venueName', e.target.value)}
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            Apparirà sotto il logo/titolo come @NOME LOCALE
          </p>
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

        {/* Additional Info - Optional */}
        <div className="space-y-2">
          <Label htmlFor="additional-info" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Info Aggiuntive
            <span className="text-xs text-muted-foreground">(opzionale)</span>
          </Label>
          <Textarea
            id="additional-info"
            placeholder="Es. Ingresso gratuito, Aperitivo incluso, Solo su prenotazione..."
            value={config.additionalInfo}
            onChange={(e) => updateConfig('additionalInfo', e.target.value)}
            className="bg-muted/50 min-h-[60px] resize-none"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Appare in basso sulla grafica (max 2 righe)
          </p>
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

        {/* QR Code Toggle */}
        <div className="space-y-4 p-4 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-accent" />
              <div>
                <Label className="text-sm font-medium">Mostra QR Code</Label>
                <p className="text-xs text-muted-foreground">
                  Link all'app senza mostrare il PIN
                </p>
              </div>
            </div>
            <Switch
              checked={config.showQrCode}
              onCheckedChange={(checked) => updateConfig('showQrCode', checked)}
            />
          </div>

          {/* QR Options - only visible when showQrCode is enabled */}
          {config.showQrCode && (
            <div className="space-y-4 pt-3 border-t border-accent/20">
              {/* QR Destination */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Destinazione QR</Label>
                <RadioGroup
                  value={config.qrDestination}
                  onValueChange={(value) => updateConfig('qrDestination', value as QrDestination)}
                  className="grid grid-cols-3 gap-2"
                >
                  {(Object.keys(QR_DESTINATIONS) as QrDestination[]).map((dest) => (
                    <div key={dest}>
                      <RadioGroupItem value={dest} id={`qr-dest-${dest}`} className="peer sr-only" />
                      <Label
                        htmlFor={`qr-dest-${dest}`}
                        className={cn(
                          "flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all text-xs font-medium",
                          "border-muted hover:border-muted-foreground/50",
                          config.qrDestination === dest && "border-accent bg-accent/10"
                        )}
                      >
                        {QR_DESTINATIONS[dest].label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* QR Size */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dimensione QR</Label>
                <RadioGroup
                  value={config.qrSize}
                  onValueChange={(value) => updateConfig('qrSize', value as QrSize)}
                  className="grid grid-cols-3 gap-2"
                >
                  {(Object.keys(QR_SIZES) as QrSize[]).map((size) => (
                    <div key={size}>
                      <RadioGroupItem value={size} id={`qr-size-${size}`} className="peer sr-only" />
                      <Label
                        htmlFor={`qr-size-${size}`}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all text-xs",
                          "border-muted hover:border-muted-foreground/50",
                          config.qrSize === size && "border-accent bg-accent/10"
                        )}
                      >
                        {QR_SIZES[size].label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* QR Position - now handled by drag preview above */}
              <p className="text-xs text-muted-foreground/70 text-center">
                Trascina il QR nell'anteprima sopra per posizionarlo
              </p>
            </div>
          )}
        </div>

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
