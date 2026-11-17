import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Footy Predictions",
  description: "Fixtures, results, standings, market odds and model predictions for football competitions.",
  icons: {
    icon: "/img/favicon.png",
    apple: "/img/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0b0f14" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>
        <header className="topbar">
          <div className="wrap topbar-inner">
            <a className="brand" href="/">
              <img className="brand-logo" src="/img/logo.png" alt="" width={44} height={44} />
              <span>
                Footy<span className="brand-accent">Predictions</span>
              </span>
            </a>
            <SiteNav />
          </div>
        </header>

        <main className="wrap app-main">{children}</main>

        <footer className="footer">
          <div className="wrap">
            <p>
              Odds are bookmaker prices with the margin removed. Model results are simulations, not
              guarantees. Nothing here is betting advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
