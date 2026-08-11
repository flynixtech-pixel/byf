import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Vendor Partner | Book Your Vibe",
    template: "%s | Vendor Partner | Book Your Vibe",
  },
  description: "Vendor partner dashboard for Book Your Vibe - Manage your turf, court, or arena bookings, slots, and payouts.",
};

export default function VendorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}