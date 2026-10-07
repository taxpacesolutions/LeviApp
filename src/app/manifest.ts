import type { MetadataRoute } from "next";

// Lets the tablet "Add to Home Screen" open the app full screen with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Levi Reward Bucks",
    short_name: "Reward Bucks",
    description: "Earn, save, and spend Reward Bucks.",
    start_url: "/kid",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6fb",
    theme_color: "#0b1b3f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
