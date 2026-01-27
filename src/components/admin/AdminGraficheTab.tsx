import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Film, QrCode, Info } from 'lucide-react';
import { EventPosterGeneratorCard } from './EventPosterGeneratorCard';
import { EventStoryGeneratorCard } from './EventStoryGeneratorCard';
import { EventQRCodeCard } from './EventQRCodeCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Tab Grafiche per generazione AI di:
 * - Locandine (Post Instagram/Facebook - 1:1, 4:5)
 * - Storie (Instagram/Facebook Stories - 9:16) con QR Code
 * - QR Code standalone per stampa e WhatsApp
 * 
 * Funzionalità:
 * - Caricamento immagine di partenza (AI la modifica)
 * - Generazione da zero con tema personalizzato
 * - Campo istruzioni AI per comandi personalizzati
 * - QR code per storie (senza PIN, solo link)
 */
export const AdminGraficheTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'poster' | 'story' | 'qrcode'>('poster');

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Image className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Grafiche</h2>
          <p className="text-sm text-muted-foreground">
            Genera locandine, storie e QR code per i social
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'poster' | 'story' | 'qrcode')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="poster" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">Locandine</span>
            <span className="sm:hidden">Post</span>
          </TabsTrigger>
          <TabsTrigger value="story" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Film className="w-4 h-4" />
            <span>Storie</span>
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <QrCode className="w-4 h-4" />
            <span>QR Code</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="poster" className="mt-4">
          <EventPosterGeneratorCard />
        </TabsContent>

        <TabsContent value="story" className="mt-4">
          <EventStoryGeneratorCard />
        </TabsContent>

        <TabsContent value="qrcode" className="mt-4">
          <EventQRCodeCard />
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Alert className="bg-muted/30 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <ul className="space-y-1 mt-1">
            <li><strong>Locandine:</strong> Post Instagram (1:1), Portrait (4:5), Story (9:16)</li>
            <li><strong>Storie:</strong> Formato 9:16 ottimizzato per Instagram/Facebook Stories</li>
            <li><strong>QR Code:</strong> Per stampa (A4) e condivisione WhatsApp, con CTA accattivante</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};
