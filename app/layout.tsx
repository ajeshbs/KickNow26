import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} relative`}>
        {/* Real Madrid backdrop: crest watermark + soft gold glow, behind all pages */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-gold-400/10 blur-[120px]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://crests.football-data.org/86.png"
            alt=""
            className="absolute -right-32 top-1/2 h-[38rem] w-auto -translate-y-1/2 opacity-[0.05] saturate-0 select-none md:-right-20"
          />
        </div>
        {children}
      </body>
    </html>
  );
}
