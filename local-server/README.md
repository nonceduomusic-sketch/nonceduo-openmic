# NonceDuo Local Broadcast Server

Mini-server locale per sincronizzare testi e scroll quando non c'è internet.

## Requisiti

- **Node.js** (versione 18+): scarica da [nodejs.org](https://nodejs.org)

## Installazione (una sola volta)

```bash
cd local-server
npm install
```

## Avvio

```bash
npm start
```

Oppure doppio click su:
- **Windows**: `start.bat`
- **Mac/Linux**: `./start.sh`

Il server parte su **porta 3456**. Vedrai:

```
🎵 NonceDuo Local Server attivo su ws://192.168.x.x:3456
```

## Come usarlo

1. Collega tutti i dispositivi (telefono, TV, tablet) allo **stesso WiFi** del PC
2. Nell'app, vai su **SongBook Live** → icona ⚙️ → **Modalità Locale**
3. Inserisci l'IP mostrato dal server (es. `192.168.1.100`)
4. Fatto! Il telecomando, la TV e le partiture si sincronizzano via rete locale

## Risoluzione problemi

- **"Connessione rifiutata"**: verifica che il firewall non blocchi la porta 3456
- **IP cambiato**: il server mostra l'IP all'avvio. Aggiornalo nell'app
- **Dispositivi non si vedono**: assicurati che siano tutti sullo stesso WiFi
