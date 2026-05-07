import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Multi Model — Compare AI responses side by side",
  description: "Ask every AI at once. Compare responses from GPT, Claude, Gemini, DeepSeek and more. Blind mode, split view, AI analysis.",
  openGraph: {
    title: "Multi Model — Compare AI responses side by side",
    description: "Ask every AI at once. Compare responses from GPT, Claude, Gemini, DeepSeek and more.",
    type: "website",
    url: "https://multimodel.craigo.live",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multi Model — Compare AI responses side by side",
    description: "Ask every AI at once. Compare AI responses with blind mode and split view.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0909",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js")`,
          }}
        />
        {children}
        <a
          href="https://craigo.live"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-3 right-4 text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors tracking-wide select-none z-50 hidden sm:block"
        >
          craigo.live
        </a>
      </body>
    </html>
  );
}
