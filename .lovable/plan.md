Piano di redesign evolutivo per Non C'è Duo

Obiettivo
Mantenere l'anima visiva dark + accenti rosa/ciano che riconosci del sito attuale, ma portare tutte le pagine principali allo stesso livello di eleganza, modernità e coerenza della pagina Non C'è Band.

Palette e stile (bloccati)
- Sfondo: palette scura esistente (slate/nero).
- Accenti: rosa/ciano attuali (primary e secondary).
- Tipografia: Bebas Neue per titoli display, Barlow per corpo e UI.
- Card: bordi sottili, hover lift, immagini con taglio dall'alto, ombre leggere.
- Spazi: più respiro, sezioni full-width con ritmo scorrevole.
- Menu: hamburger coerente su tutte le pagine, anche desktop dove serve.

Pagine coinvolte
1. Home
   - Hero rinnovato con titolo Bebas Neue oversize, sottotitolo raffinato, CTA principale e secondario.
   - Sezione formati in griglia (Open Mic, Non C'è Furore, Dediche, Giochi, Social).
   - Sezione band / Party Band in evidenza.
   - Footer coerente con la pagina band.

2. Non C'è Band
   - Già rinnovata. Solo piccoli aggiustamenti di coerenza (bottoni, font, spazi) per allinearla al nuovo sistema.

3. Party Band / Promo Feste Piazza
   - Allineare header, menu, tipografia, bottoni e card allo stile del resto del sito.
   - Mantenere i contenuti e i CTA di conversione.

4. Open Mic, Non C'è Furore, Dediche, Giochi, Social
   - Header e menu coerenti.
   - Titoli in Bebas Neue.
   - Card e sezioni riprogettate con più respiro e tagli fotografici eleganti.
   - Bottom nav mobile coerente.

5. Componenti condivisi
   - SiteHeader: aggiornato con font e spazi nuovi.
   - Footer: allineato al nuovo stile.
   - Bottoni: varianti primary (rosa) e secondary (ciano/outline) uniformi.
   - Card: componente base riutilizzato nelle pagine.

Cosa NON cambia
- Funzionalità, flussi di auth, backend, logica di eventi, PIN, local server.
- URL delle pagine.
- Contenuti testuali (testi, descrizioni, CTA) se non necessario.

Fasi
1. Audit componenti: leggere SiteHeader, Footer, index.css, tailwind.config e le pagine principali.
2. Definire token CSS: aggiungere font Bebas Neue e Barlow, variabili per gradienza e ombre.
3. Home: rifare hero, sezione formati, sezione band, footer.
4. Non C'è Band: micro-aggiornamenti di coerenza.
5. Party Band / Promo Feste: allineare header e card.
6. Formati: allineare header, titoli, card, bottom nav.
7. Verifica: build, screenshot desktop/mobile, controllo coerenza menu.

Consegne
- Preview aggiornata con la nuova homepage.
- Tutte le pagine principali visivamente coerenti.
- Mobile e desktop mantengono parity completa.