# 🎵 Guida Server Locale NonceDuo

---

## 📂 LE TUE CARTELLE

```
C:\Users\iaco_\
  ├── nonceduo-openmic-nuovo\   ← CODICE (da qui scarichi aggiornamenti)
  ├── nonceduo\local-server\    ← SERVER (da qui parte l'app per TV/tablet)
```

---

## 🟢 AVVIARE IL SERVER (per la serata)

> Usa questo quando vuoi solo accendere il server. I brani sono già salvati.

### Passo 1 — Apri PowerShell

Clicca sul menu Start, scrivi **PowerShell**, clicca su **Windows PowerShell**.

### Passo 2 — Ferma eventuali server vecchi

```
taskkill /F /IM node.exe 2>$null
```

> Se dice "nessun processo trovato" va bene, significa che non c'era niente da chiudere.

### Passo 3 — Vai nella cartella del server

```
cd C:\Users\iaco_\nonceduo\local-server
```

### Passo 4 — Avvia il server

```
node server.js
```

### Passo 5 — Verifica

Aspetta di vedere:

```
🎵 NonceDuo Local Server
HTTP Server:     porta 8080
WebSocket:       porta 3456
```

✅ **Fatto!** Il server è acceso. **NON chiudere questa finestra!**

---

## 📺 COLLEGARE I DISPOSITIVI

Tutti i dispositivi devono essere sulla **stessa rete WiFi** del PC.

| Dispositivo | Indirizzo da aprire nel browser |
|-------------|--------------------------------|
| 📺 TV | `http://192.168.8.10:8080/trasmetti` |
| 🎸 Musicisti (tablet) | `http://192.168.8.10:8080/partiture` |
| 📱 Telecomando (telefono) | `http://192.168.8.10:8080/telecomando` |
| ⚙️ Admin (per sincronizzare) | `http://192.168.8.10:8080/admin` |

> ⚠️ Se l'IP del PC cambia, controlla quello nuovo nella finestra del server all'avvio.

---

## 🔄 SINCRONIZZARE I BRANI (dopo modifiche nel Cloud)

> Fai questo SOLO se hai aggiunto, modificato o cancellato brani online.

### Passo 1 — Il server deve essere acceso

Se non l'hai già fatto, segui "AVVIARE IL SERVER" qui sopra.

### Passo 2 — Apri l'admin locale

Apri Chrome su: `http://192.168.8.10:8080/admin`

### Passo 3 — Vai nelle Impostazioni

Vai nella sezione **Impostazioni** → **Connessione Server LAN**.

### Passo 4 — Sincronizza

Premi **Sincronizza Catalogo** e poi **Sincronizza SongBook**.

### Passo 5 — Aspetta la conferma

Aspetta il messaggio verde di conferma ✅

---

## 🔄 AGGIORNARE L'APP (dopo modifiche al codice)

> Usa questo SOLO quando ti dico "aggiorna il server" o dopo che ho fatto modifiche al codice.

> Regola importante: se PowerShell mostra un errore rosso tipo **"Impossibile trovare il percorso local-server\\lib"** o **".env.example mancante"**, fermati. Vuol dire che il codice non è stato allineato davvero: riparti dal passo 2 e fai `git fetch origin` + `git reset --hard origin/main`.

Apri **PowerShell** e scrivi i comandi **uno alla volta**.
**Aspetta che ogni comando finisca prima di scrivere il successivo!**

### Passo 0 — Attiva sicurezza errori

```
$ErrorActionPreference = "Stop"
```

### Passo 1 — Ferma il server se è acceso

Se il server è in esecuzione in un'altra finestra, chiudila con **Ctrl+C** oppure scrivi:

```
taskkill /F /IM node.exe 2>$null
```

### Passo 2 — Vai nella cartella del codice

```
cd C:\Users\iaco_\nonceduo-openmic-nuovo
```

### Passo 3 — Scarica e applica gli aggiornamenti

