import { ilike } from "drizzle-orm";
import { db } from "../db/db.js";
import { wards, ward_aliases } from "../db/schema/wards.js";

export async function matchWard(geocodeResult: any): Promise<string | null> {
  if (!geocodeResult || !geocodeResult.address_components) return null;

  for (const component of geocodeResult.address_components) {
    if (
      component.types.includes("sublocality") ||
      component.types.includes("locality")
    ) {
      const name = component.long_name;
      
      const matched = await db.query.wards.findFirst({
        where: ilike(wards.name, `%${name}%`),
        columns: { id: true },
      });

      if (matched) {
        return matched.id;
      }

      const aliasMatched = await db.query.ward_aliases.findFirst({
        where: ilike(ward_aliases.areaName, `%${name}%`),
        columns: { wardId: true },
      });

      if (aliasMatched) {
        return aliasMatched.wardId;
      }
    }
  }

  return null;
}

export async function reverseGeocodeAndMatchWard(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  
  console.log("Geocoding API Request for regular form:");
  console.log("  latlng:", `${lat},${lng}`);

  try {
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json() as any;

    console.log("  Response status:", geoData.status);

    if (geoData.status === "OK" && geoData.results && geoData.results.length > 0) {
      console.log("  address_components:", JSON.stringify(geoData.results[0].address_components, null, 2));
      return await matchWard(geoData.results[0]);
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
  }

  return null;
}
