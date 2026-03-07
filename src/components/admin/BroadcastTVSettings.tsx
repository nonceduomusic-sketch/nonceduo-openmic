import React, { useState, useCallback, useEffect } from 'react';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Move, 
  Tv, 
  QrCode, 
  Type, 
  Image as ImageIcon,
  ExternalLink,
  RotateCcw,
  Save,
  Upload,
  AlignCenter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import brandLogoText from '@/assets/brand-logo-text.png';
import {
  FURORE_QR_REQUIRED_ELEMENTS,
  STANDBY_MODE_OPTIONS,
  StandbyMode,
  resolveStandbyMode,
} from '@/lib/tvStandbyModes';

interface ElementPosition {
  x: number;
  y: number;
}

interface TVSettings {
  tv_title: string;
  tv_subtitle: string;
  tv_footer: string;
  tv_qr_url: string;
  tv_logo_url: string;
  tv_qr_cta: string;
  tv_show_qr: boolean;
  tv_show_logo: boolean;
  tv_show_title: boolean;
  tv_show_subtitle: boolean;
  tv_show_footer: boolean;
  tv_show_status: boolean;
  tv_element_positions: Record<string, ElementPosition>;
}

interface DraggableElement {
  id: string;
  label: string;
  icon: React.ReactNode;
  showKey: keyof TVSettings;
}

const DRAGGABLE_ELEMENTS: DraggableElement[] = [
  { id: 'logo', label: 'Logo', icon: <ImageIcon className="w-3.5 h-3.5" />, showKey: 'tv_show_logo' },
  { id: 'title', label: 'Titolo', icon: <Type className="w-3.5 h-3.5" />, showKey: 'tv_show_title' },
  { id: 'subtitle', label: 'Sottotitolo', icon: <Type className="w-3.5 h-3.5" />, showKey: 'tv_show_subtitle' },
  { id: 'status', label: 'Stato', icon: <Tv className="w-3.5 h-3.5" />, showKey: 'tv_show_status' },
  { id: 'qr', label: 'QR Code', icon: <QrCode className="w-3.5 h-3.5" />, showKey: 'tv_show_qr' },
  { id: 'qr_cta', label: 'CTA QR', icon: <Type className="w-3.5 h-3.5" />, showKey: 'tv_show_qr' },
  { id: 'footer', label: 'Footer', icon: <AlignCenter className="w-3.5 h-3.5" />, showKey: 'tv_show_footer' },
];

const DEFAULT_POSITIONS: Record<string, ElementPosition> = {
  logo: { x: 50, y: 12 },
  title: { x: 50, y: 30 },
  subtitle: { x: 50, y: 40 },
  status: { x: 50, y: 50 },
  qr: { x: 50, y: 65 },
  qr_cta: { x: 50, y: 82 },
  footer: { x: 50, y: 90 },
};

const ELEMENT_COLORS: Record<string, { bg: string; border: string }> = {
  logo: { bg: "from-violet-500/90 to-purple-600/90", border: "border-violet-400/50" },
  title: { bg: "from-amber-500/90 to-orange-600/90", border: "border-amber-400/50" },
  subtitle: { bg: "from-sky-500/90 to-blue-600/90", border: "border-sky-400/50" },
  status: { bg: "from-emerald-500/90 to-teal-600/90", border: "border-emerald-400/50" },
  qr: { bg: "from-rose-500/90 to-pink-600/90", border: "border-rose-400/50" },
  qr_cta: { bg: "from-fuchsia-500/90 to-pink-600/90", border: "border-fuchsia-400/50" },
  footer: { bg: "from-slate-500/90 to-gray-600/90", border: "border-slate-400/50" },
};

interface BroadcastTVSettingsProps {
  canManage?: boolean;
}

