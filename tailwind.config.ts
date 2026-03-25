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
        // Dark fantasy backgrounds
        "dark-bg": "#0e0e0e",
        "dark-surface": "#1a1a1a",
        "dark-panel": "#2a2a2a",
        "dark-border": "#3a3a3a",
        "dark-hover": "#333333",

        // Gold / amber accents
        gold: "#c9a84c",
        "gold-light": "#e0c872",
        "gold-dark": "#8a6d2b",
        amber: "#b8860b",

        // Parchment text tones
        parchment: "#d4c5a9",
        "parchment-light": "#e8dcc8",
        "parchment-dark": "#a89878",

        // Accent colors
        crimson: "#8b1a1a",
        "crimson-light": "#b22222",
        "blood-red": "#6b0000",
        "arcane-blue": "#4a6fa5",
        "shadow-purple": "#4a2a6a",
      },
      fontFamily: {
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
      },
    },
  },
  plugins: [],
};
export default config;
