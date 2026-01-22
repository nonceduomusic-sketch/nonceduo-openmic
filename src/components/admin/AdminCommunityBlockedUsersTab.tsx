import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Ban, Clock, Search, Unlock, UserX } from "lucide-react";

type CommunityBlockedUser = {
  id: string;
  user_id: string;
  reason: string | null;
  expires_at: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
};

type ProfileLite = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export const AdminCommunityBlockedUsersTab: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blocked, setBlocked] = useState<CommunityBlockedUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_blocked_users")
        .select("id, user_id, reason, expires_at, blocked_at, blocked_by")
        .order("blocked_at", { ascending: false });

      if (error) throw error;
      const rows = (data as CommunityBlockedUser[]) || [];
      setBlocked(rows);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);

        if (!profErr && profs) {
          const map: Record<string, ProfileLite> = {};
          (profs as ProfileLite[]).forEach((p) => (map[p.user_id] = p));
          setProfiles(map);
        }
      } else {
        setProfiles({});
      }
    } catch (e) {
      console.error("Error fetching community blocked users:", e);
      toast({ title: "Errore", description: "Impossibile caricare i bloccati community", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return blocked;
    return blocked.filter((b) => {
      const p = profiles[b.user_id];
      return (
        b.user_id.toLowerCase().includes(q) ||
        (b.reason || "").toLowerCase().includes(q) ||
        (p?.display_name || "").toLowerCase().includes(q) ||
        (p?.username || "").toLowerCase().includes(q)
      );
    });
  }, [blocked, profiles, searchQuery]);

  const handleUnblock = async (row: CommunityBlockedUser) => {
    try {
      const { error } = await supabase.from("community_blocked_users").delete().eq("id", row.id);
      if (error) throw error;
      toast({ title: "Utente sbloccato", description: "L'utente può accedere alla community" });
      fetchData();
    } catch (e) {
      console.error("Error unblocking community user:", e);
      toast({ title: "Errore", description: "Impossibile sbloccare l'utente", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, username, motivo o user_id..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="glass-card border-destructive/30">
          <CardContent className="p-4 text-center">
            <Ban className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{blocked.length}</p>
            <p className="text-xs text-muted-foreground">Totale Bloccati</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-amber-500/30">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-amber-500">
              {blocked.filter((u) => !!u.expires_at && !isExpired(u.expires_at)).length}
            </p>
            <p className="text-xs text-muted-foreground">Temporanei</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-red-700/30">
          <CardContent className="p-4 text-center">
            <UserX className="w-6 h-6 mx-auto mb-2 text-red-700" />
            <p className="text-2xl font-bold text-red-700">{blocked.filter((u) => !u.expires_at).length}</p>
            <p className="text-xs text-muted-foreground">Permanenti</p>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card border-border">
          <CardContent className="p-8 text-center">
            <Unlock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{searchQuery ? "Nessun utente trovato" : "Nessun utente bloccato"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const p = profiles[row.user_id];
            const expired = isExpired(row.expires_at);
            const permanent = row.expires_at === null;
            return (
              <Card
                key={row.id}
                className={`glass-card transition-all ${
                  expired ? "border-muted opacity-60" : permanent ? "border-red-700/50" : "border-amber-500/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <UserX className="w-4 h-4 text-destructive" />
                        <span className="truncate">
                          {p?.display_name || p?.username || row.user_id}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{p?.username ? `@${p.username}` : row.user_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {expired ? (
                        <Badge variant="outline" className="text-muted-foreground border-muted">
                          Scaduto
                        </Badge>
                      ) : permanent ? (
                        <Badge variant="destructive">Permanente</Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-black">Temporaneo</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {row.reason && <p className="text-sm text-muted-foreground">{row.reason}</p>}
                  <div className="flex justify-end pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleUnblock(row)}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Sblocca
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
