import type { Metadata } from "next";
import { Baloo_2, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Truck Driver Music | Horn OK Please",
  description:
    "Highway bangers that blast out of Indian trucks. Open it. Press play.",
  openGraph: {
    title: "Truck Driver Music | Horn OK Please",
    description: "Highway bangers that blast out of Indian trucks.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
