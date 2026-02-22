import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SocialAuthProvider } from "@/contexts/SocialAuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/ThemeProvider";
import { InstallBanner } from "@/components/InstallBanner";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";
import { AssistantContextProvider } from "@/contexts/AssistantContext";
import Home from "./pages/Home";
import OpenMic from "./pages/OpenMic";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import AdminReset from "./pages/AdminReset";
import AdminManual from "./pages/AdminManual";
import JoinChat from "./pages/JoinChat";
import PartyBand from "./pages/PartyBand";
import Social from "./pages/Social";
import SocialAuth from "./pages/SocialAuth";
import SocialDashboard from "./pages/SocialDashboard";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import AppLauncher from "./pages/AppLauncher";
import AppOpenMic from "./pages/AppOpenMic";
import AppDediche from "./pages/AppDediche";
import OpenMicInfo from "./pages/OpenMicInfo";
import DedicheInfo from "./pages/DedicheInfo";
import EventoLive from "./pages/EventoLive";
import Installa from "./pages/Installa";
import PromoLocali from "./pages/PromoLocali";
import PromoEventi from "./pages/PromoEventi";
import PromoMatrimoni from "./pages/PromoMatrimoni";
import PromoFestePiazza from "./pages/PromoFestePiazza";
import Collabora from "./pages/Collabora";
import Lyrics from "./pages/Lyrics";
import Trasmetti from "./pages/Trasmetti";
import Telecomando from "./pages/Telecomando";
import SongbookLive from "./pages/SongbookLive";
import Partiture from "./pages/Partiture";

const queryClient = new QueryClient();

const AppContent = () => (
  <>
    <ScrollToTop />
    <InstallBanner />
    <AssistantProvider />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/partyband" element={<PartyBand />} />
      {/* SITO (vetrina) */}
      <Route path="/openmic" element={<OpenMicInfo />} />
      <Route path="/messaggi" element={<DedicheInfo />} />
      
      {/* Privacy Policy - GDPR */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/informativa-privacy" element={<Privacy />} />
      
      {/* PWA Install page */}
      <Route path="/installa" element={<Installa />} />

      {/* Promo Pages - per target */}
      <Route path="/collabora" element={<Collabora />} />
      <Route path="/promo/locali" element={<PromoLocali />} />
      <Route path="/promo/eventi" element={<PromoEventi />} />
      <Route path="/promo/feste-piazza" element={<PromoFestePiazza />} />
      <Route path="/promo/matrimoni" element={<PromoMatrimoni />} />

      {/* APP (launcher + live) */}
      <Route path="/app" element={<AppLauncher />} />
      <Route path="/app/openmic" element={<AppOpenMic />} />
      <Route path="/app/dediche" element={<AppDediche />} />
      
      {/* Lyrics page - Spotify-like design */}
      <Route path="/lyrics/:id" element={<Lyrics />} />
      
      {/* Trasmetti - TV broadcast page for karaoke */}
      <Route path="/trasmetti" element={<Trasmetti />} />
      <Route path="/trasmetti/:salaCode" element={<Trasmetti />} />
      
      {/* Telecomando - Remote control for broadcast (public access with PIN) */}
      <Route path="/telecomando/:token" element={<Telecomando />} />
      
      {/* SongBook Live - ChordPro viewer with sync */}
      <Route path="/songbook-live" element={<SongbookLive />} />
      <Route path="/partiture" element={<Partiture />} />

      {/* Legacy routes (keep existing behavior for now) */}
      <Route path="/openmic/live" element={<OpenMic />} />
      <Route path="/messaggi/live" element={<Messages appMode />} />
      <Route path="/join/:code" element={<JoinChat />} />
      <Route path="/evento-live/:linkCode" element={<EventoLive />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/reset" element={<AdminReset />} />
      <Route path="/admin/manual" element={<AdminManual />} />
      {/* Social Platform Routes */}
      <Route path="/social" element={<Social />} />
      <Route path="/social/auth" element={<SocialAuth />} />
      <Route path="/social/dashboard" element={<SocialDashboard />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SocialAuthProvider>
        <AssistantContextProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </AssistantContextProvider>
      </SocialAuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
