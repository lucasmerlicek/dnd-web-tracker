import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark fantasy backgrounds (preserved for backward compatibility)
        "dark-bg": "#0e0e0e",
        "dark-surface": "#1a1a1a",
        "dark-panel": "#2a2a2a",
        "dark-border": "#3a3a3a",
        "dark-hover": "#333333",

        // Gold / amber accents (preserved for backward compatibility)
        gold: "#c9a84c",
        "gold-light": "#e0c872",
        "gold-dark": "#8a6d2b",
        amber: "#b8860b",

        // Parchment text tones (preserved for backward compatibility)
        parchment: "#d4c5a9",
        "parchment-light": "#e8dcc8",
        "parchment-dark": "#a89878",

        // Accent colors (preserved for backward compatibility)
        crimson: "#8b1a1a",
        "crimson-light": "#b22222",
        "blood-red": "#6b0000",
        "arcane-blue": "#4a6fa5",
        "shadow-purple": "#4a2a6a",

        // FF12 panel backgrounds — dark charcoal/grey like FF12 menus
        "ff12-panel": "#1a1c22",
        "ff12-panel-dark": "#111318",
        "ff12-panel-light": "#2a2d36",

        // FF12 borders — subtle gold/yellow tint like FF12 menu borders
        "ff12-border": "#6b6040",
        "ff12-border-dim": "#3d3a30",
        "ff12-border-bright": "#a89860",

        // FF12 text
        "ff12-text": "#d8d4cc",
        "ff12-text-dim": "#8a8678",
        "ff12-text-bright": "#f0ece0",

        // FF12 accents — gold selection highlight
        "ff12-select": "#c9a84c",
        "ff12-hp-start": "#2d8a4e",
        "ff12-hp-end": "#4aba6a",
        "ff12-danger": "#a04040",
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        fantasy: ["Georgia", "Palatino Linotype", "serif"],
      },
      backgroundImage: {
        "dark-gradient": "linear-gradient(180deg, #0e0e0e 0%, #1a1a1a 100%)",
        "gold-gradient": "linear-gradient(180deg, #c9a84c 0%, #8a6d2b 100%)",
      },
      boxShadow: {
        "gold-glow": "0 0 10px rgba(201, 168, 76, 0.3)",
        "gold-glow-lg": "0 0 20px rgba(201, 168, 76, 0.4)",
        "inner-dark": "inset 0 2px 4px rgba(0, 0, 0, 0.5)",
        "ff12-glow": "inset 0 0 8px rgba(107, 96, 64, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
