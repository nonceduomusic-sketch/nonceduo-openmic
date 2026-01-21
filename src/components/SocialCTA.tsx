import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SocialCTAProps {
  variant?: 'inline' | 'card' | 'banner';
  className?: string;
}

export const SocialCTA: React.FC<SocialCTAProps> = ({ variant = 'inline', className = '' }) => {
  if (variant === 'banner') {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30" />
        <div className="absolute inset-0 backdrop-blur-xl" />
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold font-orbitron">Unisciti alla Community!</h3>
              <p className="text-sm text-muted-foreground">
                Chat private, gruppi e tanto altro
              </p>
            </div>
          </div>
          <Link to="/social">
            <Button 
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 group whitespace-nowrap"
            >
              Scopri di più
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Link to="/social" className={`block ${className}`}>
        <div className="group relative overflow-hidden rounded-2xl bg-card/50 border border-border/50 hover:border-primary/50 transition-all duration-300 p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Community</h3>
              <p className="text-sm text-muted-foreground">Entra nella famiglia</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>
    );
  }

  // Inline variant (default)
  return (
    <Link to="/social" className={className}>
      <Button 
        variant="outline" 
        className="border-primary/50 hover:border-primary hover:bg-primary/10 group"
      >
        <Sparkles className="w-4 h-4 mr-2 text-primary" />
        Community
        <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </Button>
    </Link>
  );
};
