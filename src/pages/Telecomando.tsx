 import React, { useState, useEffect, useMemo, useRef } from 'react';
 import { useParams } from 'react-router-dom';
import { useBroadcastRemoteUser, useRemoteControl } from '@/hooks/useBroadcastRemote';
 import { useBroadcast } from '@/hooks/useBroadcast';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { 
   ChevronUp, ChevronDown, Play, Pause, Eye, Smartphone, 
   Wifi, WifiOff, AlertTriangle, Lock, Tv, Mic
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import brandLogoText from '@/assets/brand-logo-text.png';
 
 type ViewMode = 'preview' | 'remote';
 
 export default function Telecomando() {
   const { token } = useParams<{ token: string }>();
   const { 
     isValidated, 
     accessInfo, 
    sessionId,
     loading: authLoading, 
     tokenExists,
     isKicked,
     validatePIN 
   } = useBroadcastRemoteUser(token);
   
   const [pin, setPin] = useState('');
   const [validating, setValidating] = useState(false);
   const [viewMode, setViewMode] = useState<ViewMode>('preview');
 
   // Handle PIN submission
   const handlePINSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!pin.trim()) return;
     
     setValidating(true);
     await validatePIN(pin);
     setValidating(false);
   };
 
   // Loading state
   if (authLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="animate-pulse text-muted-foreground">Caricamento...</div>
       </div>
     );
   }
 
   // Token non valido
   if (!tokenExists) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center p-4">
         <Card className="max-w-md w-full">
           <CardContent className="pt-6 text-center">
             <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
             <h1 className="text-xl font-bold mb-2">Link non valido</h1>
             <p className="text-muted-foreground">
               Questo link di accesso al telecomando non è valido o è scaduto.
               Contatta l'amministratore per un nuovo link.
             </p>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   // Utente espulso
   if (isKicked) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center p-4">
         <Card className="max-w-md w-full">
           <CardContent className="pt-6 text-center">
             <WifiOff className="w-12 h-12 text-destructive mx-auto mb-4" />
             <h1 className="text-xl font-bold mb-2">Disconnesso</h1>
             <p className="text-muted-foreground mb-4">
               Sei stato disconnesso dal telecomando dall'amministratore.
             </p>
             <Button onClick={() => window.location.reload()}>
               Riprova accesso
             </Button>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   // Richiesta PIN
   if (!isValidated) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center p-4">
         <Card className="max-w-md w-full">
           <CardHeader className="text-center">
             <img 
               src={brandLogoText} 
               alt="NonceDuo" 
               className="h-12 mx-auto mb-4"
             />
             <CardTitle className="text-2xl">Telecomando Trasmissione</CardTitle>
             <p className="text-muted-foreground mt-2">
               {accessInfo?.name || 'Accesso Telecomando'}
             </p>
           </CardHeader>
           <CardContent>
             <form onSubmit={handlePINSubmit} className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium flex items-center gap-2">
                   <Lock className="w-4 h-4" />
                   Inserisci PIN
                 </label>
                 <Input
                   type="text"
                   inputMode="text"
                   autoComplete="off"
                   placeholder="ABC123"
                   value={pin}
                   onChange={(e) => setPin(e.target.value.toUpperCase())}
                   className="text-center text-2xl tracking-widest h-14 font-mono"
                   maxLength={6}
                   autoFocus
                 />
               </div>
               <Button 
                 type="submit" 
                 className="w-full h-12"
                 disabled={validating || pin.length < 4}
               >
                 {validating ? 'Verifica...' : 'Accedi'}
               </Button>
             </form>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   // Telecomando attivo - mostra controlli
   return (
     <RemoteControlInterface 
       salaCode={accessInfo?.salaCode || 'main'}
        sessionId={sessionId}
       viewMode={viewMode}
       onViewModeChange={setViewMode}
     />
   );
 }
 
 // Interfaccia telecomando principale
 interface RemoteControlInterfaceProps {
   salaCode: string;
  sessionId: string | null;
   viewMode: ViewMode;
   onViewModeChange: (mode: ViewMode) => void;
 }
 
