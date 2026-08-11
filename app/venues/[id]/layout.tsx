import type { Metadata } from "next";
import { getVenueById, getListingImage } from "@/lib/api/venues";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const venue = await getVenueById(resolvedParams.id);
    if (!venue) return {};

    const title = `${venue.title} | Book Your Vibe`;
    const description = venue.description || `Book slots at ${venue.title} in ${venue.city || "Udaipur"}.`;
    
    // Choose coverImage, or first image, or default logo
    const imageUrl = getListingImage(venue, "poster") || "https://www.bookyourvibe.in/logo.jpg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: imageUrl,
            alt: venue.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (err) {
    return {};
  }
}

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
