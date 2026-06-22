## Obiettivo

Permetterti di operare come Staff/Admin **anche completamente offline**, mantenendo lo stesso login email/password quando c'è Internet, con fallback automatico locale e un PIN di emergenza per casi estremi.

---

## Distinzione chiara dei tre PIN/accessi (come da te richiesto)

| Accesso | A chi serve | Quando si usa |
|---|---|---|
| **PIN Format/Clienti** (attuale) | Partecipanti Open Mic, Dediche, ecc. | Resta identico, nessuna modifica |
| **Credenziali Staff in cache** (Fase 1) | Tu/Staff già loggati almeno una volta online da quel PC | Default in tutti gli scenari offline |
| **STAFF_MASTER_PIN** (Fase 2) | Solo emergenza | PC nuovo / cache vuota / cache corrotta |

---

## Fase 1 — Cache Staff + fallback automatico

### Lato `local-server/server.js`
- Nuovo file `local-server/data/staff-cache.json` (gitignored) con voci:
  ```
  { email, username, role, pwd_hash (PBKDF2), salt, last_online_login, expires_at }
  ```
- Nuovi endpoint:
  - `POST /api/staff/cache-credentials` — riceve email+password dopo login Supabase riuscito, salva hash PBKDF2 (100k iter, SHA-256, salt random 16B) + ruolo. TTL default 30 giorni (configurabile via `.env` `STAFF_CACHE_TTL_DAYS`).
  - `POST /api/staff/validate-offline` — riceve email+password, valida contro l'hash, ritorna `{ ok, role, username, local_token }` (token firmato HMAC con segreto in `.env`, durata 12h).
  - `POST /api/staff/queue-write` — accoda mutazioni cloud in `local-server/data/pending-sync.json` quando offline.
  - `POST /api/staff/flush-queue` — esegue il flush quando Internet torna (chiamato dal client).

### Lato client
- Nuovo `src/lib/localStaffAuth.ts`:
  - `cacheCredentialsAfterLogin(email, password, role)` — chiamato in `AdminContext.login` **dopo** signin Supabase OK e ruolo risolto.
  - `tryOfflineLogin(email, password)` — chiamato in `AdminContext.login` se `supabase.auth.signInWithPassword` fallisce per network error.
  - `flushPendingSync()` — chiamato all'avvio di `AdminContext` quando Internet è disponibile.
- Modifica `src/contexts/AdminContext.tsx`:
  - `login()` prova prima Supabase. Se errore di rete → tenta `tryOfflineLogin`. Se OK, popola `session/staffRole/currentUser` con un oggetto "local session" (flag `isLocalSession: true`).
  - `useEffect` ruolo: se `isLocalSession`, salta la fetch a `user_roles` e usa il ruolo dalla cache.
- Indicatore UI: badge piccolo "🔌 Modalità Locale" nell'header admin quando `isLocalSession === true`.

### Operazioni offline
- Le azioni live (telecomando, broadcast, partiture, ricerca catalogo, start/stop) già funzionano via local-server → nessuna modifica.
- Le scritture Cloud (settings globali, permessi, audit log) vengono **accodate** in `pending-sync.json` con timestamp + payload. Sincronizzate automaticamente al ritorno di Internet con notifica toast.

---

## Fase 2 — STAFF_MASTER_PIN (emergenza)

### `.env` del local-server
```
STAFF_MASTER_PIN=        # vuoto = disattivato (default)
STAFF_MASTER_PIN_ROLE=admin  # o 'owner'
STAFF_CACHE_TTL_DAYS=30
STAFF_LOCAL_TOKEN_SECRET=<auto-generato al primo avvio se mancante>
```

### Endpoint
- `POST /api/staff/master-pin-login` — valida il PIN, ritorna `local_token` con ruolo da `STAFF_MASTER_PIN_ROLE`. Funziona **solo se cache vuota** OR query param `?force=true` (per recupero esplicito).

### UI
- Nella schermata `/admin` (AdminLogin), sotto "Hai dimenticato le credenziali?", aggiungo link discreto: **"Accesso di emergenza locale"** → apre dialog che chiede solo il Master PIN. Visibile solo quando il local-server risponde a `/api/ping` e Supabase non risponde (rilevamento automatico).

---

## Procedura aggiornamento — backup esteso

In `AdminSettingsTab.tsx` (sezione "Aggiornamento + Avvio") e in `GUIDA-LOCALE.md`, aggiorno il blocco backup per includere **`staff-cache.json`** insieme agli altri:
```
local-server/data/
  ├── pin-cache.json
  ├── local-sessions.json
  ├── staff-cache.json        ← NUOVO
  ├── pending-sync.json       ← NUOVO
  ├── catalog.json
  └── songbook/
```
La rotazione automatica (ultimi 5 backup) già implementata copre anche questi nuovi file.

---

## Dettagli tecnici sicurezza

- **PBKDF2-SHA256** con 100.000 iterazioni e salt random 16B per password Staff in cache (stesso standard già usato per i PIN).
- **Local token HMAC-SHA256** firmato con `STAFF_LOCAL_TOKEN_SECRET` (auto-generato in `.env` se assente). Payload: `{ email, role, exp }`. Durata 12h.
- **`staff-cache.json` ha permessi 600** (solo owner) — chmod automatico alla scrittura.
- **Master PIN** validato con confronto a tempo costante (`crypto.timingSafeEqual`).
- **Rate limiting locale**: max 5 tentativi/15min per IP su `/api/staff/validate-offline` e `/api/staff/master-pin-login`.
- Tutte le scritture cloud accodate hanno **idempotency key** per evitare doppie esecuzioni al flush.

---

## File toccati

**Nuovi:**
- `src/lib/localStaffAuth.ts`
- `local-server/lib/staff-cache.js` (logica PBKDF2 + token)
- `local-server/lib/pending-sync.js`

**Modificati:**
- `local-server/server.js` (5 nuovi endpoint + auto-gen secret)
- `local-server/.env.example` (4 nuove variabili documentate)
- `src/contexts/AdminContext.tsx` (cache + fallback + flush)
- `src/components/AdminLogin.tsx` (link emergenza + dialog Master PIN)
- `src/components/AdminDashboard.tsx` (badge "Modalità Locale")
- `src/components/AdminSettingsTab.tsx` (backup esteso, doc Master PIN)
- `local-server/GUIDA-LOCALE.md` (sezione "Staff Offline" + backup esteso)

---

## Cosa farei diversamente / consiglio aggiuntivo

1. **Master PIN forte di default disattivato**: se attivato per la prima volta, mostro un warning chiaro in admin ("Chiunque con questo PIN ha accesso Staff completo locale"). Tu lo abiliti esplicitamente, non parte attivo.
2. **Whitelist email per cache**: opzionale `STAFF_CACHE_ALLOWED_EMAILS=email1,email2` per evitare che un secondo utente Staff casuale lasci credenziali su un PC condiviso. Se vuota → tutti gli Staff loggati vengono cachati.
3. **Pulsante "Svuota cache Staff locale"** in Admin Settings: utile prima di prestare/dismettere il PC.
4. **Log delle sessioni offline** in un file `staff-offline-log.json` (data, email, ruolo, durata) per audit a posteriori quando torna Internet.

Confermi questi 4 extra o ne salto qualcuno?