function RemoteControlInterface({ salaCode, sessionId, viewMode, onViewModeChange }: RemoteControlInterfaceProps) {
  const { session } = useBroadcast(salaCode);
  const { updateHighlightLine } = useRemoteControl(sessionId, salaCode);
   const [currentSong, setCurrentSong] = useState<{ titolo: string; artista: string; testo: string | null } | null>(null);
   
   const isBroadcasting = (session as any)?.is_broadcasting ?? false;
   const highlightLine = session?.highlight_line ?? 0;
   
   const lines = useMemo(() => 
     currentSong?.testo?.split('\n').filter(line => line.trim()) || []
   , [currentSong?.testo]);
 
   // Fetch current song
   useEffect(() => {
     const fetchSong = async () => {
       if (!session?.current_song_id) {
         setCurrentSong(null);
         return;
       }
 
       const { data } = await supabase
         .from('songs')
         .select('titolo, artista, testo')
         .eq('id', session.current_song_id)
         .single();
 
       if (data) setCurrentSong(data);
     };
 
     fetchSong();
   }, [session?.current_song_id]);
 
   // Controlli scroll
   const scrollUp = async () => {
     const newLine = Math.max(0, highlightLine - 1);
      await updateHighlightLine(newLine);
   };
 
   const scrollDown = async () => {
     const newLine = Math.min(lines.length - 1, highlightLine + 1);
      await updateHighlightLine(newLine);
   };
 
   const scrollToLine = async (lineIndex: number) => {
      await updateHighlightLine(lineIndex);
   };
 
   return (
     <div className="min-h-[100dvh] bg-background flex flex-col">
       {/* Header compatto */}
       <header className="flex-shrink-0 border-b bg-card/50 backdrop-blur-sm px-4 py-3">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3 min-w-0">
             <div className={cn(
               "w-2.5 h-2.5 rounded-full flex-shrink-0",
               isBroadcasting ? "bg-green-500 animate-pulse" : "bg-muted"
             )} />
             <div className="min-w-0">
               <h1 className="font-semibold truncate text-sm">
                 {currentSong?.titolo || 'In attesa...'}
               </h1>
               {currentSong && (
                 <p className="text-xs text-muted-foreground truncate">
                   {currentSong.artista}
                 </p>
               )}
             </div>
           </div>
           
           {/* Switch vista */}
           <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
             <Button
               variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
               size="sm"
               className="h-8 px-3"
               onClick={() => onViewModeChange('preview')}
             >
               <Eye className="w-4 h-4" />
             </Button>
             <Button
               variant={viewMode === 'remote' ? 'secondary' : 'ghost'}
               size="sm"
               className="h-8 px-3"
               onClick={() => onViewModeChange('remote')}
             >
               <Smartphone className="w-4 h-4" />
             </Button>
           </div>
         </div>
       </header>
 
       {/* Contenuto principale */}
       <main className="flex-1 min-h-0 overflow-hidden">
         {viewMode === 'preview' ? (
           <PreviewWithControls 
             lines={lines}
             highlightLine={highlightLine}
             isBroadcasting={isBroadcasting}
             onScrollUp={scrollUp}
             onScrollDown={scrollDown}
             onScrollToLine={scrollToLine}
           />
         ) : (
           <RemoteOnlyControls
             lines={lines}
             highlightLine={highlightLine}
             isBroadcasting={isBroadcasting}
             onScrollUp={scrollUp}
             onScrollDown={scrollDown}
           />
         )}
       </main>
     </div>
   );
 }
 
 // Vista Preview + Controlli
 interface PreviewWithControlsProps {
   lines: string[];
   highlightLine: number;
   isBroadcasting: boolean;
   onScrollUp: () => void;
   onScrollDown: () => void;
   onScrollToLine: (line: number) => void;
 }
 
 function PreviewWithControls({
   lines,
   highlightLine,
   isBroadcasting,
   onScrollUp,
   onScrollDown,
   onScrollToLine,
 }: PreviewWithControlsProps) {
   const lyricsRef = useRef<HTMLDivElement>(null);
 
   // Auto-scroll to highlighted line
   useEffect(() => {
     if (lyricsRef.current) {
       const lineElements = lyricsRef.current.querySelectorAll('[data-line]');
       const highlightedLine = lineElements[highlightLine];
       if (highlightedLine) {
         highlightedLine.scrollIntoView({
           behavior: 'smooth',
           block: 'center',
         });
       }
     }
   }, [highlightLine]);
 
   if (!isBroadcasting || lines.length === 0) {
     return (
       <div className="h-full flex items-center justify-center text-center p-6">
         <div>
           <Tv className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
           <p className="text-muted-foreground">
             {isBroadcasting 
               ? 'Nessun testo disponibile'
               : 'Trasmissione non attiva'}
           </p>
           <p className="text-sm text-muted-foreground/70 mt-2">
             In attesa che l'admin avvii la trasmissione...
           </p>
         </div>
       </div>
     );
   }
 
   return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Preview testi - scrollabile (sopra su mobile, a sinistra su desktop) */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:border-r">
        <div 
          ref={lyricsRef}
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          <div className="space-y-2 max-w-lg mx-auto">
            {lines.map((line, index) => {
              const isHighlighted = highlightLine === index;
              const isPast = index < highlightLine;
              
              return (
                <button
                  key={index}
                  data-line={index}
                  onClick={() => onScrollToLine(index)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-all",
                    "text-sm leading-relaxed",
                    isHighlighted && "bg-primary/20 text-primary font-semibold ring-2 ring-primary/50",
                    isPast && "text-muted-foreground/50",
                    !isHighlighted && !isPast && "hover:bg-muted"
                  )}
                >
                  {line || '\u00A0'}
                </button>
              );
            })}
          </div>
         </div>
       </div>
 
      {/* Controlli fissi (sotto su mobile, a destra su desktop) */}
      <div className="flex-shrink-0 border-t md:border-t-0 bg-card/95 backdrop-blur-xl p-4 pb-[max(16px,env(safe-area-inset-bottom))] md:w-32 md:flex md:flex-col md:justify-center">
        <div className="flex items-center justify-center gap-4 md:flex-col md:gap-6">
           <Button
             size="lg"
             variant="outline"
            className="h-14 w-14 md:h-16 md:w-16 rounded-full"
             onClick={onScrollUp}
             disabled={highlightLine === 0}
           >
             <ChevronUp className="w-6 h-6" />
           </Button>
           
           <div className="text-center min-w-[80px]">
             <div className="text-2xl font-bold tabular-nums">
               {highlightLine + 1}
             </div>
             <div className="text-xs text-muted-foreground">
               di {lines.length}
             </div>
           </div>
           
           <Button
             size="lg"
             variant="outline"
            className="h-14 w-14 md:h-16 md:w-16 rounded-full"
             onClick={onScrollDown}
             disabled={highlightLine >= lines.length - 1}
           >
             <ChevronDown className="w-6 h-6" />
           </Button>
         </div>
       </div>
     </div>
   );
 }
 
 // Vista Solo Telecomando - pulsanti grandi
 interface RemoteOnlyControlsProps {
   lines: string[];
   highlightLine: number;
   isBroadcasting: boolean;
   onScrollUp: () => void;
   onScrollDown: () => void;
 }
 
 function RemoteOnlyControls({
   lines,
   highlightLine,
   isBroadcasting,
   onScrollUp,
   onScrollDown,
 }: RemoteOnlyControlsProps) {
   if (!isBroadcasting || lines.length === 0) {
     return (
       <div className="h-full flex items-center justify-center text-center p-6">
         <div>
           <Mic className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
           <p className="text-lg text-muted-foreground">
             In attesa...
           </p>
         </div>
       </div>
     );
   }
 
  // Mostra contesto: 2 righe prima, riga corrente, 2 righe dopo (5 totali)
   const currentLine = lines[highlightLine] || '';
  const prevLines = [
    lines[highlightLine - 2] || null,
    lines[highlightLine - 1] || null,
  ];
  const nextLines = [
    lines[highlightLine + 1] || null,
    lines[highlightLine + 2] || null,
  ];
 
   return (
     <div className="h-full flex flex-col p-4">
      {/* Contesto righe - mostra 5 righe totali */}
      <div className="flex-shrink-0 mb-4">
         <div className="text-sm text-muted-foreground mb-1">
           Riga {highlightLine + 1} di {lines.length}
         </div>
        
        <div className="space-y-1">
          {/* Righe precedenti */}
          {prevLines.map((line, i) => line && (
            <div 
              key={`prev-${i}`}
              className="text-xs text-muted-foreground/50 truncate px-3 py-1"
            >
              {line}
            </div>
          ))}
          
          {/* Riga corrente evidenziata */}
          <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
            <p className="text-base font-medium text-primary leading-relaxed text-center">
              {currentLine || '—'}
            </p>
           </div>
          
          {/* Righe successive */}
          {nextLines.map((line, i) => line && (
            <div 
              key={`next-${i}`}
              className="text-xs text-muted-foreground/70 truncate px-3 py-1"
            >
              {line}
            </div>
          ))}
        </div>
       </div>
 
       {/* Pulsanti grandi */}
       <div className="flex-1 flex flex-col gap-4 justify-center max-w-sm mx-auto w-full">
         <Button
           size="lg"
           variant="outline"
           className={cn(
             "h-28 text-xl font-semibold rounded-2xl",
             "transition-all active:scale-95",
             highlightLine === 0 && "opacity-30"
           )}
           onClick={onScrollUp}
           disabled={highlightLine === 0}
         >
           <ChevronUp className="w-10 h-10 mr-2" />
           INDIETRO
         </Button>
         
         <Button
           size="lg"
           className={cn(
             "h-28 text-xl font-semibold rounded-2xl",
             "transition-all active:scale-95",
             highlightLine >= lines.length - 1 && "opacity-30"
           )}
           onClick={onScrollDown}
           disabled={highlightLine >= lines.length - 1}
         >
           AVANTI
           <ChevronDown className="w-10 h-10 ml-2" />
         </Button>
       </div>
 
       {/* Barra progresso */}
       <div className="flex-shrink-0 mt-6 pb-[env(safe-area-inset-bottom)]">
         <div className="h-2 bg-muted rounded-full overflow-hidden">
           <div 
             className="h-full bg-primary transition-all duration-300"
             style={{ width: `${((highlightLine + 1) / lines.length) * 100}%` }}
           />
         </div>
       </div>
     </div>
   );
 }