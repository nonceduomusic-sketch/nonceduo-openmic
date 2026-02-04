// Lead qualification flows - guided button-based conversations

export interface FlowOption {
  id: string;
  label: string;
  emoji: string;
  description?: string;
  nextStep?: string;
  action?: 'whatsapp' | 'instagram' | 'events' | 'repertoire' | 'chat' | 'input';
  inputField?: 'name' | 'title' | 'artist'; // For guided input
  leadType?: string;
  leadScore?: number;
  isFinal?: boolean;
}

export interface FlowStep {
  id: string;
  message: string;
  options: FlowOption[];
  isFinal?: boolean;
  inputMode?: 'name' | 'title' | 'artist' | 'free'; // For guided input
}

// Main qualification flow
export const mainFlow: FlowStep[] = [
  {
    id: 'start',
    message: 'Ciao! 👋 Posso aiutarti a capire se Non c\'è Duo è quello che stai cercando.\n\nDimmi solo una cosa: perché sei qui?',
    options: [
      { id: 'locale', label: 'Ho un locale', emoji: '🏪', description: 'Voglio musica live', nextStep: 'locale_type', leadType: 'locale', leadScore: 80 },
      { id: 'matrimonio', label: 'Matrimonio', emoji: '💍', description: 'Sto organizzando le nozze', nextStep: 'matrimonio_moment', leadType: 'matrimonio', leadScore: 90 },
      { id: 'privato', label: 'Festa privata', emoji: '🎉', description: 'Compleanno, aziendale, ecc.', nextStep: 'privato_type', leadType: 'privato', leadScore: 70 },
      { id: 'pubblico', label: 'Evento pubblico', emoji: '🏘️', description: 'Sagra, piazza, festival', nextStep: 'pubblico_type', leadType: 'pubblico', leadScore: 75 },
      { id: 'curioso', label: 'Solo curiosando', emoji: '👀', description: 'Voglio capire chi siete', nextStep: 'curioso_choice', leadType: 'curioso', leadScore: 20 },
      { id: 'chat_operator', label: 'Parla con noi', emoji: '💬', description: 'Scrivi direttamente', nextStep: 'operator_chat_start', leadType: 'direct_chat', leadScore: 60 },
    ],
  },
  // Direct operator chat flow
  {
    id: 'operator_chat_start',
    message: '💬 **Perfetto!**\n\nPrima di iniziare, come ti chiami?',
    options: [
      { id: 'input_name', label: 'Scrivi il tuo nome', emoji: '✍️', action: 'input', inputField: 'name', nextStep: 'operator_chat_ready' } as FlowOption,
    ],
    inputMode: 'name',
  },
  {
    id: 'operator_chat_ready',
    message: '✅ **Ora puoi scriverci!**\n\nScrivi pure il tuo messaggio qui sotto. Ti risponderemo il prima possibile! 📱',
    options: [
      { id: 'start_chat', label: 'Inizia a scrivere', emoji: '✍️', action: 'chat', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  // Locale flow
  {
    id: 'locale_type',
    message: 'Fantastico! 🎶 Che tipo di serate organizzi di solito?',
    options: [
      { id: 'live', label: 'Live music', emoji: '🎸', nextStep: 'locale_style' },
      { id: 'aperitivo', label: 'Aperitivo', emoji: '🍹', nextStep: 'locale_style' },
      { id: 'cena', label: 'Cena con sottofondo', emoji: '🍽️', nextStep: 'locale_style' },
      { id: 'karaoke', label: 'Karaoke / coinvolgimento', emoji: '🎤', nextStep: 'locale_style' },
    ],
  },
  {
    id: 'locale_style',
    message: 'Cerchi qualcosa di tranquillo o di molto coinvolgente?',
    options: [
      { id: 'tranquillo', label: 'Tranquillo', emoji: '🎹', nextStep: 'locale_final' },
      { id: 'coinvolgente', label: 'Coinvolgente', emoji: '🔥', nextStep: 'locale_final' },
      { id: 'dipende', label: 'Dipende dalla serata', emoji: '🎭', nextStep: 'locale_final' },
    ],
  },
  {
    id: 'locale_final',
    message: 'Perfetto! 🎵 Ci adattiamo al pubblico e al volume del locale. Possiamo fare sia serate tranquille che super coinvolgenti.\n\n**Vuoi parlare di date e cachet?**',
    options: [
      { id: 'whatsapp', label: 'Scrivici su WhatsApp', emoji: '💬', action: 'whatsapp', isFinal: true } as FlowOption,
      { id: 'instagram', label: 'Seguici su Instagram', emoji: '📱', action: 'instagram', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  // Matrimonio flow
  {
    id: 'matrimonio_moment',
    message: 'Auguri per le nozze! 💒 Che momento della giornata vi interessa?',
    options: [
      { id: 'aperitivo', label: 'Aperitivo elegante', emoji: '🥂', nextStep: 'matrimonio_style' },
      { id: 'cena', label: 'Durante la cena', emoji: '🍽️', nextStep: 'matrimonio_style' },
      { id: 'party', label: 'Party serale', emoji: '🎉', nextStep: 'matrimonio_style' },
      { id: 'tutto', label: 'Tutto il giorno', emoji: '☀️', nextStep: 'matrimonio_style' },
    ],
  },
  {
    id: 'matrimonio_style',
    message: 'Preferite qualcosa di romantico o super coinvolgente?',
    options: [
      { id: 'romantico', label: 'Romantico ed elegante', emoji: '💕', nextStep: 'matrimonio_final' },
      { id: 'coinvolgente', label: 'Coinvolgente e divertente', emoji: '💃', nextStep: 'matrimonio_final' },
      { id: 'mix', label: 'Un po\' di tutto', emoji: '✨', nextStep: 'matrimonio_final' },
    ],
  },
  {
    id: 'matrimonio_final',
    message: 'Perfetto! 💍 Gestiamo musica, atmosfera e coinvolgimento **senza stressarvi**. Pensiamo a tutto noi!\n\n**Volete verificare la disponibilità per la vostra data?**',
    options: [
      { id: 'whatsapp', label: 'Chiedi disponibilità', emoji: '📅', action: 'whatsapp', isFinal: true } as FlowOption,
      { id: 'instagram', label: 'Vedi le nostre serate', emoji: '📱', action: 'instagram', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  // Festa privata flow
  {
    id: 'privato_type',
    message: 'Bella! 🎈 Che tipo di festa organizzi?',
    options: [
      { id: 'compleanno', label: 'Compleanno', emoji: '🎂', nextStep: 'privato_final' },
      { id: 'aziendale', label: 'Evento aziendale', emoji: '🏢', nextStep: 'privato_final' },
      { id: 'laurea', label: 'Laurea / Diploma', emoji: '🎓', nextStep: 'privato_final' },
      { id: 'altro', label: 'Altro', emoji: '🎊', nextStep: 'privato_final' },
    ],
  },
  {
    id: 'privato_final',
    message: 'Fantastico! 🎉 Ci adattiamo allo spazio e al pubblico, senza effetti "matrimonio forzato". Musica coinvolgente ma su misura!\n\n**Vuoi raccontarci dell\'evento?**',
    options: [
      { id: 'whatsapp', label: 'Raccontaci l\'evento', emoji: '💬', action: 'whatsapp', isFinal: true } as FlowOption,
      { id: 'chat', label: 'Scrivi qui', emoji: '✍️', action: 'chat', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  // Evento pubblico flow
  {
    id: 'pubblico_type',
    message: 'Interessante! 🏘️ Che tipo di evento pubblico è?',
    options: [
      { id: 'sagra', label: 'Sagra / Festa di paese', emoji: '🎪', nextStep: 'pubblico_final' },
      { id: 'piazza', label: 'Concerto in piazza', emoji: '🏛️', nextStep: 'pubblico_final' },
      { id: 'festival', label: 'Festival / Rassegna', emoji: '🎭', nextStep: 'pubblico_final' },
      { id: 'patrocinato', label: 'Evento patrocinato', emoji: '📜', nextStep: 'pubblico_final' },
    ],
  },
  {
    id: 'pubblico_final',
    message: 'Perfetto! 🎵 Abbiamo esperienza con piazze e pubblico eterogeneo: **musica conosciuta, zero tempi morti**.\n\n**Vuoi info per eventi pubblici?**',
    options: [
      { id: 'whatsapp', label: 'Contatti eventi pubblici', emoji: '📋', action: 'whatsapp', isFinal: true } as FlowOption,
      { id: 'chat', label: 'Scrivi qui', emoji: '✍️', action: 'chat', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  // Curioso flow
  {
    id: 'curioso_choice',
    message: 'Ciao! 😊 Cosa vorresti sapere?',
    options: [
      { id: 'repertorio', label: 'Cosa suonate?', emoji: '🎵', action: 'repertoire', isFinal: true } as FlowOption,
      { id: 'eventi', label: 'Prossimi live?', emoji: '📅', action: 'events', isFinal: true } as FlowOption,
      { id: 'instagram', label: 'Seguici sui social', emoji: '📱', action: 'instagram', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
];

// Open Mic specific flow (for song not found) - GUIDED FLOW
export const openMicFlow: FlowStep[] = [
  {
    id: 'song_not_found',
    message: 'Non hai trovato la canzone che cercavi? 🎤\n\nNessun problema! Posso aiutarti:',
    options: [
      { id: 'request', label: 'Richiedi canzone', emoji: '📝', nextStep: 'song_request_name' },
      { id: 'help', label: 'Ho bisogno di aiuto', emoji: '❓', nextStep: 'openmic_help' },
    ],
  },
  // GUIDED SONG REQUEST FLOW
  {
    id: 'song_request_name',
    message: '🎵 **Richiedi una canzone**\n\nPer prima cosa, come ti chiami?',
    options: [
      { id: 'input_name', label: 'Scrivi il tuo nome', emoji: '✍️', action: 'input', inputField: 'name', nextStep: 'song_request_title' } as FlowOption,
    ],
    inputMode: 'name',
  },
  {
    id: 'song_request_title',
    message: 'Perfetto! 🎶\n\nOra scrivi il **titolo della canzone** che vorresti cantare:',
    options: [
      { id: 'input_title', label: 'Scrivi il titolo', emoji: '🎵', action: 'input', inputField: 'title', nextStep: 'song_request_artist' } as FlowOption,
    ],
    inputMode: 'title',
  },
  {
    id: 'song_request_artist',
    message: 'Ottimo! 🎤\n\nChi è l\'**artista o la band**? (Puoi anche saltare se non lo sai)',
    options: [
      { id: 'input_artist', label: 'Scrivi artista/band', emoji: '👤', action: 'input', inputField: 'artist', nextStep: 'song_request_confirm' } as FlowOption,
      { id: 'skip_artist', label: 'Non lo so, salta', emoji: '⏭️', nextStep: 'song_request_confirm' },
    ],
    inputMode: 'artist',
  },
  {
    id: 'song_request_confirm',
    message: '✅ **Richiesta registrata!**\n\nAbbiamo ricevuto la tua richiesta. Se possiamo, la inseriamo subito nella scaletta, altrimenti la prepareremo per i prossimi eventi!\n\nVuoi aggiungere altro o hai altre domande?',
    options: [
      { id: 'add_note', label: 'Aggiungi una nota', emoji: '💬', action: 'chat', isFinal: true } as FlowOption,
      { id: 'done', label: 'Grazie, è tutto!', emoji: '👍', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  // HELP FLOW
  {
    id: 'openmic_help',
    message: 'Come posso aiutarti?',
    options: [
      { id: 'how_book', label: 'Come prenoto?', emoji: '📖', nextStep: 'help_booking' },
      { id: 'when_sing', label: 'Quando tocca a me?', emoji: '⏰', nextStep: 'help_queue' },
      { id: 'other', label: 'Altro', emoji: '💬', action: 'chat', isFinal: true } as FlowOption,
    ],
  },
  {
    id: 'help_booking',
    message: '📖 **Come prenotare:**\n\n1. Cerca la canzone nel repertorio\n2. Clicca su "Prenota"\n3. Inserisci il tuo nome\n4. Aspetta il tuo turno!\n\nLa vedrai apparire nella **Scaletta Live** 🎤',
    options: [
      { id: 'ok', label: 'Capito, grazie!', emoji: '👍', isFinal: true } as FlowOption,
      { id: 'other', label: 'Ho altre domande', emoji: '❓', action: 'chat', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  {
    id: 'help_queue',
    message: '⏰ **Quando tocca a te:**\n\nGuarda la sezione **Scaletta Live** per vedere l\'ordine delle canzoni. Quando la tua si avvicina, preparati!\n\nTi chiameremo al microfono quando è il tuo momento 🎤',
    options: [
      { id: 'ok', label: 'Perfetto!', emoji: '🎵', isFinal: true } as FlowOption,
      { id: 'other', label: 'Ho altre domande', emoji: '❓', action: 'chat', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
];

// Dediche specific flow
export const dedicheFlow: FlowStep[] = [
  {
    id: 'dediche_help',
    message: 'Ciao! 💌 Come posso aiutarti con le dediche?',
    options: [
      { id: 'how_send', label: 'Come invio una dedica?', emoji: '💝', nextStep: 'help_send' },
      { id: 'where_see', label: 'Dove la vedono?', emoji: '👀', nextStep: 'help_visibility' },
      { id: 'other', label: 'Altro', emoji: '💬', action: 'chat', isFinal: true } as FlowOption,
    ],
  },
  {
    id: 'help_send',
    message: '💝 **Come inviare una dedica:**\n\n1. Scegli una canzone dal repertorio\n2. Clicca "Dedica"\n3. Scrivi il messaggio per la persona speciale\n4. Invia!\n\nLa leggeremo al microfono e la mostreremo sullo schermo 🎤✨',
    options: [
      { id: 'ok', label: 'Che bello!', emoji: '❤️', isFinal: true } as FlowOption,
      { id: 'other', label: 'Ho altre domande', emoji: '❓', action: 'chat', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
  {
    id: 'help_visibility',
    message: '👀 **Chi vede la tua dedica:**\n\n- Appare sullo schermo dell\'evento\n- La leggiamo al microfono\n- Il destinatario la vedrà in diretta!\n\nÈ il modo perfetto per sorprendere qualcuno 💕',
    options: [
      { id: 'ok', label: 'Fantastico!', emoji: '✨', isFinal: true } as FlowOption,
      { id: 'send', label: 'Voglio inviare una dedica', emoji: '💌', isFinal: true } as FlowOption,
    ],
    isFinal: true,
  },
];

export function getFlowForSection(section: string): FlowStep[] {
  switch (section) {
    case 'openmic':
      return openMicFlow;
    case 'dediche':
      return dedicheFlow;
    default:
      return mainFlow;
  }
}

export function getStepById(flow: FlowStep[], stepId: string): FlowStep | undefined {
  return flow.find(step => step.id === stepId);
}
