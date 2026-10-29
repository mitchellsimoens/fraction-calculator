module.exports = {
  content: ["src/**/*.{ts,html}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: "#0A0C12",
        panel: "#12161F",
        raised: "#1A2030",
        line: "#242B3A",
        fg: "#E8ECF5",
        mute: "#7C879C",
        accent: "#A5B4FF",
      },
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 28px -4px rgba(165, 180, 255, 0.55)",
        bar: "0 10px 16px -12px rgba(165, 180, 255, 0.9)",
      },
      gridTemplateAreas: {
        layout: [
          "results results",
          "whole numerator",
          "whole denominator",
          "operators operators",
        ],
      },
      gridTemplateColumns: {
        layout: "1fr 1fr",
      },
      gridTemplateRows: {
        layout: "auto 1fr 1fr auto",
      },
    },
  },
  plugins: [require("@savvywombat/tailwindcss-grid-areas")],
};
