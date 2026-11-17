import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "من أجل مصر، كلية العلوم، جامعة القاهرة",
  description:
    "طلاب من أجل مصر بكلية العلوم، جامعة القاهرة. شارك في الفعاليات، تطوع، واصنع أثرًا.",
  appleWebApp: {
    capable: true,
    title: "من أجل مصر",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ce1126",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/assets/nav-arabic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="/assets/fonts.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('mam-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
