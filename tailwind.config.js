module.exports = {
  content: ["src/**/*.{ts,html}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
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
