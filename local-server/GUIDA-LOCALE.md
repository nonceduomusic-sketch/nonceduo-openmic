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

1. Apri **PowerShell**
2. Scrivi:

```
cd C:\Users\iaco_\nonceduo\local-server
node server.js
```

3. Aspetta di vedere:

```
🎵 NonceDuo Local Server
HTTP Server:     porta 8080
WebSocket:       porta 3456
```

4. ✅ **Fatto!** Il server è acceso. **NON chiudere questa finestra!**

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

1. Il server deve essere **acceso** (vedi sopra)
2. Apri Chrome su: `http://192.168.8.10:8080/admin`
3. Vai nella sezione **Impostazioni** → **Connessione Server LAN**
4. Premi **Sincronizza Catalogo** e **Sincronizza SongBook**
5. Aspetta il messaggio verde di conferma ✅

---

## 🔄 AGGIORNARE L'APP (dopo modifiche al codice)

> Usa questo SOLO quando ti dico "aggiorna il server" o dopo che ho fatto modifiche al codice.

Apri **PowerShell** e scrivi i comandi **uno alla volta**.
**Aspetta che ogni comando finisca prima di scrivere il successivo!**

### Passo 1 — Scarica gli aggiornamenti

```
cd C:\Users\iaco_\nonceduo-openmic-nuovo
git pull
```

### Passo 2 — Installa le dipendenze

```
npm install
```

> Aspetta 1-3 minuti.

### Passo 3 — Compila l'app

```
npm run build
```

> Aspetta di vedere "built in X.XXs".

### Passo 4 — Copia i file nel server

```
xcopy dist\* ..\nonceduo\local-server\public\ /E /Y
```

### Passo 5 — Copia anche il server.js aggiornato

```
Copy-Item "C:\Users\iaco_\nonceduo-openmic-nuovo\local-server\server.js" -Destination "C:\Users\iaco_\nonceduo\local-server\server.js" -Force
```

### Passo 6 — Avvia il server

```
cd ..\nonceduo\local-server
node server.js
```

✅ **Fatto!** Server aggiornato e attivo.

---

## 📋 COPIA-INCOLLA RAPIDO

**Solo avviare la serata:**
```
cd C:\Users\iaco_\nonceduo\local-server && node server.js
```

**Aggiornare tutto + avviare (tutto in un colpo):**
```
cd C:\Users\iaco_\nonceduo-openmic-nuovo && git pull && npm install && npm run build && xcopy dist\* ..\nonceduo\local-server\public\ /E /Y && Copy-Item "C:\Users\iaco_\nonceduo-openmic-nuovo\local-server\server.js" -Destination "C:\Users\iaco_\nonceduo\local-server\server.js" -Force && cd ..\nonceduo\local-server && node server.js
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

---

## 📡 FUNZIONAMENTO SENZA INTERNET

Il sistema è progettato per funzionare **completamente offline** sulla rete locale.
Dopo aver sincronizzato i brani (con internet), puoi staccare internet e tutto continua a funzionare.

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
