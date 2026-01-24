import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Image,
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

interface EventStoryConfig {
  venueName: string;
  eventDate: Date | undefined;
  eventTime: string;
  eventType: EventType;
  stylePreset: StylePreset;
}

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

export const EventStoryGeneratorCard: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [config, setConfig] = useState<EventStoryConfig>({
    venueName: '',
    eventDate: undefined,
    eventTime: '',
    eventType: 'public',
    stylePreset: 'neon',
  });

  const updateConfig = <K extends keyof EventStoryConfig>(key: K, value: EventStoryConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setPreviewUrl(null); // Reset preview when config changes
  };

  const generateStoryImage = useCallback(async () => {
    if (!config.venueName || !config.eventDate || !config.eventTime) {
      toast({
        title: 'Dati mancanti',
        description: 'Compila tutti i campi prima di generare la grafica.',
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

      // Instagram Story dimensions (1080x1920)
      canvas.width = 1080;
      canvas.height = 1920;

      const style = STYLE_PRESETS[config.stylePreset];
      
      // Draw background gradient
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
        const glowGradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height * 0.3, 0,
          canvas.width / 2, canvas.height * 0.3, 400
        );
        glowGradient.addColorStop(0, 'rgba(255, 45, 146, 0.15)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Format date
      const formattedDate = format(config.eventDate, "EEEE d MMMM", { locale: it });
      const formattedDateUpper = formattedDate.toUpperCase();

      // Draw venue name (main title)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px "Orbitron", sans-serif';
      
      // Add glow to text for neon style
      if (config.stylePreset === 'neon') {
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

      const titleStartY = 380;
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, titleStartY + i * 90);
      });

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw decorative line
      const lineY = titleStartY + lines.length * 90 + 60;
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

      // Draw date
      ctx.font = '600 48px "Orbitron", sans-serif';
      ctx.fillStyle = style.accent;
      if (config.stylePreset === 'neon') {
        ctx.shadowColor = style.accent;
        ctx.shadowBlur = 20;
      }
      ctx.fillText(formattedDateUpper, canvas.width / 2, lineY + 100);
      
      // Draw time
      ctx.font = '500 42px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillText(`ORE ${config.eventTime}`, canvas.width / 2, lineY + 170);

      // Draw event type badge
      const badgeY = lineY + 280;
      const badgeText = config.eventType === 'public' ? 'EVENTO PUBBLICO' : 'EVENTO PRIVATO';
      const badgeIcon = config.eventType === 'public' ? '🌐' : '🔒';
      
      ctx.font = '600 32px "Inter", sans-serif';
      const badgeWidth = ctx.measureText(badgeText).width + 100;
      
      // Badge background
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
      
      // Badge border
      ctx.strokeStyle = config.eventType === 'public' 
        ? 'rgba(34, 197, 94, 0.5)' 
        : 'rgba(255, 45, 146, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Badge text
      ctx.fillStyle = config.eventType === 'public' ? '#22c55e' : style.accent;
      ctx.fillText(`${badgeIcon}  ${badgeText}`, canvas.width / 2, badgeY + 12);

      // Draw secret PIN teaser section
      const pinSectionY = canvas.height - 650;
      
      // Decorative frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, pinSectionY - 40, canvas.width - 200, 280, 20);
      ctx.stroke();

      // PIN teaser title
      ctx.font = '700 36px "Orbitron", sans-serif';
      ctx.fillStyle = style.accent;
      if (config.stylePreset === 'neon') {
        ctx.shadowColor = style.accent;
        ctx.shadowBlur = 15;
      }
      ctx.fillText('🎵 CODICE SEGRETO 🎵', canvas.width / 2, pinSectionY + 30);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // PIN mystery boxes
      ctx.font = '800 64px "Orbitron", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('? ? ? ?', canvas.width / 2, pinSectionY + 120);
      
      // PIN subtitle
      ctx.font = '400 28px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('Scoprilo partecipando all\'evento!', canvas.width / 2, pinSectionY + 190);

      // Draw private event CTA if applicable
      if (config.eventType === 'private') {
        const ctaY = canvas.height - 320;
        
        ctx.font = '500 28px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Per informazioni e accrediti:', canvas.width / 2, ctaY);
        
        ctx.font = '700 36px "Inter", sans-serif';
        ctx.fillStyle = style.accent;
        if (config.stylePreset === 'neon') {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 15;
        }
        ctx.fillText('Scrivici su Instagram 📩', canvas.width / 2, ctaY + 60);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Draw footer branding
      ctx.font = '400 24px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('NONCE DUO • LIVE MUSIC', canvas.width / 2, canvas.height - 100);

      // Generate preview URL
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
  }, [config, toast]);

  const downloadImage = useCallback(() => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.download = `story-${config.venueName.toLowerCase().replace(/\s+/g, '-')}-${format(config.eventDate || new Date(), 'yyyy-MM-dd')}.png`;
    link.href = previewUrl;
    link.click();

    toast({
      title: 'Download avviato',
      description: 'La grafica è stata scaricata.',
    });
  }, [previewUrl, config.venueName, config.eventDate, toast]);

  const isFormValid = config.venueName && config.eventDate && config.eventTime;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Instagram className="w-5 h-5 text-pink-400" />
          Grafica Storia Evento
        </CardTitle>
        <CardDescription>
          Genera una grafica professionale per le storie Instagram del locale.
          I dati restano in sessione e non vengono salvati.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Venue Name */}
        <div className="space-y-2">
          <Label htmlFor="venue-name" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Nome del Locale
          </Label>
          <Input
            id="venue-name"
            placeholder="Es. Bar Roma, Club XYZ..."
            value={config.venueName}
            onChange={(e) => updateConfig('venueName', e.target.value)}
            className="bg-muted/50"
          />
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Evento
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

          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="event-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Orario
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
          <Label className="flex items-center gap-2">
            Tipologia Evento
          </Label>
          <RadioGroup
            value={config.eventType}
            onValueChange={(value) => updateConfig('eventType', value as EventType)}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem value="public" id="public" className="peer sr-only" />
              <Label
                htmlFor="public"
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
              <RadioGroupItem value="private" id="private" className="peer sr-only" />
              <Label
                htmlFor="private"
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

        {/* Style Preset */}
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
              const style = STYLE_PRESETS[preset];
              return (
                <div key={preset}>
                  <RadioGroupItem value={preset} id={preset} className="peer sr-only" />
                  <Label
                    htmlFor={preset}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      "border-muted hover:border-muted-foreground/50",
                      config.stylePreset === preset && "border-primary bg-primary/10"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg border border-white/20"
                      style={{ background: style.bg }}
                    >
                      <div
                        className="w-full h-full rounded-lg flex items-center justify-center"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: style.accent }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-center">{style.label}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateStoryImage}
          disabled={!isFormValid || isGenerating}
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
              <Image className="w-4 h-4" />
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
            
            <div className="relative aspect-[9/16] max-h-[400px] mx-auto rounded-xl overflow-hidden border border-border bg-black">
              <img
                src={previewUrl}
                alt="Story preview"
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Formato: 1080×1920px (Instagram Story)
            </p>
          </div>
        )}

        {/* Hidden canvas for generation */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};
