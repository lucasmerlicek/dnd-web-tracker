"use client";

import { useMapMarkers } from "@/hooks/useMapMarkers";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import { useState, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import type { MapMarker } from "@/types";

const CATEGORIES = ["artifact", "treasure", "enemy", "person", "note"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  artifact: "Artifacts",
  treasure: "Treasure",
  enemy: "Enemy Encounters",
  person: "Notable People",
  note: "Notes & Rumors",
};

const CATEGORY_COLORS: Record<Category, string> = {
  artifact: "bg-purple-500",
  treasure: "bg-yellow-500",
  enemy: "bg-red-500",
  person: "bg-blue-500",
  note: "bg-green-500",
};

const CATEGORY_ICONS: Record<Category, string> = {
  artifact: "/images/icons/icon_artifact.png",
  treasure: "/images/icons/icon_treasure.png",
  enemy: "/images/icons/icon_enemy.png",
  person: "/images/icons/icon_friend.png",
  note: "/images/icons/icon_rumor.png",
};

const FLOOR_LABELS = ["Ground", "1st", "2nd", "3rd", "4th"];

export default function MapPage() {
  const [activeMap, setActiveMap] = useState<"valerion" | "aetherion">("valerion");
  const [floor, setFloor] = useState(0);
  const [visibleCategories, setVisibleCategories] = useState<Set<Category>>(new Set(CATEGORIES));
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [creating, setCreating] = useState<{ x: number; y: number } | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "note" as Category });
  const [editing, setEditing] = useState<MapMarker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const { markers, mutate } = useMapMarkers(activeMap, activeMap === "aetherion" ? floor : undefined);

  const filteredMarkers = markers.filter((m) => visibleCategories.has(m.category));

  const handleMapClick = (e: React.MouseEvent) => {
    if (selectedMarker || creating) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCreating({ x, y });
    setForm({ title: "", description: "", category: "note" });
  };

  const createMarker = () => {
    if (!creating || !form.title.trim()) return;
    const marker: MapMarker = {
      id: uuidv4(),
      category: form.category,
      title: form.title.trim(),
      description: form.description,
      position: creating,
      map: activeMap,
      floor: activeMap === "aetherion" ? floor : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mutate("create", marker);
    setCreating(null);
  };

  const deleteMarker = (marker: MapMarker) => {
    mutate("delete", marker);
    setSelectedMarker(null);
  };

  const startEditing = (marker: MapMarker) => {
    setEditing(marker);
    setForm({ title: marker.title, description: marker.description, category: marker.category });
    setSelectedMarker(null);
  };

  const saveEdit = () => {
    if (!editing || !form.title.trim()) return;
    const updated: MapMarker = {
      ...editing,
      title: form.title.trim(),
      description: form.description,
      category: form.category,
      updatedAt: new Date().toISOString(),
    };
    mutate("update", updated);
    setEditing(null);
  };

  const toggleCategory = (cat: Category) => {
    const next = new Set(visibleCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setVisibleCategories(next);
  };

  const mapSrc = activeMap === "valerion"
    ? "/images/maps/Valerion_lowres.jpg"
    : "/images/maps/Atherion_map.png";

  return (
    <div className="relative min-h-screen bg-dark-bg">
      <AmbientEffects screen="map" />
      <div className="relative z-20 mx-auto max-w-7xl space-y-4 p-4">
        <NavButtons />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <UIPanel variant="box2" className="flex items-center gap-2 !p-2">
            <button onClick={() => { setActiveMap("valerion"); setSelectedMarker(null); setCreating(null); }} className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${activeMap === "valerion" ? "bg-gold-dark text-parchment" : "text-parchment/70 hover:bg-dark-border"}`}>Valerion</button>
            <button onClick={() => { setActiveMap("aetherion"); setSelectedMarker(null); setCreating(null); }} className={`min-h-[44px] rounded px-4 py-2 text-sm transition ${activeMap === "aetherion" ? "bg-gold-dark text-parchment" : "text-parchment/70 hover:bg-dark-border"}`}>Aetherion</button>
          </UIPanel>

          {activeMap === "aetherion" && (
            <UIPanel variant="box2" className="flex items-center gap-1 !p-2">
              {FLOOR_LABELS.map((label, i) => (
                <button key={i} onClick={() => { setFloor(i); setSelectedMarker(null); setCreating(null); }} className={`min-h-[44px] rounded px-3 py-2 text-xs transition ${floor === i ? "bg-gold-dark text-parchment" : "text-parchment/70 hover:bg-dark-border"}`}>{label}</button>
              ))}
            </UIPanel>
          )}

          <UIPanel variant="box2" className="flex items-center gap-2 !p-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => toggleCategory(cat)} className={`flex min-h-[44px] items-center gap-1 rounded px-3 py-2 text-xs transition ${visibleCategories.has(cat) ? "text-parchment" : "text-parchment/30"}`} aria-label={`Toggle ${CATEGORY_LABELS[cat]}`}>
                <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[cat]} ${!visibleCategories.has(cat) && "opacity-30"}`} />
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </UIPanel>
        </div>

        {/* Map */}
        <div className="overflow-hidden rounded-lg border border-dark-border">
          <TransformWrapper minScale={0.5} maxScale={4} initialScale={1}>
            <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
              <div ref={mapRef} className="relative cursor-crosshair" onClick={handleMapClick}>
                <Image src={mapSrc} alt={`${activeMap} map`} width={1200} height={800} className="w-full" priority />
                {/* Markers */}
                {filteredMarkers.map((m) => (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedMarker(m); setCreating(null); setEditing(null); }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-125"
                    style={{ left: `${m.position.x}%`, top: `${m.position.y}%` }}
                    aria-label={m.title}
                  >
                    <Image src={CATEGORY_ICONS[m.category]} alt={CATEGORY_LABELS[m.category]} width={32} height={32} className="h-8 w-8 drop-shadow-lg lg:h-6 lg:w-6" />
                  </button>
                ))}
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        {/* Marker Detail */}
        {selectedMarker && (
          <UIPanel variant="fancy">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-gold">{selectedMarker.title}</h3>
                <span className="text-xs text-parchment/50">{CATEGORY_LABELS[selectedMarker.category]}</span>
                <p className="mt-2 text-sm text-parchment/70">{selectedMarker.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditing(selectedMarker)} className="min-h-[44px] rounded bg-gold-dark/80 px-3 py-2 text-xs text-parchment hover:bg-gold-dark">Edit</button>
                <button onClick={() => deleteMarker(selectedMarker)} className="min-h-[44px] rounded bg-crimson/80 px-3 py-2 text-xs text-parchment hover:bg-crimson">Delete</button>
                <button onClick={() => setSelectedMarker(null)} className="min-h-[44px] rounded bg-dark-border px-3 py-2 text-xs text-parchment hover:bg-dark-surface">Close</button>
              </div>
            </div>
          </UIPanel>
        )}

        {/* Create Marker Form */}
        {creating && (
          <UIPanel variant="fancy">
            <h3 className="mb-3 font-serif text-sm text-gold">New Marker</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setForm({ ...form, category: cat })} className={`flex min-h-[44px] items-center gap-1 rounded px-3 py-2 text-xs transition ${form.category === cat ? "bg-gold-dark text-parchment" : "bg-dark-border text-parchment/70"}`}>
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[cat]}`} />
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" aria-label="Marker title" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" rows={3} aria-label="Marker description" />
              <div className="flex gap-2">
                <button onClick={createMarker} className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment hover:bg-gold">Create</button>
                <button onClick={() => setCreating(null)} className="min-h-[44px] rounded bg-dark-border px-4 py-2 text-sm text-parchment hover:bg-dark-surface">Cancel</button>
              </div>
            </div>
          </UIPanel>
        )}

        {/* Edit Marker Form */}
        {editing && (
          <UIPanel variant="fancy">
            <h3 className="mb-3 font-serif text-sm text-gold">Edit Marker</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setForm({ ...form, category: cat })} className={`flex min-h-[44px] items-center gap-1 rounded px-3 py-2 text-xs transition ${form.category === cat ? "bg-gold-dark text-parchment" : "bg-dark-border text-parchment/70"}`}>
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[cat]}`} />
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" aria-label="Marker title" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" rows={3} aria-label="Marker description" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment hover:bg-gold">Save</button>
                <button onClick={() => setEditing(null)} className="min-h-[44px] rounded bg-dark-border px-4 py-2 text-sm text-parchment hover:bg-dark-surface">Cancel</button>
              </div>
            </div>
          </UIPanel>
        )}
      </div>
    </div>
  );
}
