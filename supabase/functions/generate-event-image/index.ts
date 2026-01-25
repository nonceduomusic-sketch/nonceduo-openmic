import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { theme, width, height, type, sourceImage } = await req.json();

    if (!theme) {
      return new Response(
        JSON.stringify({ error: 'Theme is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aspectRatio = width / height;
    const formatDesc = aspectRatio < 1 ? 'portrait/vertical' : aspectRatio > 1 ? 'landscape/horizontal' : 'square';
    
    const isEditing = !!sourceImage;
    
    console.log(`${isEditing ? 'Editing' : 'Generating'} AI image: ${theme} (${width}x${height}, ${formatDesc})`);

    let messages;
    
    if (isEditing) {
      // Image editing mode: pass the source image and edit instructions
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Edit this image following these instructions: "${theme}".
              
IMPORTANT RULES:
- Keep the main subjects/people in the photo
- Only modify the background, lighting, or style as requested
- Maintain the composition and key elements
- Apply artistic enhancements while preserving the subjects
- Output format: ${width}x${height}px (${formatDesc})
- Make it suitable for event poster/social media with space for text overlay
Ultra high resolution.`
            },
            {
              type: 'image_url',
              image_url: {
                url: sourceImage
              }
            }
          ]
        }
      ];
    } else {
      // Generation mode: create new image from scratch
      const promptType = type === 'story' 
        ? 'Instagram story background for a live music event'
        : 'professional event poster background for a music event';
        
      messages = [
        {
          role: 'user',
          content: `Generate a ${promptType} with theme: "${theme}". 
          Style: Artistic, sophisticated with rich textures.
          Requirements:
          - Format ${width}x${height}px (${formatDesc})
          - Color palette suitable for text overlay (darker areas for readability)
          - Abstract, artistic background WITHOUT any text or letters
          - Professional quality for Instagram/Facebook
          - Theme: ${theme}
          - Should work well with white/light text overlay
          Ultra high resolution.`
        }
      ];
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages,
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Troppi tentativi, riprova tra poco' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI esauriti' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI image ${isEditing ? 'edited' : 'generated'} successfully`);
    
    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-event-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
