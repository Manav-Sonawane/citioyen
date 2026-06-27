import { Router } from "express";
import { requireAuth } from "../middleware/index.js";
import { extractReportFromChat } from "../services/gemini.js";
import { matchWard } from "../services/geocoding.js";

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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    const query = encodeURIComponent(extraction.location?.normalizedAddressQuery || "");
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`;
    
    console.log("Geocoding API Request for chat report:");
    console.log("  normalizedAddressQuery:", extraction.location?.normalizedAddressQuery);

    const geoResponse = await fetch(geoUrl);
    const geoData = (await geoResponse.json()) as any;

    console.log("  Response status:", geoData.status);
    if (geoData.status === "OK" && geoData.results && geoData.results.length > 0) {
      console.log("  address_components:", JSON.stringify(geoData.results[0].address_components, null, 2));
    }

    console.log("Geocoding response for:", extraction.location?.normalizedAddressQuery, "status:", geoData.status, "results:", geoData.results?.length);

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
          title: extraction.title,
          description: extraction.description,
          categoryHint: extraction.categoryHint,
          landmark: extraction.location?.landmark || null,
          area: extraction.location?.area || null
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
          title: extraction.title,
          description: extraction.description,
          categoryHint: extraction.categoryHint,
          landmark: extraction.location?.landmark || null,
          area: extraction.location?.area || null
        }
      });
    }

    const result = geoData.results[0];
    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;
    const addressText = result.formatted_address;

    const wardId = await matchWard(result);

    return res.json({
      readyToSubmit: true,
      extracted: {
        title: extraction.title,
        description: extraction.description,
        lat,
        lng,
        addressText,
        categoryHint: extraction.categoryHint,
        wardId,
        landmark: extraction.location?.landmark || null,
        area: extraction.location?.area || null
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
