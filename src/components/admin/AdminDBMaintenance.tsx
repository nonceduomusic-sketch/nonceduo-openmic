import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, Download, RefreshCw, Archive, Trash2, Database, Loader2 } from 'lucide-react';

type StatRow = { table_name: string; row_count: number; total_size_bytes: number; total_size_pretty: string };

export default function AdminDBMaintenance() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [previewKind, setPreviewKind] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(90);
  const [confirmText, setConfirmText] = useState('');
  const [archiveDate, setArchiveDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });

  const loadStats = async () => {
    setLoadingStats(true);
    const { data, error } = await supabase.rpc('admin_db_stats' as any);
    setLoadingStats(false);
    if (error) return toast.error(error.message);
    setStats((data as any) || []);
  };

  const runPreview = async (kind: 'age' | 'all', d?: number) => {
    setBusy(true);
    try {
      if (kind === 'age') {
        const { data, error } = await supabase.rpc('admin_cleanup_by_age' as any, { p_days: d ?? days, p_dry_run: true });
        if (error) throw error;
        setPreview(((data as any)?.counts) || {});
        setPreviewKind(`Anteprima pulizia > ${d ?? days} giorni`);
      } else {
        const { data, error } = await supabase.rpc('admin_cleanup_all' as any, { p_confirm: '', p_dry_run: true });
        if (error) throw error;
        setPreview(((data as any)?.counts) || {});
        setPreviewKind('Anteprima PULIZIA TOTALE');
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const runCleanup = async (kind: 'age' | 'all', d?: number) => {
    if (!confirm(kind === 'all'
      ? '⚠️ PULIZIA TOTALE: cancellerà cronologie, chat, log, notifiche, post. Configurazione, utenti, catalogo, songbook, badge sono SALVI. Continuare?'
      : `Cancellerà i dati più vecchi di ${d ?? days} giorni. Continuare?`)) return;
    setBusy(true);
    try {
      const rpc = kind === 'age' ? 'admin_cleanup_by_age' : 'admin_cleanup_all';
      const args = kind === 'age'
        ? { p_days: d ?? days, p_dry_run: false }
        : { p_confirm: 'CANCELLA TUTTO', p_dry_run: false };
      const { data, error } = await supabase.rpc(rpc as any, args);
      if (error) throw error;
      setPreview(((data as any)?.counts) || {});
      setPreviewKind('Risultato pulizia');
      toast.success('Pulizia completata');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); setConfirmText(''); }
  };

  const runArchive = async (dryRun: boolean) => {
    if (!dryRun && !confirm(`Archiviare le prenotazioni chiuse antecedenti al ${archiveDate}?`)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('admin_archive_reservations' as any, {
        p_before_date: archiveDate, p_dry_run: dryRun,
      });
      if (error) throw error;
      const r = data as any;
      if (dryRun) toast.info(`Verranno archiviate ${r.would_archive} prenotazioni`);
      else toast.success(`Archiviate ${r.archived} prenotazioni (batch ${r.batch_id.slice(0, 8)})`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const downloadBackup = async (mode: 'history' | 'full') => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Non autenticato');
      const url = `https://mzgdlwkmbtzlfuylezhz.supabase.co/functions/v1/export-backup?mode=${mode}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Errore backup: ${res.status}`);
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      const filename = m?.[1] || `nonceduo-backup-${mode}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Backup ${mode} scaricato`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-bold">Manutenzione Database</h2>
          <p className="text-sm text-muted-foreground">Peso tabelle, archiviazione, pulizia cronologie e backup.</p>
        </div>
      </div>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Backup</CardTitle>
          <CardDescription>Scarica un file JSON con i dati del database. Da fare SEMPRE prima di una pulizia totale.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => downloadBackup('history')} disabled={busy} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Backup cronologie
          </Button>
          <Button onClick={() => downloadBackup('full')} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> Backup completo
          </Button>
        </CardContent>
      </Card>

      {/* DB Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Peso Database</CardTitle>
          <CardDescription>Ordinate per dimensione. In rosso quelle sopra i 10.000 record.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadStats} disabled={loadingStats} variant="outline" size="sm" className="mb-3">
            {loadingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Aggiorna
          </Button>
          {stats.length > 0 && (
            <div className="max-h-96 overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr><th className="text-left p-2">Tabella</th><th className="text-right p-2">Righe</th><th className="text-right p-2">Peso</th></tr>
                </thead>
                <tbody>
                  {stats.map(r => (
                    <tr key={r.table_name} className={r.row_count > 10000 ? 'text-destructive' : ''}>
                      <td className="p-2 font-mono text-xs">{r.table_name}</td>
                      <td className="p-2 text-right">{r.row_count.toLocaleString()}</td>
                      <td className="p-2 text-right">{r.total_size_pretty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" /> Archivia Prenotazioni</CardTitle>
          <CardDescription>Sposta le prenotazioni chiuse (completate/annullate/skipped) più vecchie della data indicata in una tabella di archivio. Ripristinabili entro 24 ore contattando l'assistenza.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          <Input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)} className="w-auto" />
          <Button variant="outline" disabled={busy} onClick={() => runArchive(true)}>Anteprima</Button>
          <Button disabled={busy} onClick={() => runArchive(false)}><Archive className="mr-2 h-4 w-4" /> Archivia</Button>
        </CardContent>
      </Card>

      {/* Cleanup by age */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Pulizia cronologie (per età)</CardTitle>
          <CardDescription>Chat, log, notifiche e sessioni più vecchie di N giorni. Non tocca prenotazioni, catalogo, utenti o configurazioni.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-sm">Giorni:</label>
            <Input type="number" min={7} value={days} onChange={e => setDays(Number(e.target.value))} className="w-24" />
            <Button variant="outline" disabled={busy} onClick={() => runPreview('age')}>Anteprima</Button>
            <Button disabled={busy} onClick={() => runCleanup('age')}><Trash2 className="mr-2 h-4 w-4" /> Pulisci</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setDays(90); runPreview('age', 90); }}>Anteprima &gt; 90gg</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setDays(30); runPreview('age', 30); }}>Anteprima &gt; 30gg</Button>
          </div>
        </CardContent>
      </Card>

      {/* Total cleanup */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Pulizia TOTALE
          </CardTitle>
          <CardDescription>
            Cancella <b>tutte</b> le cronologie: chat, messaggi, log, notifiche, post, reazioni, sessioni scadute.<br />
            <b>Non tocca:</b> profili, ruoli, catalogo canzoni, songbook, eventi, impostazioni, badge, classifiche.<br />
            Consigliato scaricare il backup prima di procedere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => runPreview('all')}>Anteprima cosa verrà cancellato</Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
            <Input
              placeholder='Scrivi: CANCELLA TUTTO'
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-64"
            />
            <Button
              variant="destructive"
              disabled={busy || confirmText !== 'CANCELLA TUTTO'}
              onClick={() => runCleanup('all')}
            >
              <Trash2 className="mr-2 h-4 w-4" /> CANCELLA TUTTO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview panel */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>{previewKind}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(preview).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span className="font-mono text-xs">{k}</span>
                  <Badge variant={v > 0 ? 'default' : 'secondary'}>{v}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
