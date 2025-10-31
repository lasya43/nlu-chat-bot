import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Use Lovable AI with tool calling for structured output
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
            content: `You are an NLU (Natural Language Understanding) model that predicts intents and extracts entities from user text.
Possible intents include: book_flight, check_weather, find_restaurant, order_food, get_directions, book_hotel, cancel_booking, check_status, ask_question, greeting, farewell.
Possible entity types: location, date, time, person, organization, product, quantity, price.

Extract entities with their text span, start position, end position, and type.`
          },
          {
            role: "user",
            content: `Analyze this text and extract intent and entities: "${text}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_nlu",
              description: "Extract intent and entities from the user text",
              parameters: {
                type: "object",
                properties: {
                  intent: {
                    type: "string",
                    description: "The predicted intent"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0 and 1"
                  },
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "The entity text" },
                        type: { type: "string", description: "The entity type" },
                        start: { type: "number", description: "Start position in text" },
                        end: { type: "number", description: "End position in text" }
                      },
                      required: ["text", "type", "start", "end"]
                    }
                  }
                },
                required: ["intent", "confidence", "entities"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_nlu" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("No tool call result from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in nlu-predict function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
