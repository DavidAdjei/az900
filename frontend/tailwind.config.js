/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // All theme colors are CSS variables (see index.css) so they can be swapped
        // between light/dark by toggling `data-theme` on <html>.
        canvas: "var(--color-canvas)", // page background (was "base" — renamed to avoid
        // colliding with Tailwind's built-in `text-base` font-size utility)
        surface: "var(--color-surface)",
        raised: "var(--color-raised)",
        line: "var(--color-line)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        signal: "var(--color-signal)",
        wire: "var(--color-wire)",
        node: "var(--color-node)",
        // Fixed (non-themed) near-black used as text on accent-colored buttons/badges,
        // since signal/wire/node stay mid-brightness in both themes.
        invert: "#10161D",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      keyframes: {
        "flip-to-back": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        "flip-to-front": {
          "0%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "card-in": "card-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
