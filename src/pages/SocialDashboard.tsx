import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';
import { SocialFeed } from '@/components/SocialFeed';
import { UserSearch } from '@/components/UserSearch';
import { FriendRequests } from '@/components/FriendRequests';
import { SocialGroupsList } from '@/components/SocialGroupsList';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { SectionOffLanding } from '@/components/SectionOffLanding';
import { useSectionStatus } from '@/hooks/useSectionStatus';
import { 
  Home,
  MessageCircle, 
  Users, 
  Settings, 
  LogOut,
  Send,
  Shield,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Circle,
  UserPlus,
  Newspaper,
  MessagesSquare,
  Edit
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
  const { status: communityStatus, loading: communityLoading } = useSectionStatus('community');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'groups' | 'members' | 'friends' | 'staff' | 'profile'>('home');
  const [showProfileEdit, setShowProfileEdit] = useState(false);

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

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    
    if (user) {
      checkAdminRole();
    }
  }, [user]);

  // Fetch or create profile
  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) return;
      
      try {
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
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
    
    return () => {
      if (user) {
        supabase
          .from('profiles')
          .update({ is_online: false, last_seen_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    };
  }, [user]);

  // Fetch online users
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .order('is_online', { ascending: false })
        .order('last_seen_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setOnlineUsers(data as Profile[]);
      }
    };

    fetchOnlineUsers();
    
    // Realtime subscription for profile changes
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchOnlineUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLogout = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('user_id', user.id);
    }
    
    await supabase.auth.signOut();
    navigate('/social');
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatLastSeen = (date: string): string => {
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h fa`;
    return `${Math.floor(diffMins / 1440)}g fa`;
  };

  if (loading || communityLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (communityStatus && !communityStatus.isEnabled) {
    return (
      <SectionOffLanding
        title="Community"
        description="La Community è momentaneamente disabilitata. Per info e date, contattaci."
        backTo="/"
        backLabel="Torna al sito"
        secondaryBackTo="/app"
        secondaryBackLabel="Torna all'app"
      />
    );
  }

  return (
    <>
      <SEO 
        title="Community | Non Ce Duo"
        description="La tua community di Non Ce Duo"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="container py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/" className="text-xl font-bold font-orbitron neon-text-pink">
                  NON CE DUO
                </Link>
                <Badge variant="outline" className="border-secondary/50 text-secondary text-xs">
                  Community
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link to="/admin" target="_blank">
                    <Button variant="outline" size="sm" className="gap-2 text-xs border-primary/50 text-primary hover:bg-primary/10">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Admin</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                )}
                
                <div className="flex items-center gap-2 ml-2">
                  <Avatar className="w-8 h-8 border-2 border-primary/50">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(profile?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">{profile?.display_name}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Bottom Navigation (Mobile Style) */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'feed' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Newspaper className="w-5 h-5" />
              <span className="text-xs">Bacheca</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'groups' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <MessagesSquare className="w-5 h-5" />
              <span className="text-xs">Gruppi</span>
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'friends' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-xs">Amici</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Profilo</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container py-6 pb-24 md:pb-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:block lg:col-span-1">
              <Card className="sticky top-20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-3">
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveTab('home')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'home'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Home</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('feed')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'feed'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Newspaper className="w-4 h-4" />
                      <span>Bacheca</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('groups')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'groups'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <MessagesSquare className="w-4 h-4" />
                      <span>Gruppi</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('friends')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'friends'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Amici</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('members')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'members'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Cerca utenti</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('staff')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'staff'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Contatta Staff</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        activeTab === 'profile'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Il mio profilo</span>
                    </button>
                    
                    <div className="border-t border-border my-3" />
                    
                    <Link to="/">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-all text-muted-foreground text-sm">
                        <Home className="w-4 h-4" />
                        <span>Torna al sito</span>
                      </button>
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Esci</span>
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </aside>

            {/* Main Area */}
            <div className="lg:col-span-3 space-y-4">
              {/* HOME TAB */}
              {activeTab === 'home' && (
                <>
                  {/* Welcome */}
                  <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-14 h-14 border-2 border-primary/50">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">
                            {getInitials(profile?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-xl font-bold">
                            Ciao {profile?.display_name?.split(' ')[0]}! 👋
                          </h2>
                          <p className="text-muted-foreground text-sm">
                            Benvenuto nella community di Non Ce Duo
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Card 
                      className="cursor-pointer hover:border-secondary/50 transition-colors"
                      onClick={() => setActiveTab('groups')}
                    >
                      <CardContent className="p-4 text-center">
                        <MessagesSquare className="w-8 h-8 text-secondary mx-auto mb-2" />
                        <p className="font-medium text-sm">Gruppi</p>
                        <p className="text-xs text-muted-foreground">
                          Chat pubbliche
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setActiveTab('members')}
                    >
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="font-medium text-sm">Vedi Membri</p>
                        <p className="text-xs text-muted-foreground">
                          {onlineUsers.filter(u => u.is_online).length} online
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setActiveTab('staff')}
                    >
                      <CardContent className="p-4 text-center">
                        <Send className="w-8 h-8 text-accent-foreground mx-auto mb-2" />
                        <p className="font-medium text-sm">Scrivi allo Staff</p>
                        <p className="text-xs text-muted-foreground">
                          Invia un messaggio
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Online Members Preview */}
                  {onlineUsers.filter(u => u.is_online).length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                          Membri online
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {onlineUsers.filter(u => u.is_online).slice(0, 5).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5"
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/20">
                                  {getInitials(member.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member.display_name}</span>
                            </div>
                          ))}
                          {onlineUsers.filter(u => u.is_online).length > 5 && (
                            <button
                              onClick={() => setActiveTab('members')}
                              className="text-sm text-primary hover:underline px-2"
                            >
                              +{onlineUsers.filter(u => u.is_online).length - 5} altri
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* FEED TAB */}
              {activeTab === 'feed' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Newspaper className="w-5 h-5" />
                    Bacheca
                  </h2>
                  <SocialFeed userId={user?.id} />
                </div>
              )}

              {/* GROUPS TAB */}
              {activeTab === 'groups' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessagesSquare className="w-5 h-5" />
                    Gruppi
                  </h2>
                  <SocialGroupsList 
                    userId={user?.id}
                    userSessionId={(() => {
                      try {
                        return localStorage.getItem('user_session_id') || undefined;
                      } catch {
                        return undefined;
                      }
                    })()}
                  />
                </div>
              )}

              {/* FRIENDS TAB */}
              {activeTab === 'friends' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Amici e Richieste
                  </h2>
                  <FriendRequests userId={user?.id} />
                </div>
              )}

              {/* MEMBERS TAB - Search */}
              {activeTab === 'members' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Cerca Utenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <UserSearch currentUserId={user?.id} />
                    {onlineUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">Nessun altro membro ancora</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {onlineUsers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {getInitials(member.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              {member.is_online && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{member.display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                @{member.username}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={member.is_online ? 'default' : 'secondary'} className="text-xs">
                                {member.is_online ? 'Online' : formatLastSeen(member.last_seen_at)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* STAFF TAB */}
              {activeTab === 'staff' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Contatta lo Staff
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-8">
                    <Send className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Messaggi allo Staff</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Hai domande o richieste? Scrivici!
                    </p>
                    <Link to="/messaggi">
                      <Button className="bg-gradient-to-r from-primary to-accent">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Vai ai Messaggi
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Il tuo profilo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-5">
                        <Avatar className="w-20 h-20 border-4 border-primary/30">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                            {getInitials(profile?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-xl font-bold">{profile?.display_name}</h2>
                          <p className="text-muted-foreground">@{profile?.username}</p>
                          <Badge className="mt-2" variant="outline">
                            <span className="w-2 h-2 rounded-full mr-2 bg-green-500" />
                            Online
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="border-t border-border pt-5">
                        <h3 className="font-medium mb-3 text-sm">Informazioni account</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Email</span>
                            <span>{user?.email}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Username</span>
                            <span>@{profile?.username}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Membro dal</span>
                            <span>{new Date(user?.created_at || '').toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setShowProfileEdit(true)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Modifica profilo
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Esci
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <ProfileEditModal
                    open={showProfileEdit}
                    onOpenChange={setShowProfileEdit}
                    user={user}
                    profile={profile}
                    onProfileUpdate={refreshProfile}
                  />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SocialDashboard;
