"use client";

import { useState, useEffect, useCallback } from "react";
import type { MapMarker } from "@/types";

export function useMapMarkers(map?: string, floor?: number) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (map) params.set("map", map);
      if (floor !== undefined) params.set("floor", String(floor));
      const r = await fetch(`/api/markers/get?${params}`);
      if (!r.ok) throw new Error("Failed to load markers");
      setMarkers(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [map, floor]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  /**
   * Create, update, or delete a marker. Optimistically updates local state
   * then persists via the API. Rolls back on failure.
   */
  const mutate = useCallback(
    async (action: "create" | "update" | "delete", marker: MapMarker) => {
      // Optimistic local update
      const prev = markers;
      switch (action) {
        case "create":
          setMarkers((m) => [...m, marker]);
          break;
        case "update":
          setMarkers((m) => m.map((existing) => (existing.id === marker.id ? marker : existing)));
          break;
        case "delete":
          setMarkers((m) => m.filter((existing) => existing.id !== marker.id));
          break;
      }

      try {
        const r = await fetch("/api/markers/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, marker }),
        });
        if (!r.ok) throw new Error("Failed to save marker");
        setMarkers(await r.json());
      } catch (e) {
        // Rollback on failure
        setMarkers(prev);
        setError((e as Error).message);
      }
    },
    [markers]
  );

  return { markers, loading, error, mutate, refetch: fetchMarkers };
}
