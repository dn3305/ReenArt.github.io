import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { LOGO_BASE64 } from "../lib/logoBase64";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nazia | Fine Art Portfolio & Gallery",
  description: "Explore original paintings, mixed media, and digital art series by Nazia. Minimalist portfolio and gallery featuring available works for collectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-accent/20 selection:text-accent">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl h-20 items-center justify-between px-6 md:px-12">
            {/* Logo */}
            <Link 
              href="/" 
              className="hover:opacity-75 transition-opacity flex items-center"
            >
              <Image
                src={LOGO_BASE64}
                alt="Nazia – Fine Art"
                width={120}
                height={48}
                className="h-12 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>

            {/* Nav Links */}
            <nav className="flex items-center gap-8 md:gap-12">
              <Link 
                href="/" 
                className="text-xs uppercase tracking-widest hover:text-accent transition-colors"
              >
                Home
              </Link>
              <Link 
                href="/gallery" 
                className="text-xs uppercase tracking-widest hover:text-accent transition-colors"
              >
                Gallery
              </Link>
              <Link 
                href="/about" 
                className="text-xs uppercase tracking-widest hover:text-accent transition-colors"
              >
                About & Contact
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border-subtle bg-background py-12">
          <div className="mx-auto max-w-7xl px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-2 text-center md:text-left items-center md:items-start">
              <Image
                src={LOGO_BASE64}
                alt="Nazia – Fine Art"
                width={80}
                height={32}
                className="h-8 w-auto object-contain opacity-80"
                unoptimized
              />
              <p className="text-[10px] text-muted tracking-wider">Visual Artist & Painter</p>
            </div>
            
            <p className="text-[10px] text-muted tracking-widest uppercase">
              © {new Date().getFullYear()} Nazia. All Rights Reserved.
            </p>
            
            <div className="flex gap-6 text-[10px] uppercase tracking-widest text-muted">
              <a href="#instagram" className="hover:text-accent transition-colors">Instagram</a>
              <a href="#about" className="hover:text-accent transition-colors">Inquiries</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

