# 📱 Guida Compilazione App Android - NonceDuo Screen Share

Questa guida ti permette di compilare l'app Android nativa con funzionalità di screen share.

## 📋 Prerequisiti

1. **Computer** (Windows, Mac o Linux)
2. **Android Studio** installato ([scarica qui](https://developer.android.com/studio))
3. **Node.js** installato ([scarica qui](https://nodejs.org/))
4. **Git** installato ([scarica qui](https://git-scm.com/))

---

## 🚀 Passaggi

### 1. Esporta il progetto su GitHub

1. In Lovable, clicca su **Settings** (icona ingranaggio)
2. Vai su **GitHub** sotto "Connectors"
3. Clicca **Export to GitHub**
4. Segui le istruzioni per collegare il tuo account GitHub

### 2. Clona il repository sul tuo PC

Apri il terminale e esegui:

```bash
git clone https://github.com/TUO-USERNAME/TUO-REPO.git
cd TUO-REPO
```

### 3. Installa le dipendenze

```bash
npm install
```

### 4. Aggiungi la piattaforma Android

```bash
npx cap add android
```

### 5. Copia il plugin screen capture

Copia la cartella `android-plugin/screencapture` dentro `android/app/src/main/java/` e registra il plugin.

Oppure, se vuoi saltare il plugin nativo per ora, l'app funzionerà comunque con le altre funzionalità.

### 6. Builda il progetto web

```bash
npm run build
```

### 7. Sincronizza con Android

```bash
npx cap sync android
```

### 8. Apri in Android Studio

```bash
npx cap open android
```

### 9. Compila e installa

In Android Studio:
1. Collega il tuo tablet/telefono via USB
2. Abilita **Debug USB** sul dispositivo (Impostazioni → Opzioni sviluppatore)
3. Clicca il pulsante ▶️ **Run** in Android Studio
4. L'app verrà installata sul dispositivo!

---

## 🔄 Aggiornamenti futuri

Quando fai modifiche in Lovable:

```bash
git pull
npm install
npm run build
npx cap sync android
npx cap run android
```

---

## ⚙️ Configurazione Hot Reload (Sviluppo)

Durante lo sviluppo, l'app carica direttamente dalla preview di Lovable (vedi `capacitor.config.ts`).

Per la **versione produzione** (offline), commenta la sezione `server` nel file `capacitor.config.ts`:

```typescript
// server: {
//   url: '...',
//   cleartext: true,
// },
```

Poi ricompila con `npm run build && npx cap sync android`.

---

## ❓ Problemi comuni

### "Device not found"
- Assicurati che il debug USB sia abilitato
- Prova un altro cavo USB
- Installa i driver ADB per il tuo dispositivo

### Build fallisce
- Assicurati di avere Java 17 installato
- In Android Studio: File → Sync Project with Gradle Files

### L'app non si connette
- Verifica che il tablet sia sulla stessa rete WiFi del server
- Controlla che l'URL in `capacitor.config.ts` sia corretto

---

## 📖 Documentazione

- [Guida Capacitor](https://capacitorjs.com/docs)
- [Blog post Lovable su app native](https://lovable.dev/blog/building-mobile-apps-with-lovable-and-capacitor)
