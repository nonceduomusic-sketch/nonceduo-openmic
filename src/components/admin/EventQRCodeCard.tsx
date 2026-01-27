import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  QrCode,
  Download,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Globe,
  Palette,
  RefreshCw,
  Check,
  Layout,
  RotateCcw,
  Info,
  MessageSquare,
  Printer,
  Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

// Brand logo assets
import brandLogoText from '@/assets/brand-logo-text.png';

type EventType = 'public' | 'private';
type StylePreset = 'minimal' | 'gradient' | 'neon';
type ImageFormat = 'square' | 'portrait' | 'story' | 'a4';
type QrDestination = 'app' | 'openmic' | 'dediche';

interface QRCodeConfig {
  title: string;
  venueName: string;
  eventDate: Date | undefined;
  eventTime: string;
  eventType: EventType;
  showEventType: boolean;
  additionalInfo: string;
  stylePreset: StylePreset;
  imageFormat: ImageFormat;
  qrDestination: QrDestination;
  useBrandLogo: boolean;
}

const DEFAULT_CONFIG: QRCodeConfig = {
  title: '',
  venueName: '',
  eventDate: undefined,
  eventTime: '',
  eventType: 'public',
  showEventType: true,
  additionalInfo: '',
  stylePreset: 'neon',
  imageFormat: 'square',
  qrDestination: 'app',
  useBrandLogo: true,
};

const STYLE_PRESETS: Record<StylePreset, { label: string; accent: string; bgStart: string; bgEnd: string }> = {
  minimal: {
    label: 'Minimal',
    accent: '#ffffff',
    bgStart: '#0a0a0a',
    bgEnd: '#1a1a1a',
  },
  gradient: {
    label: 'Viola',
    accent: '#a855f7',
    bgStart: '#1a0a2e',
    bgEnd: '#0f3460',
  },
  neon: {
    label: 'Neon',
    accent: '#ff2d92',
    bgStart: '#0d0d1a',
    bgEnd: '#1a0d1a',
  },
};

const IMAGE_FORMATS: Record<ImageFormat, { label: string; description: string; width: number; height: number }> = {
  square: {
    label: 'Quadrato 1:1',
    description: 'WhatsApp/Social',
    width: 1080,
    height: 1080,
  },
  portrait: {
    label: 'Verticale 4:5',
    description: 'Instagram Feed',
    width: 1080,
    height: 1350,
  },
  story: {
    label: 'Storia 9:16',
    description: 'Storie IG/FB',
    width: 1080,
    height: 1920,
  },
  a4: {
    label: 'A4 Stampa',
    description: 'Per locali',
    width: 2480,
    height: 3508,
  },
};

const QR_DESTINATIONS: Record<QrDestination, { label: string; path: string; cta: string }> = {
  app: { label: 'App (Hub)', path: '/app', cta: 'Scansiona e partecipa!' },
  openmic: { label: 'Open Mic', path: '/app/openmic', cta: 'Prenota la tua canzone!' },
  dediche: { label: 'Dediche', path: '/app/dediche', cta: 'Invia una dedica!' },
};

