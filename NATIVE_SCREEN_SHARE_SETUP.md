# 📱 Setup Screen Share Nativo per Android

Questa guida spiega come integrare il plugin `ScreenCapture` nell'app Android nativa per abilitare lo screen share dal tablet.

## Prerequisiti

- Android Studio installato
- Progetto già esportato su GitHub
- `npx cap add android` già eseguito

---

## Passaggio 1: Copia il Plugin nel Progetto Android

Il codice del plugin è in `android-plugin/screencapture/`. Devi copiarlo dentro la cartella `android/` generata.

```bash
# Dalla root del progetto
cp -r android-plugin/screencapture android/
```

---

## Passaggio 2: Modifica `android/settings.gradle`

Apri il file `android/settings.gradle` e aggiungi queste righe **alla fine**:

```gradle
// Screen Capture Plugin
include ':screencapture'
project(':screencapture').projectDir = new File('./screencapture')
```

---

## Passaggio 3: Modifica `android/app/build.gradle`

Apri `android/app/build.gradle` e nella sezione `dependencies { }` aggiungi:

```gradle
implementation project(':screencapture')
```

Esempio:
```gradle
dependencies {
    implementation project(':capacitor-android')
    implementation project(':screencapture')  // <-- Aggiungi questa riga
    // ... altre dipendenze
}
```

---

## Passaggio 4: Registra il Plugin in MainActivity

Apri `android/app/src/main/java/.../MainActivity.java` (il percorso dipende dal tuo package name, es. `app/nonceduo/openmic/MainActivity.java`).

Aggiungi l'import in alto:
```java
import app.lovable.screencapture.ScreenCapturePlugin;
```

Poi registra il plugin nel metodo `onCreate`:
```java
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

Se `onCreate` non esiste, crealo:
```java
import android.os.Bundle;
import app.lovable.screencapture.ScreenCapturePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

---

## Passaggio 5: Sync e Build

```bash
# Dalla root del progetto
npm run build
npx cap sync android
```

Poi apri Android Studio:
1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. **Run (▶️)**

---

## Passaggio 6: Permessi Android

Il plugin richiede questi permessi (già nel manifest del plugin):
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_MEDIA_PROJECTION`

Su Android 14+ potrebbe essere richiesto un Foreground Service per MediaProjection. Se ricevi errori, potrebbe servire un `ForegroundService`. Contattami se serve.

---

## Verifica

1. Apri l'app sul tablet
2. Vai su `/admin` → sezione Trasmetti
3. Clicca "Avvia Screen"
4. Dovrebbe apparire il prompt di sistema per condividere lo schermo

Se funziona, lo schermo del tablet verrà trasmesso via WebRTC alla TV!

---

## Troubleshooting

### Errore "ScreenCapture is not implemented"
Il plugin non è registrato in MainActivity. Segui il Passaggio 4.

### Errore di build Gradle
Verifica che `settings.gradle` e `app/build.gradle` siano corretti.

### L'app crasha all'avvio
Controlla i log in Android Studio (Logcat) per vedere l'errore specifico.

---

## Note

- Il plugin è specifico per **Android**
- Su iOS, MediaProjection non è supportato allo stesso modo
- Per iOS servirebbe ReplayKit (non implementato)
