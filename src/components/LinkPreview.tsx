import React from 'react';
import { ExternalLink, Play, Music, Video, Globe, Twitter, Instagram } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  platform?: string;
}

// Platform detection and icons
const getPlatformInfo = (url: string): { name: string; icon: React.ReactNode; color: string } => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return { name: 'YouTube', icon: <Play className="w-4 h-4" />, color: 'text-red-500' };
  }
  if (urlLower.includes('tiktok.com')) {
    return { name: 'TikTok', icon: <Music className="w-4 h-4" />, color: 'text-pink-500' };
  }
  if (urlLower.includes('spotify.com')) {
    return { name: 'Spotify', icon: <Music className="w-4 h-4" />, color: 'text-green-500' };
  }
  if (urlLower.includes('instagram.com')) {
    return { name: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'text-purple-500' };
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return { name: 'X', icon: <Twitter className="w-4 h-4" />, color: 'text-blue-400' };
  }
  if (urlLower.includes('twitch.tv')) {
    return { name: 'Twitch', icon: <Video className="w-4 h-4" />, color: 'text-purple-400' };
  }
  
  return { name: 'Link', icon: <Globe className="w-4 h-4" />, color: 'text-muted-foreground' };
};

// Extract domain from URL
const getDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url;
  }
};

interface LinkPreviewProps {
  url: string;
  preview?: LinkPreviewData;
  compact?: boolean;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, preview, compact = false }) => {
  const platform = getPlatformInfo(url);
  const domain = getDomain(url);
  
  // Simple title extraction from URL if no preview
  const displayTitle = preview?.title || domain;
  const displayDesc = preview?.description?.substring(0, 100) || '';

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-sm transition-colors"
      >
        <span className={platform.color}>{platform.icon}</span>
        <span className="text-muted-foreground truncate max-w-[200px]">{domain}</span>
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${platform.color}`}>
          {platform.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {platform.name}
            </span>
          </div>
          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {displayTitle}
          </p>
          {displayDesc && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
              {displayDesc}
            </p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
      </div>
    </a>
  );
};

// URL detector for content
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.match(urlRegex) || [];
};
