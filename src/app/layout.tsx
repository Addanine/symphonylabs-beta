import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Space_Mono } from "next/font/google";
import { CartProvider } from "~/context/CartContext";
import { ToastProvider } from "~/context/ToastContext";
import { ToastContainer } from "~/components/ToastContainer";
import Banner from "~/components/Banner";

export const metadata: Metadata = {
  title: "symphony labs",
  description: "homebrew hrt lab",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceMono.variable}`}>
      <body className="bg-white text-black antialiased">
        <ToastProvider>
          <Banner />
          <CartProvider>
            {children}
          </CartProvider>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
