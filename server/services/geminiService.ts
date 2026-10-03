import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (apiKey && process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client, falling back to rule engine:', err);
  }
}

export interface AIEnhancedAnalysis {
  enhancedScore?: number;
  nuanceExplanation?: string;
  sentimentTone?: string;
  urgencyIndicators?: string[];
}

export async function analyzeDistressWithGemini(
  text: string, 
  language: string = 'English'
): Promise<AIEnhancedAnalysis | null> {
  if (!aiClient || !text || text.length < 5) {
    return null;
  }

  try {
    const prompt = `You are a specialized clinical distress assessor assisting the NHAA 14566 crisis helpline in India.
Analyze the following citizen transcript (which may be in English, Hindi, Kannada, or Hinglish):
"${text}"

Respond with ONLY a raw JSON object (no markdown, no backticks) with this structure:
{
  "distressScore": <number 0 to 100 representing emotional stress, panic and helplessness>,
  "sentimentTone": <short string like "Terrified", "Despairing", "Anxious", "Calm Inquiry">,
  "nuanceExplanation": <one brief clinical sentence explaining the hidden psychological signs or coercion>,
  "urgencyIndicators": [<array of up to 3 specific alarming clues>]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text?.trim() || '';
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      enhancedScore: typeof parsed.distressScore === 'number' ? parsed.distressScore : undefined,
      nuanceExplanation: parsed.nuanceExplanation,
      sentimentTone: parsed.sentimentTone,
      urgencyIndicators: Array.isArray(parsed.urgencyIndicators) ? parsed.urgencyIndicators : []
    };
  } catch (err) {
    console.warn('Gemini analysis failed or rate limited, gracefully using rule-based assessment:', err);
    return null;
  }
}