export const EventQRCodeCard: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<QRCodeConfig>(DEFAULT_CONFIG);

  const updateConfig = <K extends keyof QRCodeConfig>(key: K, value: QRCodeConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setPreviewUrl(null);
  };

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setPreviewUrl(null);
    toast({
      title: 'Dati resettati',
      description: 'Tutti i campi sono stati svuotati.',
    });
  }, [toast]);

  const generateQRCodeImage = useCallback(async () => {
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
      const isA4 = config.imageFormat === 'a4';
      const scale = isA4 ? 2.3 : 1;

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, style.bgStart);
      gradient.addColorStop(1, style.bgEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle texture
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;

      // Add glow for neon style
      if (config.stylePreset === 'neon') {
        const glowGradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, 500 * scale
        );
        glowGradient.addColorStop(0, 'rgba(255, 45, 146, 0.12)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.textAlign = 'center';

      // Calculate vertical layout
      let currentY = canvas.height * 0.08;
      const padding = 60 * scale;

      // Draw brand logo if enabled
      if (config.useBrandLogo) {
        try {
          const logoImg = new Image();
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = reject;
            logoImg.src = brandLogoText;
          });
          
          const logoHeight = 80 * scale;
          const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
          ctx.drawImage(logoImg, (canvas.width - logoWidth) / 2, currentY, logoWidth, logoHeight);
          currentY += logoHeight + 40 * scale;
        } catch (e) {
          console.error('Failed to load logo:', e);
        }
      }

      // Draw title if provided
      if (config.title.trim()) {
        ctx.font = `800 ${Math.round(64 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = style.accent;
        if (config.stylePreset === 'neon') {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 20;
        }
        ctx.fillText(config.title.toUpperCase(), canvas.width / 2, currentY + 60 * scale);
        ctx.shadowBlur = 0;
        currentY += 100 * scale;
      }

      // Draw venue if provided
      if (config.venueName.trim()) {
        ctx.font = `600 ${Math.round(42 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`📍 ${config.venueName}`, canvas.width / 2, currentY + 50 * scale);
        currentY += 70 * scale;
      }

      // Draw date + time if provided
      const hasDate = config.eventDate;
      const hasTime = config.eventTime.trim();
      if (hasDate || hasTime) {
        let dateTimeStr = '';
        if (hasDate) {
          dateTimeStr = format(config.eventDate!, 'EEEE d MMMM yyyy', { locale: it });
          dateTimeStr = dateTimeStr.charAt(0).toUpperCase() + dateTimeStr.slice(1);
        }
        if (hasTime) {
          dateTimeStr += hasDate ? ` • ${config.eventTime}` : config.eventTime;
        }
        
        ctx.font = `500 ${Math.round(36 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(dateTimeStr, canvas.width / 2, currentY + 50 * scale);
        currentY += 80 * scale;
      }

      // Event type badge - only if showEventType is enabled
      if (config.showEventType) {
        const badgeText = config.eventType === 'public' ? '🌐 Evento Pubblico' : '🔒 Evento Privato';
        ctx.font = `500 ${Math.round(28 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = config.eventType === 'public' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(251, 146, 60, 0.9)';
        ctx.fillText(badgeText, canvas.width / 2, currentY + 40 * scale);
        currentY += 60 * scale;
      }

      // Generate and draw QR code - VERY LARGE
      const baseUrl = 'https://nonceduo-openmic.lovable.app';
      const appUrl = baseUrl + QR_DESTINATIONS[config.qrDestination].path;
      
      // QR size based on format - much bigger for A4
      const qrSize = isA4 ? 900 : (config.imageFormat === 'story' ? 450 : 380);
      
      try {
        const qrDataUrl = await QRCode.toDataURL(appUrl, {
          width: 512,
          margin: 1,
          color: {
            dark: '#ffffff',
            light: '#00000000',
          },
        });
        
        const qrImg = new Image();
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = qrDataUrl;
        });
        
        // Center the QR in remaining space
        const qrY = currentY + 40 * scale;
        const qrX = (canvas.width - qrSize) / 2;
        
        // QR background with glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 30);
        ctx.fill();
        
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        
        // CTA under QR
        const ctaY = qrY + qrSize + 60 * scale;
        const destCta = QR_DESTINATIONS[config.qrDestination].cta;
        
        ctx.font = `700 ${Math.round(48 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = style.accent;
        if (config.stylePreset === 'neon') {
          ctx.shadowColor = style.accent;
          ctx.shadowBlur = 15;
        }
        ctx.fillText('📱 SCANSIONA IL QR', canvas.width / 2, ctaY);
        ctx.shadowBlur = 0;
        
        ctx.font = `500 ${Math.round(36 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(destCta, canvas.width / 2, ctaY + 50 * scale);
        
      } catch (qrError) {
        console.error('QR generation error:', qrError);
      }

      // Additional info at bottom
      if (config.additionalInfo.trim()) {
        const infoY = canvas.height - 120 * scale;
        ctx.font = `400 ${Math.round(28 * scale)}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
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
        
        lines.slice(0, 2).forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, infoY + i * 40 * scale);
        });
      }

      // Footer branding
      const footerY = canvas.height - 50 * scale;
      ctx.font = `500 ${Math.round(24 * scale)}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText("NON C'È DUO • LIVE", canvas.width / 2, footerY);

      const url = canvas.toDataURL('image/png');
      setPreviewUrl(url);

      toast({
        title: 'QR Code generato!',
        description: 'Ora puoi scaricarlo o condividerlo.',
      });
    } catch (error) {
      console.error('Error generating QR image:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile generare il QR Code.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [config, toast]);

  const downloadImage = useCallback(async () => {
    if (!previewUrl) return;

    const formatConfig = IMAGE_FORMATS[config.imageFormat];
    const dateStr = config.eventDate ? format(config.eventDate, 'yyyy-MM-dd') : 'qr';
    const nameStr = config.venueName ? config.venueName.toLowerCase().replace(/\s+/g, '-') : 'evento';
    const fileName = `qrcode-${nameStr}-${dateStr}-${formatConfig.width}x${formatConfig.height}.png`;

    // Detect mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (isMobile) {
        // On mobile: open in new tab for manual save
        window.open(blobUrl, '_blank');
        toast({
          title: 'Immagine aperta',
          description: 'Tieni premuto sull\'immagine e seleziona "Salva immagine".',
        });
        // Keep URL alive longer for mobile
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      } else {
        // On desktop: direct download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Download completato',
          description: 'Il QR Code è stato scaricato.',
        });
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch (error) {
      console.error('Download error:', error);
      window.open(previewUrl, '_blank');
      toast({
        title: 'Aperto in nuova scheda',
        description: 'Tieni premuto sull\'immagine per salvarla.',
      });
    }
  }, [previewUrl, config, toast]);

  const shareImage = useCallback(async () => {
    if (!previewUrl) return;

    const formatConfig = IMAGE_FORMATS[config.imageFormat];
    const dateStr = config.eventDate ? format(config.eventDate, 'yyyy-MM-dd') : 'qr';
    const nameStr = config.venueName ? config.venueName.toLowerCase().replace(/\s+/g, '-') : 'evento';
    const fileName = `qrcode-${nameStr}-${dateStr}-${formatConfig.width}x${formatConfig.height}.png`;

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      
      const navAny = navigator as unknown as {
        share?: (data: unknown) => Promise<void>;
        canShare?: (data: unknown) => boolean;
      };
      
      if (typeof navAny.share === 'function') {
        const file = new File([blob], fileName, { type: blob.type || 'image/png' });
        const canShareFiles = typeof navAny.canShare !== 'function' || navAny.canShare({ files: [file] });
        if (canShareFiles) {
          await navAny.share({ files: [file], title: fileName });
          return;
        }
      }
      
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      toast({
        title: 'Condivisione non supportata',
        description: 'Tieni premuto sull\'immagine per condividerla.',
      });
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: 'Errore condivisione',
        description: 'Impossibile condividere l\'immagine.',
        variant: 'destructive',
      });
    }
  }, [previewUrl, config, toast]);

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-blue-400" />
            QR Code Evento
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
          QR code per stampa e condivisione WhatsApp. Compila solo i campi che vuoi mostrare.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Format Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Layout className="w-4 h-4" />
            Formato
          </Label>
          <RadioGroup
            value={config.imageFormat}
            onValueChange={(value) => updateConfig('imageFormat', value as ImageFormat)}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {(Object.keys(IMAGE_FORMATS) as ImageFormat[]).map((fmt) => {
              const fmtConfig = IMAGE_FORMATS[fmt];
              return (
                <div key={fmt}>
                  <RadioGroupItem value={fmt} id={`qr-fmt-${fmt}`} className="peer sr-only" />
                  <Label
                    htmlFor={`qr-fmt-${fmt}`}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center",
                      "border-muted hover:border-muted-foreground/50",
                      config.imageFormat === fmt && "border-primary bg-primary/10"
                    )}
                  >
                    <span className="text-xs font-semibold">{fmtConfig.label}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtConfig.description}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* QR Destination */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Share2 className="w-4 h-4" />
            Destinazione QR
          </Label>
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
                    "flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all text-xs",
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

        {/* Title (optional) */}
        <div className="space-y-2">
          <Label htmlFor="qr-title" className="text-sm text-muted-foreground">
            Titolo <span className="text-xs">(opzionale)</span>
          </Label>
          <Input
            id="qr-title"
            placeholder="Es. SERATA KARAOKE"
            value={config.title}
            onChange={(e) => updateConfig('title', e.target.value)}
            className="bg-muted/50"
          />
        </div>

        {/* Venue (optional) */}
        <div className="space-y-2">
          <Label htmlFor="qr-venue" className="text-sm text-muted-foreground">
            Locale / Evento <span className="text-xs">(opzionale)</span>
          </Label>
          <Input
            id="qr-venue"
            placeholder="Es. Bar La Piazzetta"
            value={config.venueName}
            onChange={(e) => updateConfig('venueName', e.target.value)}
            className="bg-muted/50"
          />
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Data <span className="text-xs">(opzionale)</span>
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
                  <Calendar className="mr-2 h-4 w-4" />
                  {config.eventDate ? format(config.eventDate, 'd MMM', { locale: it }) : 'Scegli'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={config.eventDate}
                  onSelect={(date) => updateConfig('eventDate', date)}
                  initialFocus
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-time" className="text-sm text-muted-foreground">
              Orario <span className="text-xs">(opz.)</span>
            </Label>
            <Input
              id="qr-time"
              placeholder="Es. 21:30"
              value={config.eventTime}
              onChange={(e) => updateConfig('eventTime', e.target.value)}
              className="bg-muted/50"
            />
          </div>
        </div>

        {/* Event Type */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Tipologia evento</Label>
          <RadioGroup
            value={config.eventType}
            onValueChange={(value) => updateConfig('eventType', value as EventType)}
            className="grid grid-cols-2 gap-2"
          >
            <div>
              <RadioGroupItem value="public" id="qr-public" className="peer sr-only" />
              <Label
                htmlFor="qr-public"
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                  "border-muted hover:border-muted-foreground/50",
                  config.eventType === 'public' && "border-green-500 bg-green-500/10"
                )}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">Pubblico</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="private" id="qr-private" className="peer sr-only" />
              <Label
                htmlFor="qr-private"
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                  "border-muted hover:border-muted-foreground/50",
                  config.eventType === 'private' && "border-orange-500 bg-orange-500/10"
                )}
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm">Privato</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Show Event Type Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <Label htmlFor="qr-show-event-type" className="text-sm cursor-pointer">
            Mostra tipologia evento
          </Label>
          <Button
            id="qr-show-event-type"
            variant={config.showEventType ? "default" : "outline"}
            size="sm"
            onClick={() => updateConfig('showEventType', !config.showEventType)}
            className="h-8"
          >
            {config.showEventType ? <Check className="w-4 h-4 mr-1" /> : null}
            {config.showEventType ? 'Attivo' : 'Disattivo'}
          </Button>
        </div>

        {/* Style Preset */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Palette className="w-4 h-4" />
            Stile Colore
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
                  <RadioGroupItem value={preset} id={`qr-style-${preset}`} className="peer sr-only" />
                  <Label
                    htmlFor={`qr-style-${preset}`}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all",
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
          <Label htmlFor="qr-info" className="text-sm text-muted-foreground">
            Info aggiuntive <span className="text-xs">(opzionale)</span>
          </Label>
          <Textarea
            id="qr-info"
            placeholder="Es. Ingresso libero, Consumazione obbligatoria..."
            value={config.additionalInfo}
            onChange={(e) => updateConfig('additionalInfo', e.target.value)}
            className="bg-muted/50 resize-none"
            rows={2}
          />
        </div>

        {/* Logo Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <Label htmlFor="qr-logo" className="text-sm cursor-pointer">
            Mostra logo "NON C'È DUO"
          </Label>
          <Button
            id="qr-logo"
            variant={config.useBrandLogo ? "default" : "outline"}
            size="sm"
            onClick={() => updateConfig('useBrandLogo', !config.useBrandLogo)}
            className="h-8"
          >
            {config.useBrandLogo ? <Check className="w-4 h-4 mr-1" /> : null}
            {config.useBrandLogo ? 'Attivo' : 'Disattivo'}
          </Button>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateQRCodeImage}
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
              Rigenera QR
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4" />
              Genera QR Code
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
              <div className="flex gap-2">
                <Button
                  onClick={shareImage}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Condividi
                </Button>
                <Button
                  onClick={downloadImage}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Scarica
                </Button>
              </div>
            </div>
            
            <div className={cn(
              "relative mx-auto rounded-xl overflow-hidden border border-border bg-black",
              config.imageFormat === 'story' && "aspect-[9/16] max-h-[400px]",
              config.imageFormat === 'portrait' && "aspect-[4/5] max-h-[350px]",
              config.imageFormat === 'square' && "aspect-square max-h-[300px]",
              config.imageFormat === 'a4' && "aspect-[210/297] max-h-[400px]"
            )}>
              <img
                src={previewUrl}
                alt="QR Code preview"
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Formato: {IMAGE_FORMATS[config.imageFormat].width}×{IMAGE_FORMATS[config.imageFormat].height}px
              {config.imageFormat === 'a4' && ' (ottimizzato per stampa)'}
            </p>
          </div>
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};
