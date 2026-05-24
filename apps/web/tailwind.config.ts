import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#05070a",
        graphite: "#0c1117",
        mercury: "#e9f2ff",
        signal: "#58f6d2",
        ember: "#ff9d63",
        cobalt: "#6da8ff",
        danger: "#ff4f6d"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 48px rgba(88, 246, 210, 0.16)",
        panel: "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 80px rgba(0,0,0,0.34)"
      },
      backgroundImage: {
        "radial-grid": "radial-gradient(circle at 20% 10%, rgba(88,246,210,0.16), transparent 24rem), radial-gradient(circle at 80% 0%, rgba(109,168,255,0.14), transparent 24rem), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)"
      },
      backgroundSize: {
        "radial-grid": "auto, auto, 44px 44px, 44px 44px"
      }
    }
  },
  plugins: []
};

export default config;
