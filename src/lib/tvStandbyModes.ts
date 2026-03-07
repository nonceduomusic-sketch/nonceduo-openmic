export type StandbyMode = 'openmic' | 'furore' | 'furore_qr' | 'logo';

export const STANDBY_MODE_OPTIONS: Array<{ value: StandbyMode; label: string; desc: string }> = [
  { value: 'openmic', label: '🎤 Open Mic', desc: 'Schermata classica con QR code e info evento' },
  { value: 'furore', label: '🔥 Non C\'è Furore', desc: 'Mostra la pulsantiera e la griglia giocatori' },
  { value: 'furore_qr', label: '🔥 Non C\'è Furore + QR Code', desc: 'Logo, titolo, sottotitolo, QR, CTA QR e footer' },
  { value: 'logo', label: '🎵 Solo Logo', desc: 'Logo grande centrato su sfondo scuro (ideale per LED wall)' },
];

export const FURORE_QR_REQUIRED_ELEMENTS = ['logo', 'title', 'subtitle', 'qr', 'qr_cta', 'footer'] as const;

const sanitize = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const normalizeStandbyMode = (mode: string | null | undefined): StandbyMode => {
  const value = sanitize(mode);

  if (
    value === 'furore_qr' ||
    value === 'furore-qr' ||
    value === 'furore qr' ||
    (value.includes('furore') && value.includes('qr'))
  ) {
    return 'furore_qr';
  }

  if (value === 'furore' || value.includes('non c') && value.includes('furore')) {
    return 'furore';
  }

  if (value === 'logo' || value.includes('solo logo')) {
    return 'logo';
  }

  return 'openmic';
};

interface ResolveStandbyModeInput {
  mode: string | null | undefined;
  title?: string | null;
  subtitle?: string | null;
  qrCta?: string | null;
}

export const resolveStandbyMode = ({ mode, title, subtitle, qrCta }: ResolveStandbyModeInput): StandbyMode => {
  const normalizedMode = normalizeStandbyMode(mode);
  if (normalizedMode !== 'openmic') return normalizedMode;

  const normalizedTitle = sanitize(title);
  const normalizedSubtitle = sanitize(subtitle);
  const normalizedCta = sanitize(qrCta);

  const looksLikeFuroreQr =
    normalizedTitle.includes('furore') &&
    (normalizedSubtitle.includes('pulsantiera') || normalizedCta.includes('buzzer'));

  return looksLikeFuroreQr ? 'furore_qr' : 'openmic';
};
