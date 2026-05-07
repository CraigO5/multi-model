import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Multi Model — Compare AI responses",
    short_name: "Multi Model",
    description:
      "Ask every AI at once. Compare responses from GPT, Claude, Gemini, DeepSeek and more.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#0A0909",
    theme_color: "#0A0909",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
