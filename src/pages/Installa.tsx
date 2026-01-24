import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Share, 
  MoreVertical, 
  Plus, 
  Check, 
  Smartphone,
  Home,
  ExternalLink,
  ChevronDown,
  Mic2
} from "lucide-react";
import { SEO } from "@/components/SEO";

type DeviceType = "ios" | "android" | "desktop" | "unknown";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Installa: React.FC = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAllInstructions, setShowAllInstructions] = useState(false);

  useEffect(() => {
    // Detect device type
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    if (isIOS) {
      setDeviceType("ios");
    } else if (isAndroid) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  const AndroidInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">1</span>
        </div>
        <div>
          <p className="font-medium text-foreground">Apri il menu del browser</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tocca i tre puntini <MoreVertical className="inline w-4 h-4" /> in alto a destra
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">2</span>
        </div>
        <div>
          <p className="font-medium text-foreground">Seleziona "Installa app"</p>
          <p className="text-sm text-muted-foreground mt-1">
            Oppure "Aggiungi a schermata Home"
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="font-medium text-foreground">Fatto!</p>
          <p className="text-sm text-muted-foreground mt-1">
            L'app apparirà nella tua schermata home
          </p>
        </div>
      </div>

      {installPrompt && (
        <Button 
          onClick={handleInstallClick}
          className="w-full h-14 text-lg neon-button-pink mt-6"
        >
          <Download className="w-5 h-5 mr-2" />
          Installa Ora
        </Button>
      )}
    </div>
  );

  const IOSInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">1</span>
        </div>
        <div>
          <p className="font-medium text-foreground">Tocca il pulsante Condividi</p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            L'icona <Share className="inline w-4 h-4" /> in basso (Safari)
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">2</span>
        </div>
        <div>
          <p className="font-medium text-foreground">Scorri e trova</p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            "Aggiungi a Home" <Plus className="inline w-4 h-4 p-0.5 border rounded" />
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">3</span>
        </div>
        <div>
          <p className="font-medium text-foreground">Conferma con "Aggiungi"</p>
          <p className="text-sm text-muted-foreground mt-1">
            In alto a destra dello schermo
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 glass-card">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="font-medium text-foreground">Fatto!</p>
          <p className="text-sm text-muted-foreground mt-1">
            L'app apparirà nella tua schermata home
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <p className="text-sm text-amber-200">
          <strong>Importante:</strong> Devi usare Safari per installare l'app su iPhone/iPad. 
          Se stai usando Chrome o un altro browser, apri questo link in Safari.
        </p>
      </div>
    </div>
  );

  const DesktopInstructions = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Per la migliore esperienza, apri questa pagina sul tuo smartphone
        </p>
      </div>

      <div className="p-4 glass-card">
        <p className="font-medium text-foreground mb-2">Su Chrome desktop:</p>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Clicca sull'icona di installazione nella barra degli indirizzi</li>
          <li>Oppure vai su Menu → "Installa Non C'è Duo..."</li>
        </ol>
      </div>

      {installPrompt && (
        <Button 
          onClick={handleInstallClick}
          className="w-full h-12 neon-button-pink mt-4"
        >
          <Download className="w-5 h-5 mr-2" />
          Installa su questo computer
        </Button>
      )}
    </div>
  );

  const AlreadyInstalled = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-accent to-green-500 flex items-center justify-center shadow-lg">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">
        App già installata!
      </h2>
      <p className="text-muted-foreground mb-6">
        Stai già usando l'app. Fantastico! 🎉
      </p>
      <Link to="/app">
        <Button className="neon-button-cyan">
          Vai all'App
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );

  return (
    <>
      <SEO 
        title="Installa l'App | Non C'è Duo"
        description="Installa l'app Non C'è Duo sul tuo smartphone per un'esperienza ottimale durante le serate live."
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Gradient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-10 p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold neon-text-pink">Non C'è Duo</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md">
            {isInstalled ? (
              <Card className="glass-card border-accent/30">
                <CardContent className="p-6">
                  <AlreadyInstalled />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Hero */}
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary via-accent to-secondary p-[2px] shadow-lg shadow-primary/20 animate-pulse">
                    <div className="w-full h-full rounded-3xl bg-background flex items-center justify-center">
                      <Download className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                    Installa l'App
                  </h1>
                  <p className="text-muted-foreground">
                    Accedi più velocemente durante le serate live
                  </p>
                </div>

                {/* Device-specific instructions */}
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        deviceType === "ios" 
                          ? "bg-secondary/20 text-secondary" 
                          : deviceType === "android"
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {deviceType === "ios" && "iPhone/iPad"}
                        {deviceType === "android" && "Android"}
                        {deviceType === "desktop" && "Desktop"}
                        {deviceType === "unknown" && "Dispositivo"}
                      </div>
                    </div>

                    {deviceType === "ios" && <IOSInstructions />}
                    {deviceType === "android" && <AndroidInstructions />}
                    {deviceType === "desktop" && <DesktopInstructions />}
                    {deviceType === "unknown" && <AndroidInstructions />}
                  </CardContent>
                </Card>

                {/* Show other instructions toggle */}
                {deviceType !== "desktop" && (
                  <button
                    onClick={() => setShowAllInstructions(!showAllInstructions)}
                    className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAllInstructions ? "Nascondi" : "Hai un altro dispositivo?"}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllInstructions ? "rotate-180" : ""}`} />
                  </button>
                )}

                {showAllInstructions && (
                  <Card className="glass-card mt-4">
                    <CardContent className="p-6">
                      <h3 className="font-medium text-foreground mb-4">
                        {deviceType === "ios" ? "Istruzioni per Android" : "Istruzioni per iPhone/iPad"}
                      </h3>
                      {deviceType === "ios" ? <AndroidInstructions /> : <IOSInstructions />}
                    </CardContent>
                  </Card>
                )}

                {/* Benefits */}
                <div className="mt-8 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground text-center mb-4">
                    Perché installare l'app?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: "⚡", text: "Accesso istantaneo" },
                      { icon: "📱", text: "Esperienza nativa" },
                      { icon: "🔔", text: "Notifiche live" },
                      { icon: "🎤", text: "Open Mic facile" },
                    ].map((benefit, i) => (
                      <div key={i} className="p-3 glass-card text-center">
                        <span className="text-xl mb-1 block">{benefit.icon}</span>
                        <span className="text-xs text-muted-foreground">{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="font-display font-bold neon-text-pink">Non C'è Duo</span>
            {" "}· Musica Live
          </p>
        </footer>
      </div>
    </>
  );
};

export default Installa;
