export const WHATSAPP_NUMBER = "+39 380 791 1941";

export const formatWhatsAppMessage = (name: string, title: string, artist: string): string => {
  return `Ciao, sono ${name}. Vorrei prenotare la canzone: '${title} – ${artist}'`;
};

export const getWhatsAppUrl = (name: string, title: string, artist: string): string => {
  const message = formatWhatsAppMessage(name, title, artist);
  const encodedMessage = encodeURIComponent(message);
  const cleanNumber = WHATSAPP_NUMBER.replace(/\s/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
};

// Function to open WhatsApp URL with iOS compatibility
export const openWhatsApp = (name: string, title: string, artist: string): void => {
  const url = getWhatsAppUrl(name, title, artist);
  
  // iOS Safari blocks window.open in async contexts
  // Use location.href as fallback for better iOS compatibility
  const newWindow = window.open(url, '_blank');
  
  // If window.open fails (e.g., on iOS), use location.href
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    window.location.href = url;
  }
};

export const getLyricsSearchUrl = (title: string, artist: string): string => {
  const query = encodeURIComponent(`${title} ${artist} testo`);
  return `https://www.google.com/search?q=${query}`;
};
