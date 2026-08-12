import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CustomerAuthProvider } from "@/components/providers/CustomerAuthProvider";
import { GoogleAuthProvider } from "@/components/providers/GoogleAuthProvider";
import { BottomNav } from "@/components/mobile/BottomNav";
import Script from "next/script";
import "./globals.css";

const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem("byv-theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bookyourvibe.in";
const SITE_NAME = "Book Your Vibe";
const SITE_DESCRIPTION =
  "Book Your Vibe - Play. Book. Vibe. Book sports venues, join tournaments and challenges, connect with the community, and reserve tables or pay dine-in bills at partner restaurants.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Book Sports Venues, Tournaments & Dineout`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Book Your Vibe",
    "sports venue booking",
    "sports tournaments",
    "sports challenges",
    "venue booking app",
    "sports community",
    "restaurant reservations",
    "dineout",
    "pay restaurant bill",
    "play book vibe",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Book Sports Venues, Tournaments & Dineout`,
    description: SITE_DESCRIPTION,
    locale: "en_IN",
    images: [
      {
        url: `${SITE_URL}/logo.jpg`,
        width: 400,
        height: 400,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} | Book Sports Venues, Tournaments & Dineout`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/logo.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <Script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsActivityLocation",
              "name": "Book Your Vibe",
              "alternateName": "BYV",
              "url": "https://www.bookyourvibe.in",
              "logo": "https://www.bookyourvibe.in/logo.jpg",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+916350651667",
                "contactType": "customer service",
                "email": "info@bookyourvibe.in",
                "availableLanguage": ["en", "hi"]
              },
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Udaipur",
                "addressRegion": "Rajasthan",
                "addressCountry": "IN"
              },
              "sameAs": [
                "https://www.instagram.com/bookyourvibe",
                "https://twitter.com/bookyourvibe"
              ],
              "description": "Book Your Vibe - Play. Book. Vibe. Book sports venues (turfs, box cricket, badminton courts), register for tournaments and challenges, reserve restaurant tables, and pay dine-in bills in Udaipur, Rajasthan."
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Book Your Vibe",
              "alternateName": "BYV",
              "url": "https://www.bookyourvibe.in",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.bookyourvibe.in/venues?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <GoogleAuthProvider>
            <CustomerAuthProvider>
              {children}
              <BottomNav />
            </CustomerAuthProvider>
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
