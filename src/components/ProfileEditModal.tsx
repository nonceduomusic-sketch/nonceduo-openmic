import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, Eye, EyeOff, User as UserIcon, Mail, Lock, AtSign } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  profile: Profile | null;
  onProfileUpdate: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  open,
  onOpenChange,
  user,
  profile,
  onProfileUpdate,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'email' | 'password'>('profile');

  useEffect(() => {
    if (open && profile && user) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setEmail(user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open, profile, user]);

  const handleUpdateProfile = async () => {
    if (!profile || !user) return;
    
    setIsProcessing(true);
    try {
      // Update display name and username in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profilo aggiornato con successo!');
      onProfileUpdate();
      setActiveSection('profile');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Errore durante l\'aggiornamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user) return;
    
    if (!email.trim() || !email.includes('@')) {
      toast.error('Inserisci un\'email valida');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) throw error;

      toast.success('Email di conferma inviata! Controlla la tua casella di posta.');
      setActiveSection('profile');
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(error.message || 'Errore durante l\'aggiornamento email');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Le password non corrispondono');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password aggiornata con successo!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setActiveSection('profile');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Errore durante l\'aggiornamento password');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Profilo</DialogTitle>
          <DialogDescription>
            Modifica le informazioni del tuo account
          </DialogDescription>
        </DialogHeader>

        {/* Section Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeSection === 'profile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('profile')}
            className="flex-1"
          >
            <UserIcon className="w-4 h-4 mr-1" />
            Profilo
          </Button>
          <Button
            variant={activeSection === 'email' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('email')}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
          <Button
            variant={activeSection === 'password' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('password')}
            className="flex-1"
          >
            <Lock className="w-4 h-4 mr-1" />
            Password
          </Button>
        </div>

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome visualizzato</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="username"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Solo lettere minuscole, numeri e underscore
              </p>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Salva Modifiche
            </Button>
          </div>
        )}

        {/* Email Section */}
        {activeSection === 'email' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Nuova Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nuova@email.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Riceverai un'email di conferma al nuovo indirizzo
              </p>
            </div>

            <Button
              onClick={handleUpdateEmail}
              disabled={isProcessing || email === user?.email}
              className="w-full"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Aggiorna Email
            </Button>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nuova Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nuova password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Conferma password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Minimo 6 caratteri
            </p>

            <Button
              onClick={handleUpdatePassword}
              disabled={isProcessing || !newPassword || newPassword !== confirmPassword}
              className="w-full"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Aggiorna Password
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
