import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import Splash from "@/components/Splash";
import { SPLASH_KEY } from "@/lib/splash";

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

// Si la animación de apertura ya se vio en esta sesión, se oculta antes de pintar (sin parpadeo)
const hideSplashScript = `try{if(sessionStorage.getItem("${SPLASH_KEY}"))document.documentElement.classList.add("sin-splash")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: hideSplashScript }} />
      </head>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <Splash />
        {/* Mobile first: la app se diseña a 430 px y en escritorio queda centrada */}
        <div className="mx-auto min-h-dvh max-w-[430px] bg-white shadow-sm">{children}</div>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
