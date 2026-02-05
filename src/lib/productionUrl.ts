 // Utility to get the production base URL for generated links
 // This ensures links always use the custom domain, not the preview/staging URL
 
 const PRODUCTION_DOMAIN = 'https://nonceduo.com';
 
 /**
  * Returns the production base URL for generating shareable links.
  * If we're on a lovable preview/staging URL, it returns the custom domain.
  * Otherwise, it returns the current origin (useful for local dev).
  */
 export function getProductionBaseUrl(): string {
   const origin = window.location.origin;
   
   // Check if we're on a lovable preview or staging URL
   const isLovableUrl = origin.includes('lovable.app') || 
                        origin.includes('lovable.dev') ||
                        origin.includes('lovableproject.com');
   
   if (isLovableUrl) {
     return PRODUCTION_DOMAIN;
   }
   
   // For local development or already on production domain
   return origin;
 }