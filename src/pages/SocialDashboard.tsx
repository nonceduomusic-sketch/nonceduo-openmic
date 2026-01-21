import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';
import { 
  Home,
  MessageCircle, 
  Users, 
  Settings, 
  LogOut,
  Plus,
  Bell,
  Search,
  ChevronRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean;
  last_seen_at: string;
}

const SocialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'profile'>('chats');

  // Auth state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/social/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/social/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch or create profile
  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) return;
      
      try {
        // Try to fetch existing profile
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // If no profile exists, create one
        if (!data && !error) {
          const username = (user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + user.id.substring(0, 4);
          const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utente';
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              display_name: displayName,
              username: username,
              is_online: true,
              last_seen_at: new Date().toISOString(),
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            data = newProfile;
          }
        } else if (error) {
          console.error('Error fetching profile:', error);
        }
        
        if (data) {
          setProfile(data as Profile);
          
          // Update online status
          await supabase
            .from('profiles')
            .update({ is_online: true, last_seen_at: new Date().toISOString() })
            .eq('user_id', user.id);
        }
          
      } catch (error) {
        console.error('Error in profile management:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrCreateProfile();
    } else {
      setLoading(false);
    }
    
    // Set offline on unmount
    return () => {
      if (user) {
        supabase
          .from('profiles')
          .update({ is_online: false, last_seen_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    };
  }, [user]);

  const handleLogout = async () => {
    // Set offline before logout
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('user_id', user.id);
    }
    
    await supabase.auth.signOut();
    navigate('/social');
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Dashboard | Community Non Ce Duo"
        description="La tua dashboard personale nella community di Non Ce Duo"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/" className="text-xl font-bold font-orbitron neon-text-pink">
                  NON CE DUO
                </Link>
                <Badge variant="outline" className="border-secondary/50 text-secondary">
                  Community
                </Badge>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-xs flex items-center justify-center">
                    0
                  </span>
                </Button>
                
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 border-2 border-primary/50">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(profile?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">{profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <Card className="sticky top-24 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveTab('chats')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeTab === 'chats'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Chat</span>
                      <Badge variant="secondary" className="ml-auto">0</Badge>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('groups')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeTab === 'groups'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      <span>Gruppi</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeTab === 'profile'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Profilo</span>
                    </button>
                    
                    <div className="border-t border-border my-4" />
                    
                    <Link to="/">
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-all text-muted-foreground">
                        <Home className="w-5 h-5" />
                        <span>Torna al sito</span>
                      </button>
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Esci</span>
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </aside>

            {/* Main Area */}
            <div className="lg:col-span-3 space-y-6">
              {activeTab === 'chats' && (
                <>
                  {/* Welcome Card */}
                  <Card className="overflow-hidden border-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20" />
                    <div className="absolute inset-0 backdrop-blur-xl" />
                    <CardContent className="relative z-10 p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">
                            Ciao {profile?.display_name?.split(' ')[0]}! 👋
                          </h2>
                          <p className="text-muted-foreground">
                            Benvenuto nella community. Inizia a chattare!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* New Chat Button */}
                  <Card className="border-dashed border-2 border-primary/30 hover:border-primary/60 transition-colors cursor-pointer group">
                    <CardContent className="p-6 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                          <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-medium">Inizia una nuova chat</p>
                        <p className="text-sm text-muted-foreground">
                          Cerca membri della community
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Empty state */}
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nessuna chat ancora</h3>
                      <p className="text-muted-foreground mb-4">
                        Inizia una conversazione con altri membri della community
                      </p>
                      <Button className="bg-gradient-to-r from-primary to-accent">
                        <Search className="w-4 h-4 mr-2" />
                        Cerca membri
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeTab === 'groups' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Gruppi</CardTitle>
                  </CardHeader>
                  <CardContent className="p-12 text-center">
                    <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nessun gruppo</h3>
                    <p className="text-muted-foreground mb-4">
                      I gruppi saranno disponibili presto!
                    </p>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'profile' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Il tuo profilo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="w-24 h-24 border-4 border-primary/30">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                          {getInitials(profile?.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold">{profile?.display_name}</h2>
                        <p className="text-muted-foreground">@{profile?.username}</p>
                        <Badge className="mt-2" variant="outline">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          Online
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="border-t border-border pt-6">
                      <h3 className="font-medium mb-4">Informazioni account</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span>{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Membro dal</span>
                          <span>{new Date(user?.created_at || '').toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full">
                      Modifica profilo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SocialDashboard;
