import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registro de Actividades - ChatBot",
  description: "Asistente para registro de tareas y actividades",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Anfeta Chatbot",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icono.webp",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icono.webp",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icono.webp",
        type: "image/webp",
      },
    ],
    apple: "/icono.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">

      {/* poner head */}
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
      </head>
      <body className={`font-sans antialiased`}>
        <ServiceWorkerRegister />
        {children}

        <Analytics />
      </body>
    </html>
  );
}
