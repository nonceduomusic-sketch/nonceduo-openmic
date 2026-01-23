import React from 'react';
import { Link } from 'react-router-dom';
import { Mic2, Shield } from 'lucide-react';

interface SiteFooterProps {
  variant?: 'default' | 'minimal' | 'social';
  showLogo?: boolean;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ 
  variant = 'default',
  showLogo = true 
}) => {
  const currentYear = new Date().getFullYear();

  if (variant === 'minimal') {
    return (
      <footer className="py-4 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <span>© {currentYear} Non C'è Duo</span>
            <span className="hidden sm:inline">•</span>
            <Link 
              to="/privacy" 
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Informativa Privacy
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === 'social') {
    return (
      <footer className="py-6 border-t border-border/50 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/openmic" className="text-muted-foreground hover:text-foreground transition-colors">
                Open Mic
              </Link>
              <Link to="/messaggi" className="text-muted-foreground hover:text-foreground transition-colors">
                Dediche
              </Link>
              <Link 
                to="/privacy" 
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                Privacy
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {currentYear} Non C'è Duo. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Default variant
  return (
    <footer className="py-8 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {showLogo && (
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold neon-text-pink">Non C'è Duo</span>
            </Link>
          )}
          
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/openmic" className="text-muted-foreground hover:text-primary transition-colors">
              Open Mic
            </Link>
            <Link to="/social" className="text-muted-foreground hover:text-primary transition-colors">
              Community
            </Link>
            <Link to="/partyband" className="text-muted-foreground hover:text-primary transition-colors">
              Party Band
            </Link>
            <Link 
              to="/privacy" 
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Privacy
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} Non C'è Duo. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
