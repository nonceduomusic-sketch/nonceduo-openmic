export type StandbyMode = 'logo' | 'openmic' | 'furore' | 'furore_qr' | 'app';

export const STANDBY_MODE_OPTIONS: Array<{ value: StandbyMode; label: string; desc: string }> = [
  { value: 'logo', label: '🎵 Solo Logo', desc: 'Logo grande centrato su sfondo scuro (ideale per LED wall)' },
  { value: 'openmic', label: '🎤 Open Mic', desc: 'Schermata con QR code per prenotare canzoni' },
  { value: 'furore', label: '🔥 Non C\'è Furore', desc: 'Mostra la pulsantiera e la griglia giocatori' },
  { value: 'furore_qr', label: '🔥 Non C\'è Furore + QR Code', desc: 'QR code per aprire la pulsantiera Furore' },
  { value: 'app', label: '📱 Pagina APP', desc: 'QR code per entrare nell\'app e scegliere un gioco' },
];

export const FURORE_QR_REQUIRED_ELEMENTS = ['logo', 'title', 'subtitle', 'qr', 'qr_cta', 'footer'] as const;
export const APP_REQUIRED_ELEMENTS = ['logo', 'title', 'subtitle', 'qr', 'qr_cta', 'footer'] as const;

/** Fixed QR destination URLs per standby mode */
export const STANDBY_QR_URLS: Record<StandbyMode, string> = {
  logo: '',
  openmic: 'https://nonceduo.com/app/openmic',
  furore: '',
  furore_qr: 'https://nonceduo.com/app/furore',
  app: 'https://nonceduo.com/app',
};

/** Default title/subtitle/CTA per mode */
export const STANDBY_DEFAULTS: Record<StandbyMode, { title: string; subtitle: string; qrCta: string }> = {
  logo: { title: '', subtitle: '', qrCta: '' },
  openmic: {
    title: 'Open Mic',
    subtitle: 'NonceDuo Live Experience',
    qrCta: 'Scansiona per prenotare la tua canzone',
  },
  furore: { title: "Non C'è Furore", subtitle: '', qrCta: '' },
  furore_qr: {
    title: "Non C'è Furore",
    subtitle: 'Scansiona e apri la tua pulsantiera',
    qrCta: 'Scansiona e premi il buzzer!',
  },
  app: {
    title: 'Entra nel Gioco',
    subtitle: 'Scansiona il QR e scegli a cosa giocare',
    qrCta: 'Scansiona per entrare!',
  },
};

const sanitize = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const normalizeStandbyMode = (mode: string | null | undefined): StandbyMode => {
  const value = sanitize(mode);

  if (value === 'app' || value === 'pagina app') return 'app';

  if (
    value === 'furore_qr' ||
    value === 'furore-qr' ||
    value === 'furore qr' ||
    (value.includes('furore') && value.includes('qr'))
  ) {
    return 'furore_qr';
  }

  if (value === 'furore' || (value.includes('non c') && value.includes('furore'))) {
    return 'furore';
  }

  if (value === 'logo' || value.includes('solo logo')) {
    return 'logo';
  }

  if (value === 'openmic' || value === 'open mic') {
    return 'openmic';
  }

  return 'openmic';
};

export const resolveStandbyMode = (mode: string | null | undefined): StandbyMode => {
  return normalizeStandbyMode(mode);
};
