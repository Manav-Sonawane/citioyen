import { useRef, useEffect, useCallback } from "react";
import { Map, AdvancedMarker, useMapsLibrary } from "@vis.gl/react-google-maps";

interface LatLng { lat: number; lng: number }

export interface MapLocationPickerProps {
  center: LatLng;
  markerPos?: LatLng | null;
  candidateMarkers?: { lat: number; lng: number; formattedAddress?: string }[];
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export function useReverseGeocode() {
  const geocodingLib = useMapsLibrary("geocoding");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    if (geocodingLib) geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  const reverseGeocode = useCallback(
    (lat: number, lng: number): Promise<string> => {
      return new Promise((resolve) => {
        if (!geocoderRef.current) { resolve(""); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve("");
          }
        });
      });
    },
    []
  );

  return reverseGeocode;
}

export function MapLocationPicker({ center, markerPos, candidateMarkers, onLocationSelect }: MapLocationPickerProps) {
  const reverseGeocode = useReverseGeocode();

  const handleMapClick = async (lat: number, lng: number) => {
    let address = "";
    if (candidateMarkers) {
      const tolerance = 0.0005;
      const candidate = candidateMarkers.find(
        (c) => Math.abs(c.lat - lat) < tolerance && Math.abs(c.lng - lng) < tolerance
      );
      if (candidate?.formattedAddress) {
        address = candidate.formattedAddress;
      }
    }
    
    if (!address) {
      address = await reverseGeocode(lat, lng);
    }

    onLocationSelect(lat, lng, address);
  };

  return (
    <div style={{ height: 260, borderRadius: 8, overflow: "hidden", border: "1px solid #ccc" }}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        mapId="report-picker"
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        disableDefaultUI
        onClick={(e) => {
          const lat = e.detail.latLng?.lat;
          const lng = e.detail.latLng?.lng;
          if (lat != null && lng != null) handleMapClick(lat, lng);
        }}
      >
        {markerPos && (
          <AdvancedMarker position={markerPos}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#e53e3e",
                border: "2.5px solid #fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
            />
          </AdvancedMarker>
        )}
        {candidateMarkers && candidateMarkers.map((cand, idx) => (
          <AdvancedMarker key={idx} position={{ lat: cand.lat, lng: cand.lng }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#1565C0",
                border: "2.5px solid #fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
            />
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
