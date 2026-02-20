import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    
    if (!input || input.length < 2) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching places for input: "${input}"`);

    // Use the new Places API (New) endpoint
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['locality', 'administrative_area_level_3', 'sublocality'],
        includedRegionCodes: ['US'],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Google Places API error:', data.error.message);
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse predictions from new API format
    const predictions = (data.suggestions || [])
      .filter((suggestion: any) => suggestion.placePrediction)
      .map((suggestion: any) => {
        const prediction = suggestion.placePrediction;
        const fullText = prediction.text?.text || '';
        
        // Parse city and state from the description
        // Format is typically "City, State, USA" or "City, County, State, USA"
        const parts = fullText.split(', ');
        const city = parts[0] || '';
        
        // Find the state - it's usually before "USA"
        let state = '';
        if (parts.length >= 3) {
          // Check if second to last is a US state abbreviation or full name
          const potentialState = parts[parts.length - 2];
          if (potentialState && potentialState !== 'USA') {
            state = potentialState;
          }
        }
        
        return {
          placeId: prediction.placeId,
          description: fullText,
          city,
          state,
        };
      });

    console.log(`Found ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-places function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
