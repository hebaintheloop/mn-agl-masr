import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "من أجل مصر، كلية العلوم، جامعة القاهرة",
    short_name: "من أجل مصر",
    description:
      "فعاليات ومشاركات طلاب من أجل مصر في كلية العلوم، جامعة القاهرة",
    lang: "ar-EG",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ce1126",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "الفعاليات", url: "/?view=events" },
      { name: "المتصدرون", url: "/?view=leaderboard" },
    ],
  };
}
