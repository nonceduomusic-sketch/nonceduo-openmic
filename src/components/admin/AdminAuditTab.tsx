import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  section: string | null;
  metadata: Record<string, unknown>;
};

export const AdminAuditTab: React.FC = () => {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const auditQuery = useQuery({
    queryKey: ["admin_audit_logs", "latest"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, created_at, actor_email, actor_role, action, entity, entity_id, section, metadata")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const rows = useMemo(() => {
    const list = auditQuery.data ?? [];
    if (!query) return list;
    return list.filter((r) => {
      const hay = [
        r.action,
        r.section ?? "",
        r.entity ?? "",
        r.entity_id ?? "",
        r.actor_email ?? "",
        r.actor_role ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [auditQuery.data, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Audit</h2>
          <p className="text-sm text-muted-foreground">
            Registro azioni staff (login, reset, ban, permessi, ecc.)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => auditQuery.refetch()}
          disabled={auditQuery.isFetching}
        >
          <RefreshCw className={"w-4 h-4 mr-2 " + (auditQuery.isFetching ? "animate-spin" : "")} />
          Aggiorna
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Ultimi eventi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca (azione, sezione, email, entità...)"
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[520px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[165px]">Quando</TableHead>
                  <TableHead className="w-[220px]">Staff</TableHead>
                  <TableHead>Azione</TableHead>
                  <TableHead className="w-[180px]">Sezione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Nessun evento trovato.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {r.actor_role ?? "staff"}
                          </Badge>
                          <span className="text-sm truncate max-w-[160px]">{r.actor_email ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">{r.action}</div>
                          {(r.entity || r.entity_id) && (
                            <div className="text-xs text-muted-foreground">
                              {r.entity ?? "entità"}
                              {r.entity_id ? ` • ${r.entity_id}` : ""}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{r.section ?? "—"}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
