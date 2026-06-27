import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const responseSchema = z.object({
  category: z.enum([
    "pothole",
    "streetlight",
    "water_leak",
    "garbage",
    "drainage",
    "illegal_construction",
    "stray_animal",
    "tree_fall",
    "other",
  ]),
  severity: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
});

export type IssueCategoryResponse = z.infer<typeof responseSchema>;

/**
 * Classify a civic issue description (and optional image) using Gemini.
 * Returns raw JSON conforming to IssueCategoryResponse.
 * Fails safely by returning a fallback response instead of throwing.
 */
export async function categorizeIssue(
  description: string,
  imageBuffer?: Buffer,
  imageMimeType?: string
): Promise<IssueCategoryResponse> {
  const fallback: IssueCategoryResponse = {
    category: "other",
    severity: 3,
    confidence: 0,
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are a civic issue classifier. Analyze the following issue description (and image if provided) and categorize it.
Return ONLY raw JSON, with no markdown fences, no explanation, in the exact shape:
{"category": "...", "severity": ..., "confidence": ...}

- category MUST be one of: pothole, streetlight, water_leak, garbage, drainage, illegal_construction, stray_animal, tree_fall, other.
- severity MUST be an integer from 1 to 5 (1=minor, 5=critical/dangerous).
- confidence MUST be a number between 0 and 1.

Description: ${description}`;

    const contents: any[] = [{ text: prompt }];

    if (imageBuffer && imageMimeType) {
      contents.push({
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: imageMimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const text = response.text?.trim() || "";
    // Remove markdown fences if the model ignores the instruction
    const jsonStr = text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonStr);
    const validated = responseSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error("Error in categorizeIssue:", error);
    return fallback;
  }
}

/**
 * Generate a 768-dimensional embedding for the given text.
 * Fails safely by returning null instead of throwing.
 */
export async function embedText(text: string): Promise<number[] | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { outputDimensionality: 768 },
    });
    
    return response.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Error in embedText:", error);
    return null;
  }
}

const verifySchema = z.object({
  looksResolved: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type VerifyResolutionResponse = z.infer<typeof verifySchema>;

export async function verifyResolution(
  beforeImageBuffer: Buffer,
  beforeMimeType: string,
  afterImageBuffer: Buffer,
  afterMimeType: string
): Promise<VerifyResolutionResponse> {
  const fallback: VerifyResolutionResponse = {
    looksResolved: false,
    confidence: 0,
    reasoning: "Could not verify",
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `You are a civic issue resolution inspector. You are given two images:
1. The FIRST image is the 'before' photo showing the originally reported civic issue (e.g. pothole, garbage, broken light).
2. The SECOND image is the 'after' photo submitted by a worker claiming to have fixed it.

Compare them and judge whether the after-photo shows the issue genuinely fixed versus the same problem still visible or an unrelated image.
Return ONLY raw JSON (no markdown fences) in this exact shape:
{"looksResolved": true/false, "confidence": 0.0-1.0, "reasoning": "Brief explanation"}

Be strict but reasonable. If the after-photo clearly shows the location is cleaned/repaired, return true.`;

    const contents: any[] = [
      { text: prompt },
      { inlineData: { data: beforeImageBuffer.toString("base64"), mimeType: beforeMimeType } },
      { inlineData: { data: afterImageBuffer.toString("base64"), mimeType: afterMimeType } },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const text = response.text?.trim() || "";
    const jsonStr = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    return verifySchema.parse(parsed);
  } catch (error) {
    console.error("Error in verifyResolution:", error);
    return fallback;
  }
}

export async function extractReportFromChat(
  conversationHistory: { role: "user" | "model"; text: string }[]
): Promise<{
  title: string | null;
  description: string | null;
  location: {
    landmark: string | null;
    area: string | null;
    city: string;
    normalizedAddressQuery: string;
  } | null;
  categoryHint: string | null;
  readyToSubmit: boolean;
  followUpQuestion: string | null;
}> {
  const fallback = {
    title: null,
    description: null,
    location: null,
    categoryHint: null,
    readyToSubmit: false,
    followUpQuestion: "Sorry, I had trouble understanding that — could you describe the issue again?",
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `You are a civic issue reporting assistant. Analyze the conversation history and extract the current state of the report.
Rules:
1. Extract 'title' (a short 5-8 word descriptive title) and 'description'.
2. Extract 'location' if provided by the user. Construct a structured location object:
   - 'landmark': any specific nearby landmark mentioned (or null).
   - 'area': the neighborhood or area (or null).
   - 'city': the city (infer from context or default to "Mumbai").
   - 'normalizedAddressQuery': compose a clean, geocoder-friendly address string from whatever the user mentioned (e.g., if user says "near Andheri station", output "Andheri Station, Andheri West, Mumbai, Maharashtra, India").
3. Guess 'categoryHint' if possible (e.g. pothole, streetlight, garbage, etc.) or set to null.
4. 'readyToSubmit' must be true ONLY if both 'description' and 'location' (specifically normalizedAddressQuery) are present AND 'description' is detailed enough (at least 10 characters).
5. If 'readyToSubmit' is false, 'followUpQuestion' MUST contain a natural, specific question asking the user for the missing information.
6. If 'readyToSubmit' is true, 'followUpQuestion' should be null.`;

    const contents = conversationHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, nullable: true },
            description: { type: Type.STRING, nullable: true },
            location: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                landmark: { type: Type.STRING, nullable: true },
                area: { type: Type.STRING, nullable: true },
                city: { type: Type.STRING },
                normalizedAddressQuery: { type: Type.STRING }
              },
              required: ["city", "normalizedAddressQuery"]
            },
            categoryHint: { type: Type.STRING, nullable: true },
            readyToSubmit: { type: Type.BOOLEAN },
            followUpQuestion: { type: Type.STRING, nullable: true }
          },
          required: ["readyToSubmit"]
        }
      }
    });

    const text = response.text?.trim() || "";
    if (!text) return fallback;
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || null,
      description: parsed.description || null,
      location: parsed.location || null,
      categoryHint: parsed.categoryHint || null,
      readyToSubmit: !!parsed.readyToSubmit,
      followUpQuestion: parsed.followUpQuestion || null
    };
  } catch (error) {
    console.error("Error in extractReportFromChat:", error);
    return fallback;
  }
}