```
git fetch origin
git reset --hard origin/main
git rev-parse --short HEAD
```

> `git fetch` da solo NON basta: scarica gli aggiornamenti ma non li applica. Il comando che li applica davvero è `git reset --hard origin/main`.

### Passo 3B — Controllo obbligatorio file server

```
if (-not (Test-Path ".\local-server\server.js")) { throw "ERRORE: local-server\server.js mancante" }
if (-not (Test-Path ".\local-server\lib\staff-cache.js")) { throw "ERRORE: local-server\lib\staff-cache.js mancante: codice non aggiornato" }
if (-not (Test-Path ".\local-server\.env.example")) { throw "ERRORE: local-server\.env.example mancante: codice non aggiornato" }
Write-Host "✅ File server nuovi trovati"
```

### Passo 4 — Installa le dipendenze

```
npm install
```

> Aspetta 1-3 minuti. Finisce quando rivedi il cursore.

### Passo 5 — Compila l'app

```
npm run build
```

> Aspetta di vedere **"built in X.XXs"**. Se dà errore, ripeti `npm install` e poi `npm run build`.

### Passo 6 — Copia i file compilati nel server

```
New-Item -ItemType Directory -Path "C:\Users\iaco_\nonceduo\local-server\public","C:\Users\iaco_\nonceduo\local-server\data","C:\Users\iaco_\nonceduo\local-server\lib" -Force | Out-Null
Remove-Item "C:\Users\iaco_\nonceduo\local-server\public\assets" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item ".\dist\*" -Destination "C:\Users\iaco_\nonceduo\local-server\public" -Recurse -Force -ErrorAction Stop
```

> Deve copiare tanti file. Aspetta che finisca.

### Passo 7 — Copia anche il server.js aggiornato

```
Copy-Item ".\local-server\server.js" -Destination "C:\Users\iaco_\nonceduo\local-server\server.js" -Force -ErrorAction Stop
Copy-Item ".\local-server\lib\*" -Destination "C:\Users\iaco_\nonceduo\local-server\lib\" -Recurse -Force -ErrorAction Stop
Copy-Item ".\local-server\.env.example" -Destination "C:\Users\iaco_\nonceduo\local-server\.env.example" -Force -ErrorAction Stop
if (-not (Test-Path "C:\Users\iaco_\nonceduo\local-server\.env")) { Copy-Item "C:\Users\iaco_\nonceduo\local-server\.env.example" "C:\Users\iaco_\nonceduo\local-server\.env" }
if (-not (Test-Path "C:\Users\iaco_\nonceduo\local-server\lib\staff-cache.js")) { throw "ERRORE: staff-cache.js non copiato" }
if (-not (Select-String -Path "C:\Users\iaco_\nonceduo\local-server\server.js" -Pattern "/api/staff/cache-renew" -Quiet)) { throw "ERRORE: server.js locale ancora vecchio" }
Write-Host "✅ Server locale aggiornato davvero"
```

### Passo 8 — Vai nella cartella del server

```
cd ..\nonceduo\local-server
```

### Passo 9 — Avvia il server

```
node server.js
```

> Aspetta di vedere il messaggio con le porte 8080 e 3456.

### Passo 10 — Ricarica le pagine sui dispositivi

Su **ogni** dispositivo collegato (TV, tablet, telefono):

- **PC/TV**: premi **Ctrl + Shift + R** (hard refresh)
- **Telefono/Tablet**: chiudi la scheda e riaprila

> ⚠️ Il refresh normale (F5) potrebbe NON bastare! Usa sempre **Ctrl+Shift+R**.

✅ **Fatto!** Server aggiornato e attivo con le ultime modifiche.

---

## 📋 COPIA-INCOLLA RAPIDO

**Solo avviare la serata:**
```
taskkill /F /IM node.exe 2>$null; cd C:\Users\iaco_\nonceduo\local-server; node server.js
```

