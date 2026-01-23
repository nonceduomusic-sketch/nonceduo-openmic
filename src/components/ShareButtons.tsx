import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Twitter, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ShareButtonsProps {
  url: string;
  title?: string;
  text?: string;
  type?: 'post' | 'group';
  compact?: boolean;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  url,
  title = 'Non C\'è Duo',
  text,
  type = 'post',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  // Generate viral share text
  const getShareText = () => {
    if (text) return text;
    
    const viralMessages = [
      'Questa roba è folle 🔥',
      'Devi vedere questo 👀',
      'Ma che roba assurda 😂',
      'Non ci credo 🤯',
      'Troppo strong 💪',
    ];
    const randomMessage = viralMessages[Math.floor(Math.random() * viralMessages.length)];
    
    return type === 'group' 
      ? `Unisciti al gruppo "${title}" su Non C'è Duo: challenge, meme e roast! 🎤`
      : `${randomMessage} - Entra su nonceduo e commenta:`;
  };

  const shareText = getShareText();
  const fullShareText = `${shareText} ${url}`;

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiato! 📋');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Errore nel copiare');
    }
  };

  // Native share (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('Condivisione annullata');
        }
      }
    } else {
      handleCopy();
    }
  };

  // Platform-specific shares
  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-primary"
        onClick={handleNativeShare}
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Condividi</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-primary"
        >
          <Share2 className="w-4 h-4" />
          <span>Condividi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={shareToWhatsApp} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4 text-green-500" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter} className="gap-2 cursor-pointer">
          <Twitter className="w-4 h-4 text-blue-400" />
          X / Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTelegram} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
          <Share2 className="w-4 h-4" />
          Altro...
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              Copiato!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copia link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Quick share button for inline use
export const QuickShareButton: React.FC<{ url: string; className?: string }> = ({ url, className }) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiato! 📋');
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`p-2 rounded-full hover:bg-muted transition-colors ${className}`}
      title="Condividi"
    >
      <Share2 className="w-4 h-4" />
    </button>
  );
};
