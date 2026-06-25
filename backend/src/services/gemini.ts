import { GoogleGenAI } from "@google/genai";
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
