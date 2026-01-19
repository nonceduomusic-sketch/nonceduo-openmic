import React, { useMemo } from 'react';
import { User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { songs } from '@/data/songs';

interface ArtistFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const ArtistFilter: React.FC<ArtistFilterProps> = ({ value, onChange }) => {
  const artists = useMemo(() => {
    const uniqueArtists = [...new Set(songs.map((s) => s.artist))].sort();
    return uniqueArtists;
  }, []);

  return (
    <div className="relative">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 bg-muted border-border focus:border-secondary focus:ring-secondary">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Filtra per artista" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-card border-border max-h-[300px]">
          <SelectItem value="all" className="focus:bg-muted">
            Tutti gli artisti
          </SelectItem>
          {artists.map((artist) => (
            <SelectItem
              key={artist}
              value={artist}
              className="focus:bg-muted"
            >
              {artist}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
