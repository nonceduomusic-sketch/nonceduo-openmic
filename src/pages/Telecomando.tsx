function RemoteOnlyControls({
  lines,
  highlightLine,
  isBroadcasting,
  onScrollUp,
  onScrollDown,
}: RemoteOnlyControlsProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const controlsRef = React.useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = React.useState(0);

  // Misura l'altezza reale della pulsantiera
  React.useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const update = () => setControlsHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Centra perfettamente la riga evidenziata (calcolo manuale)
  React.useLayoutEffect(() => {
    if (!isBroadcasting || lines.length === 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeEl = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement | null;
    if (!activeEl) return;

    // Calcolo posizione ideale per centrare la riga nel mezzo visibile
    const containerHeight = container.clientHeight;
    const visibleHeight = containerHeight - controlsHeight; // altezza realmente visibile sopra i pulsanti
    const targetScroll = activeEl.offsetTop - visibleHeight / 2 + activeEl.offsetHeight / 2;

    // Limita lo scroll per non andare oltre l'inizio/fine
    const maxScroll = container.scrollHeight - containerHeight;
    const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll));

    container.scrollTo({
      top: clampedScroll,
      behavior: "smooth",
    });
  }, [highlightLine, isBroadcasting, lines.length, controlsHeight]);

  if (!isBroadcasting || lines.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-6">
        <div>
          <Mic className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">In attesa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* Area testo scrollabile */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-scroll overscroll-contain px-5 pt-6"
        style={{
          paddingBottom: Math.max(controlsHeight + 40, 180), // ridotto un po' ma ancora sicuro
          paddingTop: 80,
        }}
      >
        {/* Indicatore riga corrente */}
        <div className="text-sm text-muted-foreground mb-5 text-center sticky top-0 bg-background/90 backdrop-blur-md py-3 -mx-5 px-5 z-10 shadow-sm">
          Riga {highlightLine + 1} di {lines.length}
        </div>

        {/* Testo */}
        <div className="space-y-4 text-center max-w-lg mx-auto pb-10">
          {lines.map((line, index) => {
            const isHighlighted = highlightLine === index;
            const distance = Math.abs(highlightLine - index);

            return (
              <div
                key={index}
                data-line={index}
                className={cn(
                  "px-5 py-4 rounded-xl text-base leading-relaxed transition-all duration-300",
                  isHighlighted && "bg-primary text-primary-foreground font-semibold shadow-md scale-[1.02]",
                  !isHighlighted && "text-muted-foreground",
                  distance === 1 && "opacity-85",
                  distance === 2 && "opacity-65",
                  distance > 2 && "opacity-40",
                )}
              >
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pulsantiera in basso */}
      <div ref={controlsRef} className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t z-50">
        <div className="p-5 pb-[max(48px, env(safe-area-inset-bottom))] max-w-md mx-auto">
          {/* Progress bar */}
          <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: lines.length > 0 ? `${((highlightLine + 1) / lines.length) * 100}%` : "0%" }}
            />
          </div>

          {/* Pulsanti */}
          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              variant="outline"
              className={cn(
                "h-20 text-xl font-bold rounded-2xl transition-all active:scale-95 shadow-sm",
                highlightLine === 0 && "opacity-40 cursor-not-allowed",
              )}
              onClick={onScrollUp}
              disabled={highlightLine === 0}
            >
              <ChevronUp className="w-10 h-10 mr-3" />
              INDIETRO
            </Button>

            <Button
              size="lg"
              className={cn(
                "h-20 text-xl font-bold rounded-2xl transition-all active:scale-95 shadow-sm",
                highlightLine >= lines.length - 1 && "opacity-40 cursor-not-allowed",
              )}
              onClick={onScrollDown}
              disabled={highlightLine >= lines.length - 1}
            >
              AVANTI
              <ChevronDown className="w-10 h-10 ml-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
