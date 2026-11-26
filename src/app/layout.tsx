import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Caçador: A Revanche (5ª Edição) — Fichas Online",
  description:
    "Criador, gerenciador de fichas e Escudo do Mestre para Caçador: A Revanche 5ª Edição.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${barlowCondensed.variable} dark`}
    >
      <body className="antialiased selection:bg-[#f08b21] selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
