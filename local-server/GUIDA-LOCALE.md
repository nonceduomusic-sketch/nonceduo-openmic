# 🎵 Guida Server Locale NonceDuo

---

## 📂 CARTELLE SUL TUO PC

```
C:\Users\iaco_\
  ├── nonceduo-openmic-nuovo\   ← CODICE SORGENTE (qui scarichi gli aggiornamenti)
  ├── nonceduo\local-server\    ← SERVER LOCALE (qui gira l'app per la TV/tablet)
  │     ├── public\             ← File dell'app compilata
  │     └── server.js           ← Il programma del server
  │
  ├── nonceduo-openmic-main\    ← ❌ VECCHIA, PUOI ELIMINARLA
  └── nonceduo\                 ← ⚠️ TIENI! Contiene il server locale
```

### Cosa eliminare?
- ✅ **Elimina** `nonceduo-openmic-main` → è la vecchia copia senza Git
- ⚠️ **TIENI** `nonceduo\local-server` → è il tuo server locale!
- ⚠️ **TIENI** `nonceduo-openmic-nuovo` → è il codice aggiornato con Git

---

## 🟢 CASO 1: Devo solo AVVIARE il server (nessun aggiornamento)

Apri **PowerShell** e scrivi questi comandi uno alla volta:

```
cd C:\Users\iaco_\nonceduo\local-server
```

```
node server.js
```

✅ **Fatto!** Vedrai l'IP da usare sui dispositivi.

> Per spegnere il server: premi **Ctrl+C** nella finestra.

---

## 🔄 CASO 2: Devo AGGIORNARE e poi avviare

Apri **PowerShell** e scrivi questi comandi uno alla volta.
**Aspetta che ogni comando finisca prima di scrivere il successivo!**

### Passo 1 — Scarica gli aggiornamenti

```
cd C:\Users\iaco_\nonceduo-openmic-nuovo
```

```
git pull
```

> Se chiede credenziali, inserisci username e password di GitHub.

### Passo 2 — Installa eventuali nuove dipendenze

```
npm install
```

> Aspetta che finisca (1-3 minuti).

### Passo 3 — Compila l'app

```
npm run build
```

> Aspetta di vedere "built in X.XXs".

### Passo 4 — Copia i file nel server locale

```
xcopy dist\* ..\nonceduo\local-server\public\ /E /Y
```

> Vedrai una lista di file copiati.

### Passo 5 — Avvia il server

```
cd ..\nonceduo\local-server
```

```
node server.js
```

✅ **Fatto!** Server aggiornato e attivo.

---

## ⚠️ PROBLEMI COMUNI

| Problema | Soluzione |
|----------|-----------|
| `EADDRINUSE` (porta occupata) | Scrivi: `taskkill /F /IM node.exe` e poi riprova |
| `git pull` dà errore | Controlla connessione internet |
| `npm run build` fallisce | Scrivi `npm install` e riprova |
| La TV non si connette | Assicurati che PC e TV siano sullo **stesso WiFi** |

---

## 📋 COMANDI RAPIDI (copia-incolla)

### Solo avviare:
```
cd C:\Users\iaco_\nonceduo\local-server && node server.js
```

### Aggiornare + avviare (tutto insieme):
```
cd C:\Users\iaco_\nonceduo-openmic-nuovo && git pull && npm install && npm run build && xcopy dist\* ..\nonceduo\local-server\public\ /E /Y && cd ..\nonceduo\local-server && node server.js
```
