import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MapMarker } from "@/types";

/**
 * Unit tests for map markers API routes
 * Validates: Requirements 14.4, 14.8
 */

const mockGetAuthenticatedCharacterId = vi.fn<() => Promise<string | null>>();
const mockGetMapMarkers = vi.fn<() => Promise<MapMarker[]>>();
const mockSetMapMarkers = vi.fn<() => Promise<void>>();

vi.mock("@/lib/session", () => ({
  getAuthenticatedCharacterId: () => mockGetAuthenticatedCharacterId(),
}));

vi.mock("@/lib/kv", () => ({
  getMapMarkers: (...args: unknown[]) => mockGetMapMarkers(...(args as [])),
  setMapMarkers: (...args: unknown[]) => mockSetMapMarkers(...(args as [])),
}));

const sampleMarker: MapMarker = {
  id: "m1",
  category: "treasure",
  title: "Hidden Chest",
  description: "Gold coins inside",
  position: { x: 100, y: 200 },
  map: "valerion",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const aetherionMarker: MapMarker = {
  id: "m2",
  category: "enemy",
  title: "Guard Post",
  description: "Two guards patrol here",
  position: { x: 50, y: 75 },
  map: "aetherion",
  floor: 2,
  createdAt: "2025-01-02T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

describe("GET /api/markers/get", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSetMapMarkers.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue(null);
    const { GET } = await import("../get/route");
    const req = new Request("http://localhost/api/markers/get");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("returns all markers for the authenticated user", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([sampleMarker, aetherionMarker]);
    const { GET } = await import("../get/route");
    const req = new Request("http://localhost/api/markers/get");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it("filters markers by map query param", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([sampleMarker, aetherionMarker]);
    const { GET } = await import("../get/route");
    const req = new Request("http://localhost/api/markers/get?map=valerion");
    const res = await GET(req as any);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("m1");
  });

  it("filters markers by map and floor query params", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([sampleMarker, aetherionMarker]);
    const { GET } = await import("../get/route");
    const req = new Request("http://localhost/api/markers/get?map=aetherion&floor=2");
    const res = await GET(req as any);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("m2");
  });

  it("returns empty array when no markers match filter", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([sampleMarker]);
    const { GET } = await import("../get/route");
    const req = new Request("http://localhost/api/markers/get?map=aetherion");
    const res = await GET(req as any);
    const data = await res.json();
    expect(data).toHaveLength(0);
  });
});

describe("POST /api/markers/update", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSetMapMarkers.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue(null);
    const { POST } = await import("../update/route");
    const req = new Request("http://localhost/api/markers/update", {
      method: "POST",
      body: JSON.stringify({ action: "create", marker: sampleMarker }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("creates a new marker and returns updated array", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([]);
    const { POST } = await import("../update/route");
    const req = new Request("http://localhost/api/markers/update", {
      method: "POST",
      body: JSON.stringify({ action: "create", marker: sampleMarker }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("m1");
    expect(mockSetMapMarkers).toHaveBeenCalledWith("madea", [sampleMarker]);
  });

  it("updates an existing marker by id", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([sampleMarker]);
    const updatedMarker = { ...sampleMarker, title: "Updated Chest" };
    const { POST } = await import("../update/route");
    const req = new Request("http://localhost/api/markers/update", {
      method: "POST",
      body: JSON.stringify({ action: "update", marker: updatedMarker }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Updated Chest");
  });

  it("deletes a marker by id", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    mockGetMapMarkers.mockResolvedValue([sampleMarker, aetherionMarker]);
    const { POST } = await import("../update/route");
    const req = new Request("http://localhost/api/markers/update", {
      method: "POST",
      body: JSON.stringify({ action: "delete", marker: sampleMarker }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("m2");
  });

  it("returns 400 for missing action", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    const { POST } = await import("../update/route");
    const req = new Request("http://localhost/api/markers/update", {
      method: "POST",
      body: JSON.stringify({ marker: sampleMarker }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing marker", async () => {
    mockGetAuthenticatedCharacterId.mockResolvedValue("madea");
    const { POST } = await import("../update/route");
    const req = new Request("http://localhost/api/markers/update", {
      method: "POST",
      body: JSON.stringify({ action: "create" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
