"use client";

import { motion } from "framer-motion";

interface Props {
  screen: string;
}

const SUBMENU_SCREENS = [
  "attack",
  "spells",
  "saves",
  "actions",
  "bag",
  "journal",
];

export default function AmbientEffects({ screen }: Props) {
  if (screen === "dashboard") {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
        aria-hidden="true"
      >
        {/* Firepit glow — warm orange pulse from the bottom center */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl"
          animate={{ opacity: [0.15, 0.25, 0.15], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Moonlight — cool blue glow from the top-right */}
        <motion.div
          className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-200/5 blur-3xl"
          animate={{ opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  // Only render tavern effects for known submenu screens
  if (!SUBMENU_SCREENS.includes(screen)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Primary light ray — angled from the left */}
      <motion.div
        className="absolute -left-10 top-0 h-full w-32 rotate-12 bg-gradient-to-b from-amber-200/5 via-amber-100/[0.03] to-transparent"
        animate={{ opacity: [0.3, 0.5, 0.3], x: [-5, 5, -5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary light ray — narrower, from the right */}
      <motion.div
        className="absolute -right-6 top-0 h-full w-20 -rotate-6 bg-gradient-to-b from-amber-300/[0.04] via-amber-200/[0.02] to-transparent"
        animate={{ opacity: [0.2, 0.35, 0.2], x: [3, -3, 3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Dust particles drifting through the light */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-amber-200/20"
          style={{ left: `${15 + i * 12}%`, top: `${20 + i * 8}%` }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
