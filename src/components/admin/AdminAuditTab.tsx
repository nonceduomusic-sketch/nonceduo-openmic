import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RefreshCw, 
  Search, 
  Calendar as CalendarIcon,
  Download,
  Eye,
  Filter,
  X,
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

const ACTION_CATEGORIES = [
  { value: "all", label: "Tutte le azioni" },
  { value: "permissions", label: "Permessi" },
  { value: "users", label: "Utenti" },
  { value: "openmic", label: "Open Mic" },
  { value: "dediche", label: "Dediche" },
  { value: "community", label: "Community" },
  { value: "settings", label: "Impostazioni" },
] as const;

const DATE_PRESETS = [
  { value: "today", label: "Oggi", days: 0 },
  { value: "week", label: "Ultima settimana", days: 7 },
  { value: "month", label: "Ultimo mese", days: 30 },
  { value: "all", label: "Tutto", days: 999 },
] as const;

export const AdminAuditTab: React.FC = () => {
  const isMobile = useIsMobile();
  const [q, setQ] = useState("");
  const [datePreset, setDatePreset] = useState<string>("week");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [actionCategory, setActionCategory] = useState("all");
  const [selectedRow, setSelectedRow] = useState<AuditRow | null>(null);
  const query = q.trim().toLowerCase();

  const auditQuery = useQuery({
    queryKey: ["admin_audit_logs", "latest"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, created_at, actor_email, actor_role, action, entity, entity_id, section, metadata")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const rows = useMemo(() => {
    let list = auditQuery.data ?? [];
    
    // Date filter
    if (dateRange.from || dateRange.to) {
      list = list.filter((r) => {
        const date = new Date(r.created_at);
        const from = dateRange.from ? startOfDay(dateRange.from) : new Date(0);
        const to = dateRange.to ? endOfDay(dateRange.to) : new Date();
        return isWithinInterval(date, { start: from, end: to });
      });
    }
    
    // Action category filter
    if (actionCategory !== "all") {
      list = list.filter((r) => {
        const action = r.action.toLowerCase();
        const section = r.section?.toLowerCase() || "";
        return action.startsWith(actionCategory) || section.includes(actionCategory);
      });
    }
    
    // Text search
    if (query) {
      list = list.filter((r) => {
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
    }
    
    return list;
  }, [auditQuery.data, query, dateRange, actionCategory]);

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const days = DATE_PRESETS.find(p => p.value === preset)?.days ?? 7;
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset === "today") {
      const today = new Date();
      setDateRange({ from: today, to: today });
    } else {
      setDateRange({ from: subDays(new Date(), days), to: new Date() });
    }
  };

  const exportCSV = () => {
    const headers = ["Data", "Staff", "Ruolo", "Azione", "Sezione", "Entità", "ID Entità"];
    const csvRows = [headers.join(",")];
    
    rows.forEach(r => {
      const row = [
        new Date(r.created_at).toLocaleString(),
        r.actor_email ?? "",
        r.actor_role ?? "",
        r.action,
        r.section ?? "",
        r.entity ?? "",
        r.entity_id ?? "",
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`);
      csvRows.push(row.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setQ("");
    setActionCategory("all");
    handleDatePreset("week");
  };

  const hasActiveFilters = query || actionCategory !== "all" || datePreset !== "week";

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground">
            Registro azioni staff (login, reset, ban, permessi, ecc.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="rounded-full"
          >
            <Download className="w-4 h-4 mr-2" />
            {!isMobile && "Esporta CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => auditQuery.refetch()}
            disabled={auditQuery.isFetching}
            className="rounded-full"
          >
            <RefreshCw className={"w-4 h-4 " + (auditQuery.isFetching ? "animate-spin" : "")} />
            {!isMobile && <span className="ml-2">Aggiorna</span>}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-dashed">
        <CardContent className="pt-4 space-y-3">
          {/* Search + Category */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca (azione, sezione, email, entità...)"
                className="pl-10 rounded-full bg-muted/50 border-0"
              />
            </div>
            <Select value={actionCategory} onValueChange={setActionCategory}>
              <SelectTrigger className="w-full md:w-[180px] rounded-full">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {DATE_PRESETS.map(preset => (
                <Button
                  key={preset.value}
                  variant={datePreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDatePreset(preset.value)}
                  className="rounded-full text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {dateRange.from && dateRange.to ? (
                    <span className="text-xs">
                      {format(dateRange.from, "dd/MM", { locale: it })} - {format(dateRange.to, "dd/MM", { locale: it })}
                    </span>
                  ) : (
                    <span className="text-xs">Personalizza</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to });
                    setDatePreset("custom");
                  }}
                  numberOfMonths={isMobile ? 1 : 2}
                  locale={it}
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="rounded-full text-xs text-muted-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Reset filtri
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{rows.length} eventi trovati</span>
            {auditQuery.data && rows.length !== auditQuery.data.length && (
              <span>({auditQuery.data.length} totali)</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Eventi recenti</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Quando</TableHead>
                  <TableHead className="w-[180px]">Staff</TableHead>
                  <TableHead>Azione</TableHead>
                  <TableHead className="w-[120px]">Sezione</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Nessun evento trovato.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow 
                      key={r.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedRow(r)}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize text-xs rounded-full">
                            {r.actor_role ?? "staff"}
                          </Badge>
                          <span className="text-sm truncate max-w-[100px]">
                            {r.actor_email?.split("@")[0] ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">{r.action}</div>
                          {(r.entity || r.entity_id) && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {r.entity ?? "entità"}
                              {r.entity_id ? ` • ${r.entity_id.slice(0, 8)}...` : ""}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{r.section ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="sm:max-w-lg sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Dettaglio Evento
            </DialogTitle>
            <DialogDescription>
              {selectedRow && format(new Date(selectedRow.created_at), "dd MMMM yyyy 'alle' HH:mm:ss", { locale: it })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Azione</p>
                  <p className="font-medium">{selectedRow.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Sezione</p>
                  <p className="font-medium">{selectedRow.section ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Staff</p>
                  <p className="font-medium">{selectedRow.actor_email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Ruolo</p>
                  <Badge variant="secondary" className="capitalize rounded-full">
                    {selectedRow.actor_role ?? "staff"}
                  </Badge>
                </div>
                {selectedRow.entity && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Entità</p>
                    <p className="font-medium">{selectedRow.entity}</p>
                  </div>
                )}
                {selectedRow.entity_id && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">ID Entità</p>
                    <p className="font-mono text-xs break-all">{selectedRow.entity_id}</p>
                  </div>
                )}
              </div>
              
              {Object.keys(selectedRow.metadata).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Metadata</p>
                  <pre className="bg-muted/50 p-3 rounded-xl text-xs overflow-x-auto">
                    {JSON.stringify(selectedRow.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};