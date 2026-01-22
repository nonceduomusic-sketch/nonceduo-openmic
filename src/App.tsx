import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocialAuthProvider } from "@/contexts/SocialAuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SocialAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/partyband" element={<PartyBand />} />
            <Route path="/openmic" element={<OpenMic />} />
            <Route path="/messaggi" element={<Messages />} />
            <Route path="/join/:code" element={<JoinChat />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </SocialAuthProvider>
  </QueryClientProvider>
);

export default App;
