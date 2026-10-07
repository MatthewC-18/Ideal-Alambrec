import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "Cotizador CercasPro · Ideal Alambrec", template: "%s · Cotizador Ideal Alambrec" },
  description: "Cotizador web de cerramientos CercasPro — Ideal Alambrec, Grupo AG",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#003da7", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
