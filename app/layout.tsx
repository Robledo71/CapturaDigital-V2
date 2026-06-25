import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/front/components/ui/ThemeProvider";
import { NoPinchZoom } from "@/front/components/ui/NoPinchZoom";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Captura Digital — Quality Bolca",
  description: "Sistema de reportes de inspección",
};

// App shell: se bloquea el zoom para evitar el pan con dos dedos que dejaba
// huecos negros (la app maneja su propio scroll interno por contenedor).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden flex flex-col bg-background text-foreground font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <NoPinchZoom />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