**Aggiornare tutto + avviare (tutto in un colpo):**
```
$ErrorActionPreference="Stop"; taskkill /F /IM node.exe 2>$null; cd C:\Users\iaco_\nonceduo-openmic-nuovo; git fetch origin; git reset --hard origin/main; if (-not (Test-Path ".\local-server\lib\staff-cache.js")) { throw "codice non aggiornato: manca local-server\lib" }; npm install; npm run build; New-Item -ItemType Directory -Path "C:\Users\iaco_\nonceduo\local-server\public","C:\Users\iaco_\nonceduo\local-server\data","C:\Users\iaco_\nonceduo\local-server\lib" -Force | Out-Null; Remove-Item "C:\Users\iaco_\nonceduo\local-server\public\assets" -Recurse -Force -ErrorAction SilentlyContinue; Copy-Item ".\dist\*" -Destination "C:\Users\iaco_\nonceduo\local-server\public" -Recurse -Force; Copy-Item ".\local-server\server.js" -Destination "C:\Users\iaco_\nonceduo\local-server\server.js" -Force; Copy-Item ".\local-server\lib\*" -Destination "C:\Users\iaco_\nonceduo\local-server\lib\" -Recurse -Force; Copy-Item ".\local-server\.env.example" -Destination "C:\Users\iaco_\nonceduo\local-server\.env.example" -Force; if (-not (Test-Path "C:\Users\iaco_\nonceduo\local-server\.env")) { Copy-Item "C:\Users\iaco_\nonceduo\local-server\.env.example" "C:\Users\iaco_\nonceduo\local-server\.env" }; cd C:\Users\iaco_\nonceduo\local-server; node server.js
```

---

## ⚠️ PROBLEMI COMUNI

| Problema | Cosa fare |
|----------|-----------|
| `EADDRINUSE` (porta occupata) | Scrivi `taskkill /F /IM node.exe` e riprova |
| `git pull` dà errore | Controlla la connessione internet |
| `npm run build` fallisce | Scrivi `npm install` e riprova |
| La TV non si connette | PC e TV devono essere sullo **stesso WiFi** |
| "HTML anziché JSON" nel sync | Il server non è acceso, avvialo prima |
| Pagina non trovata (404) | Hai fatto `npm run build` + `xcopy`? |
| Il ping non risponde | Il server non è acceso o la porta è bloccata dal firewall |
| La pagina mostra la versione vecchia | Fai **Ctrl+Shift+R** (hard refresh) su ogni dispositivo |
| La TV mostra ancora il vecchio contenuto | Chiudi Chrome, riaprilo, e riapri l'indirizzo |

---

## 📡 FUNZIONAMENTO SENZA INTERNET

Il sistema è progettato per funzionare **completamente offline** sulla rete locale.
Dopo aver sincronizzato i brani (con internet), puoi staccare internet e tutto continua a funzionare.

### 🔐 Accesso Staff offline (admin/owner/moderator/operator)

L'area `/admin` funziona **anche senza Internet** grazie a due livelli:

1. **Fase 1 — Cache credenziali (automatica):** ogni volta che fai login in `/admin` con Internet, la tua password viene memorizzata in forma HASHED (PBKDF2-SHA256, 100.000 iter) in `local-server/data/staff-cache.json` con durata 30 giorni (configurabile). Se Internet cade, `/admin` tenta automaticamente il login locale con la **stessa email e password**.
   - Nella schermata login, se non avevi mai aperto `/admin` prima, inserisci l'**email completa** invece dello username.
   - Appare il badge **🔌 Modalità Locale** nell'header admin per ricordartelo.
   - Le scritture cloud (settings globali, ruoli, audit log) vengono accodate in `data/pending-sync.json` e sincronizzate quando torna Internet.

2. **Fase 2 — Master PIN (emergenza):** se il PC è nuovo o la cache è vuota/corrotta, configura `STAFF_MASTER_PIN` in `local-server/.env`. Nella schermata `/admin` compare il link **"Accesso di emergenza locale"** che chiede solo il PIN. Modalità solo-locale (niente sync cloud finché non rientri da utente reale).

