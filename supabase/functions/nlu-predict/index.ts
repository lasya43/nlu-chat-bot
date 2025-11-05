import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Predicting intent and entities for text:", text);

    // Use a simpler approach without tool calling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an NLU expert. Analyze user text and return ONLY valid JSON with this exact structure:
{
  "intent": "one of: book_flight, check_weather, find_restaurant, order_food, get_directions, book_hotel, cancel_booking, check_status, ask_question, greeting, farewell",
  "confidence": 0.9,
  "entities": [
    {"text": "entity text", "type": "location|date|time|person|organization|product|quantity|price", "start": 0, "end": 5}
  ]
}

Rules:
- Extract ALL entities you find
- Calculate exact start/end character positions
- Use confidence between 0 and 1
- Return ONLY the JSON object, no other text`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI prediction failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI raw response:", JSON.stringify(data, null, 2));

    // Extract the content from the response
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let result;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(cleanContent);
      
      // Validate the result has required fields
      if (!result.intent || typeof result.confidence !== 'number' || !Array.isArray(result.entities)) {
        throw new Error("Invalid response format");
      }
      
      console.log("Parsed result:", JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
      // Return a default response if parsing fails
      result = {
        intent: "ask_question",
        confidence: 0.5,
        entities: []
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in nlu-predict function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        intent: "ask_question",
        confidence: 0.5,
        entities: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
