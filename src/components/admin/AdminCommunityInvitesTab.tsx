import React, { useEffect, useMemo, useState } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { getProductionBaseUrl } from "@/lib/productionUrl";

type InviteLinkRow = {
  id: string;
  invite_code: string;
  is_active: boolean;
  use_count: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
};

export const AdminCommunityInvitesTab: React.FC = () => {
  const { toast } = useToast();
  const { conversations, adminGetInviteLinks, adminCreateInviteLink, adminRevokeInviteLink } = useConversations();

  const communityGroups = useMemo(
    () => (conversations || []).filter((c) => c.is_group && (c.section ?? "dediche") === "community"),
    [conversations]
  );

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [links, setLinks] = useState<InviteLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<string>("24");
  const [maxUses, setMaxUses] = useState<string>("50");

  const selectedGroup: Conversation | undefined = useMemo(
    () => communityGroups.find((g) => g.id === selectedGroupId),
    [communityGroups, selectedGroupId]
  );

  const loadLinks = async (groupId: string) => {
    setLoading(true);
    try {
      const data = await adminGetInviteLinks(groupId);
      setLinks((data as InviteLinkRow[]) || []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedGroupId && communityGroups.length > 0) {
      setSelectedGroupId(communityGroups[0].id);
    }
  }, [communityGroups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) loadLinks(selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  const inviteUrl = (inviteCode: string) => `${getProductionBaseUrl()}/join/${inviteCode}`;

  const handleCreate = async () => {
    if (!selectedGroupId) return;
    const hours = expiresInHours.trim() ? Number(expiresInHours) : undefined;
    const uses = maxUses.trim() ? Number(maxUses) : undefined;

    const created = await adminCreateInviteLink(selectedGroupId, hours, uses);
    if (!created?.invite_code) {
      toast({ title: "Errore", description: "Impossibile creare il link", variant: "destructive" });
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl(created.invite_code));
      toast({ title: "Link creato", description: "Copiato negli appunti" });
    } catch {
      toast({ title: "Link creato", description: "Creato. Copia manualmente se serve." });
    }

    loadLinks(selectedGroupId);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      toast({ title: "Copiato", description: "Link copiato negli appunti" });
    } catch {
      toast({ title: "Copia non disponibile", description: inviteUrl(code), variant: "destructive" });
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!selectedGroupId) return;
    const ok = await adminRevokeInviteLink(inviteId);
    if (ok) {
      toast({ title: "Revocato", description: "Link disattivato" });
      loadLinks(selectedGroupId);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            Inviti Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label>Gruppo</Label>
              <select
                className="mt-1 w-full h-10 rounded-md bg-muted border border-border px-3 text-sm"
                value={selectedGroupId ?? ""}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {communityGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name || "Gruppo"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Scade (ore)</Label>
              <Input value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Max usi</Label>
              <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {selectedGroup ? `Gruppo: ${selectedGroup.name || "(senza nome)"}` : ""}
            </div>
            <Button onClick={handleCreate} className="neon-button-cyan" disabled={!selectedGroupId}>
              Crea invito
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Link attivi / storici</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Caricamento...</div>
          ) : links.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessun invito per questo gruppo.</div>
          ) : (
            <div className="space-y-3">
              {links.map((l) => (
                <div key={l.id} className="p-3 rounded-lg bg-muted/30 border border-border flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-foreground truncate">{inviteUrl(l.invite_code)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {l.is_active ? "Attivo" : "Disattivato"} · usi {l.use_count}
                      {l.max_uses ? `/${l.max_uses}` : ""}
                      {l.expires_at ? ` · scade ${new Date(l.expires_at).toLocaleString("it-IT")}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => handleCopy(l.invite_code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive border-destructive/30"
                      onClick={() => handleRevoke(l.id)}
                      disabled={!l.is_active}
                      title="Revoca"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
