"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import { useState } from "react";

export default function JournalPage() {
  const { data: session } = useSession();
  const { data, loading, mutate } = useCharacterData();
  const [newSession, setNewSession] = useState("");
  const [newNpc, setNewNpc] = useState({ name: "", desc: "" });
  const [newPlace, setNewPlace] = useState({ name: "", desc: "" });
  const [editingNpc, setEditingNpc] = useState<string | null>(null);
  const [editingPlace, setEditingPlace] = useState<string | null>(null);
  const [renamingSession, setRenamingSession] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const characterId = (session?.user as { characterId?: string })?.characterId ?? "madea";

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-parchment/50">Loading...</div>;

  const sessions = data.journal.sessions;
  const currentSession = data.journal.currentSession;

  const createSession = () => {
    const name = newSession.trim();
    if (!name || sessions[name] !== undefined) return;
    mutate({ journal: { ...data.journal, sessions: { ...sessions, [name]: "" }, currentSession: name } });
    setNewSession("");
  };

  const selectSession = (name: string) => {
    mutate({ journal: { ...data.journal, currentSession: name } });
  };

  const startRenaming = (name: string) => {
    setRenamingSession(name);
    setRenameValue(name);
  };

  const confirmRename = () => {
    const newName = renameValue.trim();
    if (!renamingSession || !newName || (newName !== renamingSession && sessions[newName] !== undefined)) {
      setRenamingSession(null);
      return;
    }
    if (newName === renamingSession) {
      setRenamingSession(null);
      return;
    }
    const updatedSessions: Record<string, string> = {};
    for (const [key, val] of Object.entries(sessions)) {
      updatedSessions[key === renamingSession ? newName : key] = val;
    }
    mutate({
      journal: {
        ...data.journal,
        sessions: updatedSessions,
        currentSession: currentSession === renamingSession ? newName : currentSession,
      },
    });
    setRenamingSession(null);
  };

  const updateSessionText = (text: string) => {
    mutate({ journal: { ...data.journal, sessions: { ...sessions, [currentSession]: text } } });
  };

  const addNpc = () => {
    if (!newNpc.name.trim()) return;
    mutate({ characters: { ...data.characters, [newNpc.name.trim()]: newNpc.desc } });
    setNewNpc({ name: "", desc: "" });
  };

  const deleteNpc = (name: string) => {
    const updated = { ...data.characters };
    delete updated[name];
    mutate({ characters: updated });
  };

  const updateNpc = (name: string, desc: string) => {
    mutate({ characters: { ...data.characters, [name]: desc } });
  };

  const addPlace = () => {
    if (!newPlace.name.trim()) return;
    mutate({ places: { ...data.places, [newPlace.name.trim()]: newPlace.desc } });
    setNewPlace({ name: "", desc: "" });
  };

  const deletePlace = (name: string) => {
    const updated = { ...data.places };
    delete updated[name];
    mutate({ places: updated });
  };

  const updatePlace = (name: string, desc: string) => {
    mutate({ places: { ...data.places, [name]: desc } });
  };

  return (
    <div className="relative min-h-screen">
      <ScreenBackground screen="journal" characterId={characterId} />
      <AmbientEffects screen="journal" />
      <div className="relative z-20 mx-auto max-w-6xl space-y-4 p-4">
        <NavButtons hasFamiliars={(data?.classResources.familiars?.length ?? 0) > 0} />

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Session List */}
          <UIPanel variant="box1" className="lg:col-span-1">
            <h2 className="mb-3 font-serif text-sm text-gold/70">Sessions</h2>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newSession}
                onChange={(e) => setNewSession(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSession()}
                placeholder="New session..."
                className="flex-1 rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment"
                aria-label="New session name"
              />
              <button onClick={createSession} className="min-h-[44px] rounded bg-gold-dark px-3 py-2 text-xs text-parchment hover:bg-gold">+</button>
            </div>
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {Object.keys(sessions).map((name) => (
                <li key={name} className="flex items-center gap-1">
                  {renamingSession === name ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") setRenamingSession(null);
                      }}
                      onBlur={confirmRename}
                      className="min-h-[44px] flex-1 rounded border border-gold-dark bg-dark-bg px-3 py-2 text-sm text-parchment"
                      autoFocus
                      aria-label="Rename session"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => selectSession(name)}
                        className={`min-h-[44px] flex-1 rounded px-3 py-2 text-left text-sm transition ${name === currentSession ? "bg-gold-dark text-parchment" : "text-parchment/70 hover:bg-dark-border"}`}
                      >
                        {name}
                      </button>
                      <button
                        onClick={() => startRenaming(name)}
                        className="px-1 text-xs text-parchment/40 hover:text-gold"
                        aria-label={`Rename ${name}`}
                        title="Rename session"
                      >
                        ✎
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </UIPanel>

          {/* Session Editor */}
          <UIPanel variant="box" className="lg:col-span-2">
            <h2 className="mb-3 font-serif text-sm text-gold/70">{currentSession || "Select a session"}</h2>
            {currentSession && (
              <textarea
                value={sessions[currentSession] ?? ""}
                onChange={(e) => updateSessionText(e.target.value)}
                className="h-64 w-full resize-y rounded border border-dark-border bg-dark-bg p-3 text-sm text-parchment"
                placeholder="Write your session notes..."
                aria-label="Session notes"
              />
            )}
          </UIPanel>
        </div>

        {/* NPCs */}
        <UIPanel variant="box2">
          <h2 className="mb-3 font-serif text-sm text-gold/70">NPCs</h2>
          <div className="mb-3 space-y-1">
            {Object.entries(data.characters).map(([name, desc]) => (
              <div key={name} className="flex items-start gap-2 rounded px-2 py-1 hover:bg-dark-border">
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gold">{name}</span>
                  {editingNpc === name ? (
                    <textarea
                      value={desc}
                      onChange={(e) => updateNpc(name, e.target.value)}
                      onBlur={() => setEditingNpc(null)}
                      className="mt-1 w-full rounded border border-dark-border bg-dark-bg p-1 text-xs text-parchment"
                      autoFocus
                      aria-label={`Edit ${name} description`}
                    />
                  ) : (
                    <p className="cursor-pointer text-xs text-parchment/60" onClick={() => setEditingNpc(name)}>{desc || "Click to add description..."}</p>
                  )}
                </div>
                <button onClick={() => deleteNpc(name)} className="min-h-[44px] px-2 text-xs text-crimson hover:text-crimson/80" aria-label={`Delete ${name}`}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newNpc.name} onChange={(e) => setNewNpc({ ...newNpc, name: e.target.value })} placeholder="NPC name" className="flex-1 rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" aria-label="New NPC name" />
            <input type="text" value={newNpc.desc} onChange={(e) => setNewNpc({ ...newNpc, desc: e.target.value })} placeholder="Description" className="flex-1 rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" aria-label="New NPC description" />
            <button onClick={addNpc} className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment hover:bg-gold">Add</button>
          </div>
        </UIPanel>

        {/* Places */}
        <UIPanel variant="box2">
          <h2 className="mb-3 font-serif text-sm text-gold/70">Places</h2>
          <div className="mb-3 space-y-1">
            {Object.entries(data.places).map(([name, desc]) => (
              <div key={name} className="flex items-start gap-2 rounded px-2 py-1 hover:bg-dark-border">
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gold">{name}</span>
                  {editingPlace === name ? (
                    <textarea
                      value={desc}
                      onChange={(e) => updatePlace(name, e.target.value)}
                      onBlur={() => setEditingPlace(null)}
                      className="mt-1 w-full rounded border border-dark-border bg-dark-bg p-1 text-xs text-parchment"
                      autoFocus
                      aria-label={`Edit ${name} description`}
                    />
                  ) : (
                    <p className="cursor-pointer text-xs text-parchment/60" onClick={() => setEditingPlace(name)}>{desc || "Click to add description..."}</p>
                  )}
                </div>
                <button onClick={() => deletePlace(name)} className="min-h-[44px] px-2 text-xs text-crimson hover:text-crimson/80" aria-label={`Delete ${name}`}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newPlace.name} onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })} placeholder="Place name" className="flex-1 rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" aria-label="New place name" />
            <input type="text" value={newPlace.desc} onChange={(e) => setNewPlace({ ...newPlace, desc: e.target.value })} placeholder="Description" className="flex-1 rounded border border-dark-border bg-dark-bg px-2 py-1 text-sm text-parchment" aria-label="New place description" />
            <button onClick={addPlace} className="min-h-[44px] rounded bg-gold-dark px-4 py-2 text-sm text-parchment hover:bg-gold">Add</button>
          </div>
        </UIPanel>
      </div>
    </div>
  );
}
