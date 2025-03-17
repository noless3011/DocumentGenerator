/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      scrollbar: {
        "thin-transparent": {
          // You can name this utility class as you like
          "&::-webkit-scrollbar-button": {
            display: "none", // Hide scrollbar buttons (arrows)
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent", // Transparent background for the track
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(209, 213, 219, 1)", // Gray-300 in Tailwind rgba format
            borderRadius: "9999px", // Rounded thumb
          },
          "&::-webkit-scrollbar": {
            width: "6px", // Thin scrollbar width (adjust as needed)
            height: "6px", // Thin scrollbar height for horizontal scrollbars
          },

          // For Firefox (less customizable, but you can hide buttons)
          "&::-moz-scrollbar-button": {
            display: "none", // Hide Firefox scrollbar buttons (arrows)
          },
          "&::-moz-scrollbar-track": {
            backgroundColor: "transparent", // Transparent background for the track
          },
          "&::-moz-scrollbar-thumb": {
            backgroundColor: "rgba(209, 213, 219, 1)", // Gray-300 in Tailwind rgba format
            borderRadius: "9999px", // Rounded thumb
          },
          "&::-moz-scrollbar": {
            width: "6px", // Thin scrollbar width (adjust as needed)
            height: "6px", // Thin scrollbar height for horizontal scrollbars
          },

          // For IE and Edge (older versions, may not be necessary for modern Edge)
          "&::-ms-scrollbar-arrow-start, &::-ms-scrollbar-arrow-end": {
            display: "none", // Hide IE/Edge scrollbar buttons
          },
          "&::-ms-scrollbar-track": {
            backgroundColor: "transparent", // Transparent background
          },
          "&::-ms-scrollbar-thumb": {
            backgroundColor: "#D1D5DB", // Gray-300 in hex
            borderRadius: "9999px", // Rounded thumb
          },
          "&::-ms-scrollbar": {
            width: "6px", // Thin scrollbar width
            height: "6px", // Thin scrollbar height
          },
        },
      },
    },
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }), // Ensure scrollbar plugin is included
  ],
};
