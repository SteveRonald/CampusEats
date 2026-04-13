import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F97316",
        secondary: "#16A34A",
        accent: "#FACC15",
        danger: "#EF4444",
        canvas: "#F9FAFB",
        ink: "#111827",
        mutedInk: "#6B7280",
        card: "#FFFFFF"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      boxShadow: {
        float: "0 20px 60px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
