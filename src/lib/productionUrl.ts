 // Utility to get the production base URL for generated links
 // This ensures links always use the custom domain, not the preview/staging URL
 
 const PRODUCTION_DOMAIN = 'https://nonceduo.com';
 
 /**
  * Returns true when the app is served from the local mini-server
  * (HTTP on port 8080 or any non-standard port on a private IP).
  */
 export function isLocalServer(): boolean {
   const { protocol, hostname, port } = window.location;
   // Local server is always HTTP on port 8080 (or similar)
   if (protocol === 'http:' && port && port !== '80') return true;
   // Private IP without HTTPS
   if (protocol === 'http:' && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
   return false;
 }

 /**
  * Returns the production base URL for generating shareable links.
  */
 export function getProductionBaseUrl(): string {
   const origin = window.location.origin;
   
   const isLovableUrl = origin.includes('lovable.app') || 
                        origin.includes('lovable.dev') ||
                        origin.includes('lovableproject.com');
   
   if (isLovableUrl) {
     return PRODUCTION_DOMAIN;
   }
   
   return origin;
 }