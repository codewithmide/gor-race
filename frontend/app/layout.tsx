import type { Metadata } from "next";
import "./globals.css";
import { CustomWalletProvider } from "@/components/WalletProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "GOR Race - Wild West Horse Racing",
  description:
    "The wildest horse racing game in the digital frontier. Saddle up and race for glory!",
  keywords: "horse racing, gambling, solana, blockchain, cowboy, western",
  authors: [{ name: "GOR Race Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="GOR Race - Wild West Horse Racing" />
        <meta
          property="og:description"
          content="The wildest horse racing game in the digital frontier. Saddle up and race for glory!"
        />
        <meta property="og:image" content="https://raw.githubusercontent.com/codewithmide/gor-race/refs/heads/main/frontend/public/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="GOR Race - Wild West Horse Racing"
        />
        <meta
          name="twitter:description"
          content="The wildest horse racing game in the digital frontier. Saddle up and race for glory!"
        />
        <meta name="twitter:image" content="https://raw.githubusercontent.com/codewithmide/gor-race/refs/heads/main/frontend/public/og-image.png" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-cowboy-sand via-cowboy-tan to-cowboy-brown">
        <CustomWalletProvider>
          {/* Western-style background pattern */}
          <div className="fixed inset-0 bg-wood-texture opacity-10 pointer-events-none" />

          {/* Main content */}
          <div className="relative z-10">{children}</div>

          {/* Toast notifications with western theme */}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "toast-western",
              duration: 4000,
              style: {
                background: "linear-gradient(135deg, #8B4513, #654321)",
                color: "#FFF8DC",
                border: "2px solid #D2B48C",
                borderRadius: "8px",
                fontFamily: "Georgia, serif",
                fontSize: "14px",
                fontWeight: "bold",
              },
              success: {
                iconTheme: {
                  primary: "#FFD700",
                  secondary: "#8B4513",
                },
              },
              error: {
                iconTheme: {
                  primary: "#FF6B35",
                  secondary: "#FFF8DC",
                },
              },
            }}
          />
        </CustomWalletProvider>
      </body>
    </html>
  );
}
