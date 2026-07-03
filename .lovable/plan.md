
# Piano — Manutenzione Database NONCEDUO (sicura, senza perdere dati)

Aggiungo un **unico pannello Admin** chiamato *"Manutenzione Database"* con tutte le operazioni di pulizia in un posto solo, protette e reversibili quando possibile.

---

## 1. Nuova pagina Admin: `/admin/manutenzione`

Sezione accessibile solo a `owner` (non a operator/staff).

### A. Report peso database
- Tabella con: nome tabella, numero righe, dimensione MB, ultima scrittura.
- Ordinata per peso decrescente. Aggiornata on-demand.
- Evidenzia in rosso le tabelle > 10.000 righe o > 50 MB.

### B. Separazione Reset ↔ Archivia serata
- **Reset Serata** (già esistente) → resta com'è: azzera solo lo stato operativo.
- **Archivia Serata** (nuovo) → sposta le `reservations` chiuse della serata in `reservations_archive` (stessa struttura + `archived_at`), poi le rimuove da `reservations`. Reversibile con "Ripristina ultima archiviazione" (finestra 24h).

### C. Pulizia cronologie — con **3 livelli**
Ogni livello mostra prima un'anteprima ("stai per cancellare N righe da X tabelle") e richiede doppia conferma.

1. **Pulisci > 90 giorni** (sicuro, consigliato mensile)
   - `chat_messages`, `messages`, `private_messages` con `created_at < now() - 90d`
   - `security_rate_limits`, `notification_logs`, `admin_audit_logs` > 90 giorni
   - `live_reactions`, `typing_indicators` > 7 giorni
   - `pin_sessions` invalidate > 30 giorni
   - `broadcast_remote_sessions` inattive > 30 giorni

2. **Pulisci > 30 giorni** (medio, per manutenzione più aggressiva)
   - Stesse tabelle sopra ma con soglia 30 giorni.

3. **Pulizia totale** (⚠️ distruttivo)
   - Svuota completamente: chat, messaggi, log, notifiche, reazioni, sessioni PIN scadute, rate limits, indicatori digitazione, broadcast_remote_sessions inattive.
   - **NON tocca**: `profiles`, `user_roles`, `songs`, `songbook_files`, `event_booking_rules`, `free_mode_settings`, `assistant_settings`, `game_settings`, `leaderboard_stats`, `user_badges`, `permissions`, `admin_users` — cioè configurazione, catalogo e identità utenti.
   - Richiede: digitare `CANCELLA TUTTO` + conferma finale.
   - **Obbligatorio**: prima di eseguire propone di scaricare il backup (punto D).

### D. Export Backup completo (JSON + ZIP)
- Pulsante "Scarica backup completo" (sempre disponibile, non solo prima di cancellare).
- Genera uno ZIP con un file `.json` per ogni tabella pubblica (fino a 100k righe per tabella; oltre, avviso).
- Nome file: `nonceduo-backup-YYYYMMDD-HHmm.zip`.
- Anche opzione "Backup solo cronologie" (solo le tabelle che le pulizie andrebbero a toccare) — utile prima della pulizia totale.

---

## 2. Come lo faccio in sicurezza (dettaglio tecnico)

- Tutte le operazioni distruttive passano per **RPC `SECURITY DEFINER`** con check `is_owner(auth.uid())` — nessuna DELETE dal client.
- Ogni pulizia scrive una riga in `admin_audit_logs` con: chi, quando, cosa, quante righe cancellate.
- La tabella `reservations_archive` viene creata con GRANT e RLS (solo owner legge/scrive).
- L'export usa una Edge Function `export-backup` che streamma JSON (evita di caricare tutto in memoria browser).
- Nessuna modifica alle tabelle esistenti eccetto l'aggiunta di `reservations_archive` e degli RPC.

---

## 3. Cosa NON faccio (per sicurezza)

- Non tocco `Reset Serata` esistente (resta identico).
- Non modifico RLS di tabelle già in produzione.
- Non aggiungo cron automatici: tutto è **manuale + confermato**.
- Nessun `TRUNCATE` — sempre `DELETE` con condizione, così i trigger e cascade funzionano correttamente.

---

## 4. Ordine di implementazione (una sola sessione)

1. Migration: crea `reservations_archive`, RPC `admin_cleanup_by_age(days int)`, `admin_cleanup_all()`, `admin_archive_reservations(before date)`, `admin_db_stats()`.
2. Edge Function `export-backup` (ZIP streaming, solo owner).
3. Pagina `/admin/manutenzione` con le 4 sezioni (Peso · Archivia · Pulizia · Backup).
4. Link nel menu admin (solo owner).
5. Test manuale su ogni pulsante con anteprima.

---

## 5. Rischi residui

- Cancellazioni massicce possono impegnare il DB per qualche secondo → eseguite fuori orario serata.
- Il backup ZIP di tutto il DB può essere grande (stimato 5–20 MB oggi) → tempo di download qualche secondo.
- "Pulizia totale" è irreversibile senza il backup — l'UI **impone** di scaricarlo prima.

---

## Domanda prima di partire

Confermi questi due punti?
- **Archivia Serata**: le prenotazioni finite vanno in `reservations_archive` (non cancellate). OK?
- **Menu**: metto la voce solo sotto il tuo utente `owner` (non visibile a operator/staff). OK?
