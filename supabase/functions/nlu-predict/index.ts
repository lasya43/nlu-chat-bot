import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rule-based NLU prediction system
function predictNLU(text: string) {
  const lowerText = text.toLowerCase();
  
  // Intent classification rules
  const intentRules = {
    book_flight: ['book flight', 'flight ticket', 'fly to', 'airline', 'plane ticket'],
    check_weather: ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'climate'],
    find_restaurant: ['restaurant', 'eat', 'dining', 'food place', 'lunch', 'dinner'],
    order_food: ['order food', 'delivery', 'pizza', 'burger', 'takeout'],
    get_directions: ['directions', 'how to get', 'navigate', 'route', 'way to'],
    book_hotel: ['book hotel', 'hotel room', 'accommodation', 'stay at'],
    cancel_booking: ['cancel', 'cancellation', 'refund'],
    check_status: ['status', 'check my', 'where is my'],
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    farewell: ['bye', 'goodbye', 'see you', 'take care'],
  };

  // Find matching intent
  let predictedIntent = 'ask_question';
  let maxMatches = 0;
  
  for (const [intent, keywords] of Object.entries(intentRules)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      predictedIntent = intent;
    }
  }

  const confidence = maxMatches > 0 ? 0.85 : 0.5;

  // Entity extraction rules
  const entities: Array<{text: string, type: string, start: number, end: number}> = [];
  
  // Location patterns
  const locationWords = ['new york', 'london', 'paris', 'tokyo', 'delhi', 'mumbai', 'bangalore', 'chennai'];
  locationWords.forEach(loc => {
    const index = lowerText.indexOf(loc);
    if (index !== -1) {
      entities.push({
        text: text.substring(index, index + loc.length),
        type: 'location',
        start: index,
        end: index + loc.length
      });
    }
  });

  // Date patterns (simple)
  const datePatterns = /\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi;
  let match;
  while ((match = datePatterns.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'date',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Time patterns
  const timePatterns = /\b(\d{1,2}:\d{2}\s?(am|pm)?|\d{1,2}\s?(am|pm))\b/gi;
  while ((match = timePatterns.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'time',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Number/quantity patterns
  const numberPatterns = /\b(\d+)\s?(people|person|tickets?|rooms?|nights?|days?)\b/gi;
  while ((match = numberPatterns.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'quantity',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Remove duplicate entities
  const uniqueEntities = entities.filter((entity, index, self) =>
    index === self.findIndex(e => e.start === entity.start && e.end === entity.end)
  );

  return {
    intent: predictedIntent,
    confidence: confidence,
    entities: uniqueEntities
  };
}

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

    console.log("Predicting intent and entities for text:", text);

    const result = predictNLU(text);
    
    console.log("Prediction result:", JSON.stringify(result, null, 2));

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
