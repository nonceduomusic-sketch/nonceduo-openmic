import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'ncd_install_banner_dismissed';

export const InstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed or dismissed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone === true;
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    
    if (isStandalone || isDismissed) {
      setShowBanner(false);
      return;
    }

    // Check if mobile or tablet browser (show on both)
    const ua = navigator.userAgent.toLowerCase();
    const isMobileOrTablet = /iphone|ipad|ipod|android|mobile|tablet/.test(ua);
    
    if (!isMobileOrTablet) {
      setShowBanner(false);
      return;
    }

    // Show banner on mobile and tablet browsers
    setShowBanner(true);

    // Listen for install prompt (Android Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed
    const handleInstalled = () => {
      setShowBanner(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    };

    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      setInstallPrompt(null);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="glass-card border border-primary/30 rounded-xl p-3 flex items-center gap-3 shadow-lg shadow-primary/10">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            Installa Non C'è Duo
          </p>
          <p className="text-xs text-muted-foreground">
            Accesso rapido senza browser
          </p>
        </div>

        {installPrompt ? (
          <Button 
            size="sm" 
            className="neon-button-pink flex-shrink-0"
            onClick={handleInstallClick}
          >
            Installa
          </Button>
        ) : (
          <Link to="/installa">
            <Button size="sm" className="neon-button-pink flex-shrink-0">
              Scopri
            </Button>
          </Link>
        )}

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
