import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MiMad",
  description: "Madrid, mejor en compañía. Planes y actividades con datos abiertos de la Comunidad de Madrid.",
  appleWebApp: { capable: true, title: "MiMad", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FF5A6E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-sans antialiased`}>
        {/* Mobile first: la app se diseña a 430 px y en escritorio queda centrada */}
        <div className="mx-auto min-h-dvh max-w-[430px] bg-white shadow-sm">{children}</div>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
