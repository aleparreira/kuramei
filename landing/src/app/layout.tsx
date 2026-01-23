import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kuramei.ai"),
  title: "Kuramei - AI-powered Architecture Decision-Making",
  description: "Transform conversations into architecture diagrams with cost estimation and Terraform export. Built by Alexandre Parreira, Sociotechnical Systems Architect.",
  keywords: ["architecture", "cloud", "AI", "terraform", "diagram", "cost estimation", "AWS", "solutions architect"],
  authors: [{ name: "Alexandre Parreira", url: "https://linkedin.com/in/aleparreira" }],
  creator: "Alexandre Parreira",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kuramei.ai",
    siteName: "Kuramei",
    title: "Kuramei - AI-powered Architecture Decision-Making",
    description: "Transform conversations into architecture diagrams with cost estimation and Terraform export.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kuramei - Clarity emerges",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kuramei - AI-powered Architecture Decision-Making",
    description: "Transform conversations into architecture diagrams with cost estimation and Terraform export.",
    images: ["/og-image.png"],
    creator: "@aleparreira",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
