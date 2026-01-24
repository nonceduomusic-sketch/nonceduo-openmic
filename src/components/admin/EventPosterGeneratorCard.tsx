import React, { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type EventType = 'public' | 'private';
type StylePreset = 'minimal' | 'gradient' | 'neon';
type ImageFormat = 'square' | 'portrait' | 'story';
type OverlayPosition = 'bottom' | 'top' | 'center';

interface EventPosterConfig {
  venueName: string;
  eventDate: Date | undefined;
  eventTime: string;
  eventType: EventType;
  stylePreset: StylePreset;
  imageFormat: ImageFormat;
  overlayPosition: OverlayPosition;
  additionalInfo: string;
  uploadedImage: string | null;
  aiTheme: string;
}

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

export const EventPosterGeneratorCard: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiGeneratedBg, setAiGeneratedBg] = useState<string | null>(null);
  
  const [config, setConfig] = useState<EventPosterConfig>({
    venueName: '',
    eventDate: undefined,
    eventTime: '',
    eventType: 'public',
    stylePreset: 'neon',
    imageFormat: 'square',
    overlayPosition: 'bottom',
    additionalInfo: '',
    uploadedImage: null,
    aiTheme: '',
  });

  const updateConfig = <K extends keyof EventPosterConfig>(key: K, value: EventPosterConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setPreviewUrl(null);
  };

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
  }, [toast]);

  const removeImage = useCallback(() => {
    updateConfig('uploadedImage', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

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
      const aspectRatio = formatConfig.width / formatConfig.height;
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: `Generate a professional, elegant event poster background for a "${config.aiTheme}" themed music event. 
              Style: Artistic, sophisticated with rich textures.
              Requirements:
              - Format ${formatConfig.width}x${formatConfig.height}px (${aspectRatio < 1 ? 'portrait' : aspectRatio > 1 ? 'landscape' : 'square'})
              - Color palette suitable for text overlay
              - Abstract, artistic background without text
              - Professional quality for Instagram/Facebook poster
              - Theme: ${config.aiTheme}
              - Should work well with event text overlay
              Ultra high resolution.`
            }
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (imageUrl) {
        setAiGeneratedBg(imageUrl);
        updateConfig('uploadedImage', null); // Clear uploaded image
        toast({
          title: 'Sfondo AI generato!',
          description: 'Ora genera la locandina completa.',
        });
      } else {
        throw new Error('No image in response');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Errore generazione AI',
        description: 'Riprova o carica una foto manualmente.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [config.aiTheme, config.imageFormat, toast]);

  const generatePosterImage = useCallback(async () => {
    const backgroundImage = config.uploadedImage || aiGeneratedBg;
    
    if (!backgroundImage) {
      toast({
        title: 'Immagine mancante',
        description: 'Carica una foto o genera uno sfondo AI prima.',
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

      // Draw venue name if provided - OPTIONAL
      let currentY = textCenterY - 60;
      
      if (config.venueName) {
        ctx.font = 'bold 56px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffffff';
        
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
        
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, currentY + i * 65);
        });
        
        currentY += lines.length * 65 + 20;
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

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
        
        ctx.font = '600 36px "Inter", sans-serif';
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
        ctx.font = '400 20px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('NONCE DUO • LIVE MUSIC', canvas.width / 2, canvas.height - 30);
      } else {
        ctx.font = '400 20px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('NONCE DUO • LIVE MUSIC', canvas.width / 2, 40);
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
  }, [config, aiGeneratedBg, toast]);

  const downloadImage = useCallback(() => {
    if (!previewUrl) return;

    const formatConfig = IMAGE_FORMATS[config.imageFormat];
    const dateStr = config.eventDate ? format(config.eventDate, 'yyyy-MM-dd') : 'evento';
    const nameStr = config.venueName ? config.venueName.toLowerCase().replace(/\s+/g, '-') : 'locandina';
    
    const link = document.createElement('a');
    link.download = `poster-${nameStr}-${dateStr}-${formatConfig.width}x${formatConfig.height}.png`;
    link.href = previewUrl;
    link.click();

    toast({
      title: 'Download avviato',
      description: 'La locandina è stata scaricata.',
    });
  }, [previewUrl, config, toast]);

  const hasBackground = config.uploadedImage || aiGeneratedBg;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Facebook className="w-5 h-5 text-blue-400" />
          Locandina Evento
        </CardTitle>
        <CardDescription>
          Carica una foto o genera uno sfondo AI, poi aggiungi i dettagli.
          Tutti i campi di testo sono opzionali!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Theme Generator - NEW */}
        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Genera Sfondo AI a Tema
            <span className="text-xs text-muted-foreground">(alternativo alla foto)</span>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <Check className="w-3 h-3" />
                Sfondo AI pronto!
              </div>
              <div className="relative">
                <img
                  src={aiGeneratedBg}
                  alt="AI generated background"
                  className="w-full h-32 object-cover rounded-lg border border-border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setAiGeneratedBg(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">oppure</span>
          <div className="flex-1 border-t border-border" />
        </div>

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

        {/* Venue Name (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="poster-venue" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Nome Locale
            <span className="text-xs text-muted-foreground">(opzionale)</span>
          </Label>
          <Input
            id="poster-venue"
            placeholder="Es. Bar Roma, Club XYZ..."
            value={config.venueName}
            onChange={(e) => updateConfig('venueName', e.target.value)}
            className="bg-muted/50"
          />
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
