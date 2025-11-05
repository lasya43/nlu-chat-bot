import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced rule-based NLU prediction system
function predictNLU(text: string) {
  const lowerText = text.toLowerCase();
  
  // Intent classification rules (expanded)
  const intentRules = {
    book_flight: ['book flight', 'flight ticket', 'fly to', 'airline', 'plane ticket', 'book a flight'],
    check_weather: ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'climate', 'snow', 'will it'],
    find_restaurant: ['restaurant', 'eat', 'dining', 'food place', 'lunch', 'dinner', 'cuisine', 'downtown', 'close to'],
    order_food: ['order food', 'delivery', 'pizza', 'burger', 'takeout', 'churrascaria'],
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
  
  // Location patterns (expanded with common cities and abbreviations)
  const locationWords = [
    'new york', 'london', 'paris', 'tokyo', 'delhi', 'mumbai', 'bangalore', 'chennai',
    'downtown', 'mt', 'montana', 'california', 'texas', 'florida', 'boston', 'chicago',
    'seattle', 'san francisco', 'los angeles', 'miami', 'atlanta'
  ];
  
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

  // Date patterns (enhanced with full dates)
  const datePatterns = /\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:,?\s+\d{2,4})?|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}\b/gi;
  let match: RegExpExecArray | null;
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

  // Number/quantity patterns (expanded)
  const quantityPatterns = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(people|person|tickets?|rooms?|nights?|days?|guests?)\b/gi;
  while ((match = quantityPatterns.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'quantity',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Person/artist names (pattern matching capitalized words)
  const personPattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  while ((match = personPattern.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'person',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Organization/playlist names (quoted or multiple capitalized words)
  const orgPattern = /"([^"]+)"|'([^']+)'|\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,})\b/g;
  while ((match = orgPattern.exec(text)) !== null) {
    const matchedText = match[1] || match[2] || match[3];
    if (matchedText && match && !entities.some(e => e.start === match!.index)) {
      entities.push({
        text: matchedText,
        type: 'organization',
        start: match.index,
        end: match.index + matchedText.length
      });
    }
  }

  // Product/cuisine types
  const productWords = ['churrascaria', 'pizza', 'burger', 'sushi', 'italian', 'chinese', 'mexican', 'thai'];
  productWords.forEach(product => {
    const index = lowerText.indexOf(product);
    if (index !== -1 && !entities.some(e => e.start === index)) {
      entities.push({
        text: text.substring(index, index + product.length),
        type: 'product',
        start: index,
        end: index + product.length
      });
    }
  });

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
