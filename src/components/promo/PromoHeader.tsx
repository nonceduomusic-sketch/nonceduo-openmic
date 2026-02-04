import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import brandLogo from '@/assets/brand-logo-text.png';

interface PromoHeaderProps {
  accentColor?: 'pink' | 'cyan' | 'gold';
  pageTitle?: string;
}

// Map routes to readable names
const routeNames: Record<string, string> = {
  '/collabora': 'Collabora',
  '/promo/locali': 'Locali & Club',
  '/promo/eventi': 'Eventi Privati',
  '/promo/matrimoni': 'Matrimoni',
  '/promo/feste-piazza': 'Feste di Piazza',
};

export const PromoHeader: React.FC<PromoHeaderProps> = ({ accentColor = 'pink', pageTitle }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const displayTitle = pageTitle || routeNames[currentPath] || '';
  
  // Check if we're on a sub-page (promo pages)
  const isSubPage = currentPath.startsWith('/promo/');
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-sm"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side: Back/Home + Logo + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Back/Home button - elegant circular */}
            <Link 
              to={isSubPage ? "/collabora" : "/"} 
              className="flex-shrink-0 w-9 h-9 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-accent/10 hover:border-primary/40 transition-all duration-300 group"
              title={isSubPage ? "Tutte le collaborazioni" : "Home"}
            >
              {isSubPage ? (
                <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              ) : (
                <Home className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </Link>
            
            {/* Logo - hidden on mobile if breadcrumb is present */}
            <Link to="/" className={`hover:opacity-80 transition-opacity ${isSubPage ? 'hidden sm:block' : ''}`}>
              <img 
                src={brandLogo} 
                alt="Non c'è Duo" 
                className="h-7 md:h-8 w-auto"
              />
            </Link>

            {/* Breadcrumb - elegant and subtle */}
            {isSubPage && (
              <nav className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
                <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0" />
                <Link 
                  to="/collabora" 
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  Collabora
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {displayTitle}
                </span>
              </nav>
            )}
            
            {/* Mobile breadcrumb - simplified */}
            {isSubPage && (
              <div className="sm:hidden flex items-center gap-1.5 text-sm min-w-0">
                <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {displayTitle}
                </span>
              </div>
            )}
          </div>

          {/* Right side: Quick links + WhatsApp */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick link to other category - desktop only */}
            <Link 
              to="/collabora"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all"
            >
              Tutte le collaborazioni
            </Link>
            
            {/* WhatsApp CTA - always visible */}
            <a
              href="https://wa.me/393807911941?text=Ciao! Vorrei informazioni su Non c'è Duo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#25D366] text-white font-semibold text-xs hover:bg-[#20BD5A] transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="hidden xs:inline">Contattaci</span>
            </a>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default PromoHeader;