```bash
# In local-server/.env (opzionale)
STAFF_CACHE_TTL_DAYS=30
STAFF_MASTER_PIN=        # vuoto = disattivato
STAFF_MASTER_PIN_ROLE=admin
STAFF_CACHE_ALLOWED_EMAILS=  # opzionale: whitelist email
```

**Distinzione chiara dei tre PIN/accessi:**

| Accesso | A chi serve | Quando |
|---|---|---|
| **PIN Format/Clienti** | Partecipanti Open Mic, Dediche | Schermata PIN dei formati |
| **Credenziali Staff in cache** | Tu/Staff già loggato online almeno una volta | Default in qualunque login offline |
| **STAFF_MASTER_PIN** | Solo emergenza | PC nuovo / cache vuota |

Puoi vedere lo stato della cache (utenti memorizzati, scritture in coda, Master PIN attivo) da **Admin → Impostazioni → Server Locale → Staff Offline**. Da lì puoi anche **svuotare la cache** prima di prestare o dismettere il PC.

### Requisiti per il funzionamento offline



1. **Il router deve mantenere la rete locale attiva** senza internet (la maggior parte dei router tradizionali lo fa)
2. **I brani devono essere stati sincronizzati** prima di staccare internet
3. **I dispositivi devono restare connessi al WiFi del router** (non passare a dati mobili)

### Se i telefoni non raggiungono il server senza internet

Il problema è quasi sempre il **router** o le **impostazioni del telefono**:

| Causa | Soluzione |
|-------|----------|
| Il telefono passa ai dati mobili | **Disattiva i dati mobili** dal telefono |
| Android "Passa a dati mobili automaticamente" | Disattiva in WiFi → Impostazioni avanzate |
| iPhone "Assistenza Wi-Fi" | Disattiva in Impostazioni → Cellulare (in fondo) |
| Il router spegne il WiFi senza WAN | Controlla le impostazioni del router (vedi sotto) |

### Configurazione GL.iNet (es. GL-MT1300, Beryl, Slate, ecc.)

I router GL.iNet usano `192.168.8.1` come gateway. Per assicurarti che la LAN resti attiva senza internet:

1. Apri `http://192.168.8.1` dal browser del PC
2. Vai in **Internet** → verifica che la modalità sia **Cavo** (non Ripetitore/Tethering)
3. Vai in **Clients** → verifica che PC e telefoni siano tutti visibili
4. **Importante:** In modalità **Ripetitore WiFi**, se la sorgente WiFi cade, il GL.iNet potrebbe disattivare la propria rete. Usa la modalità **Cavo (Ethernet)** per il WAN.

### Test di connettività offline

Dopo aver staccato internet, dal telefono apri Chrome e vai su:

```
http://192.168.8.10:8080/api/ping
```

- ✅ `{"ok":true}` → la rete locale funziona, il server è raggiungibile
- ❌ "Impossibile raggiungere il sito" → il telefono non è sulla stessa rete o il router ha disattivato la LAN

### Soluzione alternativa: Hotspot dal PC

Se il router non mantiene la LAN senza internet, puoi creare un hotspot WiFi direttamente dal PC:

1. **Windows 11:** Impostazioni → Rete → Hotspot mobile → Attiva
2. Connetti i telefoni all'hotspot del PC
3. L'IP del server sarà `192.168.137.1` (default Windows)
4. Apri `http://192.168.137.1:8080/trasmetti` sulla TV, ecc.

---

## 🔍 TEST RAPIDO

Per verificare che il server funzioni, apri Chrome su:

```
http://192.168.8.10:8080/api/ping
```

Devi vedere: `{"ok":true,"ts":...}`

Se vedi una pagina HTML o un errore, il server non è avviato correttamente.

---

## 🛑 SPEGNERE IL SERVER

Nella finestra PowerShell dove gira il server, premi **Ctrl+C**.