export function BroadcastTVSettings({ canManage = true }: BroadcastTVSettingsProps) {
  const { session, syncUpdate } = useHybridBroadcast('main');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Local state for settings
  const [settings, setSettings] = useState<TVSettings>({
    tv_title: 'Open Mic',
    tv_subtitle: 'NonceDuo Live Experience',
    tv_footer: 'Powered by NonceDuo',
    tv_qr_url: '',
    tv_logo_url: '',
    tv_qr_cta: 'Scansiona per prenotare la tua canzone',
    tv_show_qr: true,
    tv_show_logo: true,
    tv_show_title: true,
    tv_show_subtitle: true,
    tv_show_footer: true,
    tv_show_status: true,
    tv_element_positions: DEFAULT_POSITIONS,
  });

  // Sync with session data
  useEffect(() => {
    if (session) {
      const s = session as any;
      setSettings({
        tv_title: s.tv_title ?? 'Open Mic',
        tv_subtitle: s.tv_subtitle ?? 'NonceDuo Live Experience',
        tv_footer: s.tv_footer ?? 'Powered by NonceDuo',
        tv_qr_url: s.tv_qr_url ?? '',
        tv_logo_url: s.tv_logo_url ?? '',
        tv_qr_cta: s.tv_qr_cta ?? 'Scansiona per prenotare la tua canzone',
        tv_show_qr: (session as any).tv_show_qr ?? true,
        tv_show_logo: (session as any).tv_show_logo ?? true,
        tv_show_title: (session as any).tv_show_title ?? true,
        tv_show_subtitle: (session as any).tv_show_subtitle ?? true,
        tv_show_footer: (session as any).tv_show_footer ?? true,
        tv_show_status: (session as any).tv_show_status ?? true,
        tv_element_positions: (session as any).tv_element_positions || DEFAULT_POSITIONS,
      });
    }
  }, [session]);

  const OPENMIC_DEFAULT_TITLE = 'Open Mic';
  const OPENMIC_DEFAULT_SUBTITLE = 'NonceDuo Live Experience';
  const OPENMIC_DEFAULT_QR_CTA = 'Scansiona per prenotare la tua canzone';

  const updateSetting = useCallback(<K extends keyof TVSettings>(key: K, value: TVSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleStandbyModeSelect = (mode: StandbyMode, label: string) => {
    if (!canManage) return;

    const payload: Record<string, any> = { tv_standby_mode: mode };

    if (mode === 'furore_qr') {
      payload.tv_show_logo = true;
      payload.tv_show_title = true;
      payload.tv_show_subtitle = true;
      payload.tv_show_qr = true;
      payload.tv_show_footer = true;

      payload.tv_title = !settings.tv_title?.trim() || settings.tv_title === OPENMIC_DEFAULT_TITLE
        ? "Non C'è Furore"
        : settings.tv_title;
      payload.tv_subtitle = !settings.tv_subtitle?.trim() || settings.tv_subtitle === OPENMIC_DEFAULT_SUBTITLE
        ? 'Scansiona e apri la tua pulsantiera'
        : settings.tv_subtitle;
      payload.tv_qr_cta = !settings.tv_qr_cta?.trim() || settings.tv_qr_cta === OPENMIC_DEFAULT_QR_CTA
        ? 'Scansiona e premi il buzzer!'
        : settings.tv_qr_cta;
    }

    syncUpdate(payload as any);
    toast.success(`Standby: ${label}`);
  };

  const updateElementPosition = useCallback((elementId: string, x: number, y: number) => {
    setSettings(prev => ({
      ...prev,
      tv_element_positions: {
        ...prev.tv_element_positions,
        [elementId]: { x, y },
      },
    }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!canManage) return;
    setIsSaving(true);
    try {
      syncUpdate({
        tv_title: settings.tv_title,
        tv_subtitle: settings.tv_subtitle,
        tv_footer: settings.tv_footer,
        tv_qr_url: settings.tv_qr_url || null,
        tv_logo_url: settings.tv_logo_url || null,
        tv_qr_cta: settings.tv_qr_cta,
        tv_show_qr: settings.tv_show_qr,
        tv_show_logo: settings.tv_show_logo,
        tv_show_title: settings.tv_show_title,
        tv_show_subtitle: settings.tv_show_subtitle,
        tv_show_footer: settings.tv_show_footer,
        tv_show_status: settings.tv_show_status,
        tv_element_positions: settings.tv_element_positions,
      });
      
      toast.success('Impostazioni salvate!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultSettings: TVSettings = {
      tv_title: 'Open Mic',
      tv_subtitle: 'NonceDuo Live Experience',
      tv_footer: 'Powered by NonceDuo',
      tv_qr_url: '',
      tv_logo_url: '',
      tv_qr_cta: 'Scansiona per prenotare la tua canzone',
      tv_show_qr: true,
      tv_show_logo: true,
      tv_show_title: true,
      tv_show_subtitle: true,
      tv_show_footer: true,
      tv_show_status: true,
      tv_element_positions: DEFAULT_POSITIONS,
    };
    
    setSettings(defaultSettings);
    setIsSaving(true);
    
    try {
      syncUpdate({
        tv_title: defaultSettings.tv_title,
        tv_subtitle: defaultSettings.tv_subtitle,
        tv_footer: defaultSettings.tv_footer,
        tv_qr_url: null,
        tv_logo_url: null,
        tv_qr_cta: defaultSettings.tv_qr_cta,
        tv_show_qr: defaultSettings.tv_show_qr,
        tv_show_logo: defaultSettings.tv_show_logo,
        tv_show_title: defaultSettings.tv_show_title,
        tv_show_subtitle: defaultSettings.tv_show_subtitle,
        tv_show_footer: defaultSettings.tv_show_footer,
        tv_show_status: defaultSettings.tv_show_status,
        tv_element_positions: defaultSettings.tv_element_positions,
      });
      
      setHasChanges(false);
      toast.success('Impostazioni ripristinate ai valori predefiniti!');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Errore nel ripristino');
    } finally {
      setIsSaving(false);
    }
  };

  // Draggable preview state
  const [dragging, setDragging] = useState<string | null>(null);
  const [centeredH, setCenteredH] = useState(false);
  const [centeredV, setCenteredV] = useState(false);
  const previewRef = React.useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, elementId: string) => {
    if (!canManage) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(elementId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [canManage]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(3, Math.min(97, ((e.clientY - rect.top) / rect.height) * 100));
    
    const nearCenterH = Math.abs(x - 50) <= 3;
    const nearCenterV = Math.abs(y - 50) <= 3;
    
    setCenteredH(nearCenterH);
    setCenteredV(nearCenterV);
    
    updateElementPosition(dragging, nearCenterH ? 50 : x, nearCenterV ? 50 : y);
  }, [dragging, updateElementPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setDragging(null);
    setCenteredH(false);
    setCenteredV(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  const getPosition = (elementId: string): ElementPosition => {
    return settings.tv_element_positions[elementId] || DEFAULT_POSITIONS[elementId] || { x: 50, y: 50 };
  };

  const isElementVisible = (element: DraggableElement): boolean => {
    return settings[element.showKey] as boolean;
  };

  // Determine which elements are available based on standby mode
  const currentStandbyMode = normalizeStandbyMode((session as any)?.tv_standby_mode);
  
  const getAvailableElements = (): DraggableElement[] => {
    switch (currentStandbyMode) {
      case 'logo':
        return DRAGGABLE_ELEMENTS.filter(el => ['logo', 'footer'].includes(el.id));
      case 'furore':
        return DRAGGABLE_ELEMENTS.filter(el => ['logo', 'title', 'footer'].includes(el.id));
      case 'furore_qr':
        return DRAGGABLE_ELEMENTS.filter(el => ['logo', 'title', 'subtitle', 'qr', 'qr_cta', 'footer'].includes(el.id));
      case 'openmic':
      default:
        return DRAGGABLE_ELEMENTS;
    }
  };

  const availableElements = getAvailableElements();
  const requiredFuroreQrElements = ['logo', 'title', 'subtitle', 'qr', 'qr_cta', 'footer'];
  const isElementVisibleInPreview = (element: DraggableElement) => {
    if (currentStandbyMode === 'furore_qr') {
      return requiredFuroreQrElements.includes(element.id);
    }
    return isElementVisible(element);
  };

  const visibleElements = availableElements.filter(isElementVisibleInPreview);
  const hiddenElements = availableElements.filter(el => !isElementVisibleInPreview(el));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Impostazioni Schermo TV</CardTitle>
              <CardDescription>Personalizza la visualizzazione</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!canManage}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canManage || !hasChanges || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Anteprima
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Contenuti
            </TabsTrigger>
          </TabsList>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {/* Current mode indicator */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-center">
              Anteprima per: <span className="font-medium text-foreground">
                {STANDBY_MODE_OPTIONS.find(opt => opt.value === currentStandbyMode)?.label ?? '🎤 Open Mic'}
              </span>
              <span className="ml-1 opacity-60">— Cambia in Contenuti</span>
            </div>

            {/* Element visibility toggles */}
            <div className="flex flex-wrap gap-2">
              {availableElements.filter(el => el.id !== 'qr_cta').map(element => {
                const isLockedInMode = currentStandbyMode === 'furore_qr' && requiredFuroreQrElements.includes(element.id);
                const isVisible = isElementVisibleInPreview(element);

                return (
                  <button
                    key={element.id}
                    onClick={() => {
                      if (isLockedInMode) return;
                      updateSetting(element.showKey, !settings[element.showKey]);
                    }}
                    disabled={!canManage || isLockedInMode}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      isVisible
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground border border-transparent",
                      isLockedInMode && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {element.label}
                    {isLockedInMode && <span className="text-[10px] opacity-70">• fisso</span>}
                  </button>
                );
              })}
            </div>

            {/* Drag instruction */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Move className="w-4 h-4" />
              <span>Trascina gli elementi per posizionarli</span>
            </div>

            {/* Preview Canvas - 16:9 aspect ratio, responsive */}
            <div className="flex justify-center">
              <motion.div
                ref={previewRef}
                className={cn(
                  "relative rounded-xl overflow-hidden",
                  "ring-1 ring-border/50 shadow-xl",
                  "touch-none select-none",
                  "w-full max-w-[480px] aspect-video",
                  currentStandbyMode === 'furore' || currentStandbyMode === 'furore_qr' 
                    ? "bg-gradient-to-br from-orange-950 via-black to-red-950" 
                    : "bg-gradient-to-br from-gray-900 via-black to-gray-900",
                  dragging && "ring-2 ring-primary/50"
                )}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {/* Ambient effects */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/20 rounded-full blur-[60px] opacity-50" />
                  <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-500/15 rounded-full blur-[40px] opacity-50" />
                </div>

                {/* Center guides */}
                <AnimatePresence>
                  {centeredH && (
                    <motion.div
                      className="absolute top-0 bottom-0 w-0.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-emerald-500"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                    />
                  )}
                  {centeredV && (
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 top-1/2 -translate-y-1/2 z-20 pointer-events-none bg-emerald-500"
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                    />
                  )}
                </AnimatePresence>

                {/* Draggable elements */}
                {visibleElements.map(element => {
                  const pos = getPosition(element.id);
                  const colors = ELEMENT_COLORS[element.id];
                  const isDragging = dragging === element.id;

                    return (
                    <motion.div
                      key={element.id}
                      className={cn(
                        "absolute flex items-center gap-1.5 px-3 py-2 rounded-lg",
                        "cursor-grab active:cursor-grabbing backdrop-blur-md",
                        `bg-gradient-to-r ${colors.bg} border ${colors.border}`,
                        isDragging && "shadow-lg ring-2 ring-white/50"
                      )}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isDragging ? 50 : 30,
                        minWidth: 44,
                        minHeight: 32,
                      }}
                      animate={{ scale: isDragging ? 1.1 : 1 }}
                      onPointerDown={(e) => handlePointerDown(e, element.id)}
                    >
                      <span className="text-white/90">{element.icon}</span>
                      <span className="text-[11px] font-medium text-white whitespace-nowrap">{element.label}</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Hidden elements legend */}
            {hiddenElements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                <span className="text-xs text-muted-foreground mr-2">Nascosti:</span>
                {hiddenElements.map(element => (
                  <Badge key={element.id} variant="outline" className="text-xs opacity-50">
                    {element.label}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Schermata di Attesa (Standby) */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    Schermata di Attesa (Standby)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Scegli cosa mostrare sulla TV quando non stai trasmettendo testi
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {STANDBY_MODE_OPTIONS.map((opt) => {
                      const isSelected = currentStandbyMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleStandbyModeSelect(opt.value, opt.label)}
                          disabled={!canManage}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                              : "border-border hover:border-primary/40 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{opt.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Logo scale slider - only visible when logo mode is selected */}
                  {currentStandbyMode === 'logo' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Dimensione Logo</Label>
                        <span className="text-sm font-mono text-muted-foreground">
                          {(session as any)?.tv_logo_scale || 100}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={300}
                        step={10}
                        value={(session as any)?.tv_logo_scale || 100}
                        onChange={(e) => {
                          if (!canManage) return;
                          syncUpdate({ tv_logo_scale: parseInt(e.target.value) } as any);
                        }}
                        disabled={!canManage}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>50%</span>
                        <span>100%</span>
                        <span>200%</span>
                        <span>300%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Testi */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Testi
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="tv-title">Titolo principale</Label>
                      <div className="flex gap-1.5">
                        <Input
                          id="tv-title"
                          value={settings.tv_title}
                          onChange={(e) => updateSetting('tv_title', e.target.value)}
                          placeholder="(vuoto – non mostrato)"
                          disabled={!canManage}
                          className="flex-1"
                        />
                        {settings.tv_title !== '' && (
                          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => updateSetting('tv_title', '')} disabled={!canManage}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="tv-subtitle">Sottotitolo</Label>
                      <div className="flex gap-1.5">
                        <Input
                          id="tv-subtitle"
                          value={settings.tv_subtitle}
                          onChange={(e) => updateSetting('tv_subtitle', e.target.value)}
                          placeholder="(vuoto – non mostrato)"
                          disabled={!canManage}
                          className="flex-1"
                        />
                        {settings.tv_subtitle !== '' && (
                          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => updateSetting('tv_subtitle', '')} disabled={!canManage}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="tv-footer">Footer</Label>
                      <div className="flex gap-1.5">
                        <Input
                          id="tv-footer"
                          value={settings.tv_footer}
                          onChange={(e) => updateSetting('tv_footer', e.target.value)}
                          placeholder="(vuoto – non mostrato)"
                          disabled={!canManage}
                          className="flex-1"
                        />
                        {settings.tv_footer !== '' && (
                          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => updateSetting('tv_footer', '')} disabled={!canManage}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="tv-qr-cta">Testo CTA QR Code</Label>
                      <div className="flex gap-1.5">
                        <Input
                          id="tv-qr-cta"
                          value={settings.tv_qr_cta}
                          onChange={(e) => updateSetting('tv_qr_cta', e.target.value)}
                          placeholder="(vuoto – non mostrato)"
                          disabled={!canManage}
                          className="flex-1"
                        />
                        {settings.tv_qr_cta !== '' && (
                          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => updateSetting('tv_qr_cta', '')} disabled={!canManage}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Logo
                  </h4>
                  
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <div>
                      <Label>Carica Logo</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            // Max 2MB
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('Il file è troppo grande (max 2MB)');
                              return;
                            }
                            
                            try {
                              const fileName = `tv-logo-${Date.now()}.${file.name.split('.').pop()}`;
                              const { data, error } = await supabase.storage
                                .from('community-images')
                                .upload(fileName, file, { upsert: true });
                              
                              if (error) throw error;
                              
                              const { data: { publicUrl } } = supabase.storage
                                .from('community-images')
                                .getPublicUrl(fileName);
                              
                              updateSetting('tv_logo_url', publicUrl);
                              toast.success('Logo caricato!');
                            } catch (err) {
                              console.error('Upload error:', err);
                              toast.error('Errore nel caricamento');
                            }
                          }}
                          disabled={!canManage}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                            "bg-muted/50 hover:bg-muted border-border",
                            !canManage && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Carica immagine</span>
                        </label>
                        
                        {settings.tv_logo_url && (
                          <div className="flex items-center gap-2">
                            <img 
                              src={settings.tv_logo_url} 
                              alt="Logo preview" 
                              className="h-10 w-auto object-contain rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateSetting('tv_logo_url', '')}
                              disabled={!canManage}
                              className="h-8 w-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG o WebP. Max 2MB.
                      </p>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">oppure</div>
                    
                    <div>
                      <Label htmlFor="tv-logo-url">URL Logo esterno</Label>
                      <Input
                        id="tv-logo-url"
                        value={settings.tv_logo_url}
                        onChange={(e) => updateSetting('tv_logo_url', e.target.value)}
                        placeholder="https://esempio.com/logo.png"
                        disabled={!canManage}
                      />
                    </div>
                  </div>
                </div>

                {/* Standby Mode */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    Schermata di Attesa (Standby)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Scegli cosa mostrare sulla TV quando non stai trasmettendo testi
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {STANDBY_MODE_OPTIONS.map(opt => {
                      const isSelected = currentStandbyMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          disabled={!canManage}
                          onClick={() => handleStandbyModeSelect(opt.value, opt.label)}
                          className={cn(
                            "p-3 rounded-lg border text-left text-sm transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </h4>
                  
                  <div>
                    <Label htmlFor="tv-qr-url">Destinazione QR Code</Label>
                    <Input
                      id="tv-qr-url"
                      value={settings.tv_qr_url}
                      onChange={(e) => updateSetting('tv_qr_url', e.target.value)}
                      placeholder="https://nonceduo.com"
                      disabled={!canManage}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: https://nonceduo.com - Puoi inserire qualsiasi URL
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
