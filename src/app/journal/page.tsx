"use client";

import { useSession } from "next-auth/react";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useCursorNavigation } from "@/hooks/useCursorNavigation";
import ScreenBackground from "@/components/ui/ScreenBackground";
import NavButtons from "@/components/ui/NavButtons";
import UIPanel from "@/components/ui/UIPanel";
import AmbientEffects from "@/components/ui/AmbientEffects";
import CursorIndicator from "@/components/ui/CursorIndicator";
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

  const sessionNames = data ? Object.keys(data.journal.sessions) : [];
  const npcEntries = data ? Object.entries(data.characters) : [];
  const placeEntries = data ? Object.entries(data.places) : [];

  const sessionCursor = useCursorNavigation({
    itemCount: sessionNames.length,
    onActivate: (index) => {
      if (sessionNames[index]) selectSession(sessionNames[index]);
    },
  });

  const npcCursor = useCursorNavigation({
    itemCount: npcEntries.length,
    onActivate: (index) => {
      if (npcEntries[index]) setEditingNpc(npcEntries[index][0]);
    },
  });

  const placeCursor = useCursorNavigation({
    itemCount: placeEntries.length,
    onActivate: (index) => {
      if (placeEntries[index]) setEditingPlace(placeEntries[index][0]);
    },
  });

  if (loading || !data) return <div className="flex min-h-screen items-center justify-center text-ff12-text-dim">Loading...</div>;

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
            <h2 className="mb-3 text-sm text-gold/70">Sessions</h2>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newSession}
                onChange={(e) => setNewSession(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSession()}
                placeholder="New session..."
                className="flex-1 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-sm text-ff12-text"
                aria-label="New session name"
              />
              <button onClick={createSession} className="min-h-[44px] rounded bg-ff12-panel-light px-3 py-2 text-xs text-ff12-text hover:bg-ff12-panel-light/80">+</button>
            </div>
            <ul {...sessionCursor.containerProps} className="max-h-60 space-y-1 overflow-y-auto">
              {sessionNames.map((name, index) => (
                <li key={name} {...sessionCursor.getItemProps(index)} className={`flex items-center gap-1 ${sessionCursor.isActive(index) ? "bg-white/10" : ""}`}>
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
                      className="min-h-[44px] flex-1 rounded border border-ff12-border-dim bg-dark-bg px-3 py-2 text-sm text-ff12-text"
                      autoFocus
                      aria-label="Rename session"
                    />
                  ) : (
                    <>
                      <CursorIndicator visible={sessionCursor.isActive(index)} />
                      <button
                        onClick={() => selectSession(name)}
                        className={`min-h-[44px] flex-1 rounded px-3 py-2 text-left text-sm transition ${name === currentSession ? "bg-ff12-panel-light text-ff12-text" : "text-ff12-text-dim hover:bg-ff12-panel-light"}`}
                      >
                        {name}
                      </button>
                      <button
                        onClick={() => startRenaming(name)}
                        className="px-1 text-xs text-ff12-text-dim hover:text-gold"
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
            <h2 className="mb-3 text-sm text-gold/70">{currentSession || "Select a session"}</h2>
            {currentSession && (
              <textarea
                value={sessions[currentSession] ?? ""}
                onChange={(e) => updateSessionText(e.target.value)}
                className="h-64 w-full resize-y rounded border border-ff12-border-dim bg-dark-bg p-3 text-sm text-ff12-text"
                placeholder="Write your session notes..."
                aria-label="Session notes"
              />
            )}
          </UIPanel>
        </div>

        {/* NPCs */}
        <UIPanel variant="box2">
          <h2 className="mb-3 text-sm text-gold/70">NPCs</h2>
          <div {...npcCursor.containerProps} className="mb-3 space-y-1">
            {npcEntries.map(([name, desc], index) => (
              <div key={name} {...npcCursor.getItemProps(index)} className={`flex items-start gap-2 rounded px-2 py-1 hover:bg-ff12-panel-light ${npcCursor.isActive(index) ? "bg-white/10" : ""}`}>
                <CursorIndicator visible={npcCursor.isActive(index)} className="mt-1" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gold">{name}</span>
                  {editingNpc === name ? (
                    <textarea
                      value={desc}
                      onChange={(e) => updateNpc(name, e.target.value)}
                      onBlur={() => setEditingNpc(null)}
                      className="mt-1 w-full rounded border border-ff12-border-dim bg-dark-bg p-1 text-xs text-ff12-text"
                      autoFocus
                      aria-label={`Edit ${name} description`}
                    />
                  ) : (
                    <p className="cursor-pointer text-xs text-ff12-text-dim" onClick={() => setEditingNpc(name)}>{desc || "Click to add description..."}</p>
                  )}
                </div>
                <button onClick={() => deleteNpc(name)} className="min-h-[44px] px-2 text-xs text-ff12-danger hover:text-ff12-danger/80" aria-label={`Delete ${name}`}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newNpc.name} onChange={(e) => setNewNpc({ ...newNpc, name: e.target.value })} placeholder="NPC name" className="flex-1 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-sm text-ff12-text" aria-label="New NPC name" />
            <input type="text" value={newNpc.desc} onChange={(e) => setNewNpc({ ...newNpc, desc: e.target.value })} placeholder="Description" className="flex-1 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-sm text-ff12-text" aria-label="New NPC description" />
            <button onClick={addNpc} className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text hover:bg-ff12-panel-light/80">Add</button>
          </div>
        </UIPanel>

        {/* Places */}
        <UIPanel variant="box2">
          <h2 className="mb-3 text-sm text-gold/70">Places</h2>
          <div {...placeCursor.containerProps} className="mb-3 space-y-1">
            {placeEntries.map(([name, desc], index) => (
              <div key={name} {...placeCursor.getItemProps(index)} className={`flex items-start gap-2 rounded px-2 py-1 hover:bg-ff12-panel-light ${placeCursor.isActive(index) ? "bg-white/10" : ""}`}>
                <CursorIndicator visible={placeCursor.isActive(index)} className="mt-1" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gold">{name}</span>
                  {editingPlace === name ? (
                    <textarea
                      value={desc}
                      onChange={(e) => updatePlace(name, e.target.value)}
                      onBlur={() => setEditingPlace(null)}
                      className="mt-1 w-full rounded border border-ff12-border-dim bg-dark-bg p-1 text-xs text-ff12-text"
                      autoFocus
                      aria-label={`Edit ${name} description`}
                    />
                  ) : (
                    <p className="cursor-pointer text-xs text-ff12-text-dim" onClick={() => setEditingPlace(name)}>{desc || "Click to add description..."}</p>
                  )}
                </div>
                <button onClick={() => deletePlace(name)} className="min-h-[44px] px-2 text-xs text-ff12-danger hover:text-ff12-danger/80" aria-label={`Delete ${name}`}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newPlace.name} onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })} placeholder="Place name" className="flex-1 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-sm text-ff12-text" aria-label="New place name" />
            <input type="text" value={newPlace.desc} onChange={(e) => setNewPlace({ ...newPlace, desc: e.target.value })} placeholder="Description" className="flex-1 rounded border border-ff12-border-dim bg-dark-bg px-2 py-1 text-sm text-ff12-text" aria-label="New place description" />
            <button onClick={addPlace} className="min-h-[44px] rounded bg-ff12-panel-light px-4 py-2 text-sm text-ff12-text hover:bg-ff12-panel-light/80">Add</button>
          </div>
        </UIPanel>
      </div>
    </div>
  );
}
