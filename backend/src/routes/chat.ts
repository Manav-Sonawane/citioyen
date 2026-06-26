import { Router } from "express";
import { requireAuth } from "../middleware/index.js";
import { extractReportFromChat } from "../services/gemini.js";

export const chatRouter = Router();

chatRouter.post("/report", requireAuth, async (req, res) => {
  const { conversationHistory } = req.body;

  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return res.status(400).json({ error: "Invalid conversation history" });
  }

  const extraction = await extractReportFromChat(conversationHistory);

  if (!extraction.readyToSubmit) {
    return res.json({
      readyToSubmit: false,
      followUpQuestion: extraction.followUpQuestion,
      botMessage: extraction.followUpQuestion
    });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Maps API Key");
    }

    const query = encodeURIComponent(extraction.locationText || "");
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = (await geoResponse.json()) as any;

    console.log("Geocoding response for:", extraction.locationText, "status:", geoData.status, "results:", geoData.results?.length);

    if (geoData.status === "OK" && geoData.results && geoData.results.length > 1) {
      const candidates = geoData.results.slice(0, 5).map((r: any) => ({
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        formattedAddress: r.formatted_address
      }));
      return res.json({
        readyToSubmit: false,
        needsLocationPick: true,
        locationCandidates: candidates,
        botMessage: "I found a few places matching that — please tap the correct one on the map below",
        extracted: {
          description: extraction.description,
          categoryHint: extraction.categoryHint
        }
      });
    }

    if (geoData.status !== "OK" || !geoData.results || geoData.results.length === 0) {
      return res.json({
        readyToSubmit: false,
        needsLocationPick: true,
        locationCandidates: [],
        botMessage: "I couldn't find an exact match for that — please tap the location on the map below.",
        extracted: {
          description: extraction.description,
          categoryHint: extraction.categoryHint
        }
      });
    }

    const result = geoData.results[0];
    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;
    const addressText = result.formatted_address;

    return res.json({
      readyToSubmit: true,
      extracted: {
        description: extraction.description,
        lat,
        lng,
        addressText,
        categoryHint: extraction.categoryHint
      }
    });

  } catch (error) {
    console.error("Geocoding error:", error);
    return res.json({
      readyToSubmit: false,
      followUpQuestion: "I had trouble finding that location. Could you try describing it differently?",
      botMessage: "I had trouble finding that location. Could you try describing it differently?"
    });
  }
});
