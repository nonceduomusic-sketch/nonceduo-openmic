# 🎵 Guida Server Locale NonceDuo

---

## 📂 LE TUE CARTELLE

```
C:\Users\iaco_\
  ├── nonceduo-openmic-nuovo\   ← CODICE (da qui scarichi aggiornamenti)
  ├── nonceduo\local-server\    ← SERVER (da qui parte l'app per TV/tablet)
```

- ❌ **Elimina** la cartella `nonceduo-openmic-main` (è vecchia, non serve più)
- ✅ **Tieni** tutto il resto

---

## 🟢 AVVIARE IL SERVER (senza aggiornamenti)

> Usa questo quando vuoi solo accendere il server per la serata.

Apri **PowerShell** e scrivi:

```
cd C:\Users\iaco_\nonceduo\local-server
```

Premi **Invio**. Poi scrivi:

```
node server.js
```

Premi **Invio**.

✅ Fatto! Vedrai gli indirizzi IP da usare su TV e tablet.

> Per spegnere: premi **Ctrl+C** nella finestra.

---

## 🔄 AGGIORNARE E AVVIARE

> Usa questo quando ti dico "aggiorna il server" o dopo che ho fatto modifiche.

Apri **PowerShell** e scrivi i comandi **uno alla volta**.
**Aspetta che ogni comando finisca prima di scrivere il successivo!**

### 1. Vai nella cartella del codice

```
cd C:\Users\iaco_\nonceduo-openmic-nuovo
```

### 2. Scarica gli aggiornamenti

```
git pull
```

### 3. Installa le dipendenze

```
npm install
```

> Aspetta 1-3 minuti.

### 4. Compila l'app

```
npm run build
```

> Aspetta di vedere "built in X.XXs".

### 5. Copia i file nel server

```
xcopy dist\* ..\nonceduo\local-server\public\ /E /Y
```

### 6. Vai al server

```
cd ..\nonceduo\local-server
```

### 7. Avvia il server

```
node server.js
```

✅ Fatto! Server aggiornato e attivo.

---

## ⚠️ PROBLEMI?

| Problema | Cosa fare |
|----------|-----------|
| `EADDRINUSE` | Scrivi `taskkill /F /IM node.exe` e riprova |
| `git pull` dà errore | Controlla la connessione internet |
| `npm run build` fallisce | Scrivi `npm install` e riprova |
| La TV non si connette | PC e TV devono essere sullo **stesso WiFi** |

---

## 📋 COPIA-INCOLLA RAPIDO

**Solo avviare:**
```
cd C:\Users\iaco_\nonceduo\local-server && node server.js
```

**Aggiornare + avviare (tutto in un colpo):**
```
cd C:\Users\iaco_\nonceduo-openmic-nuovo && git pull && npm install && npm run build && xcopy dist\* ..\nonceduo\local-server\public\ /E /Y && cd ..\nonceduo\local-server && node server.js
```
