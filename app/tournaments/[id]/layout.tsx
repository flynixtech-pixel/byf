import type { Metadata } from "next";
import { getPublicTournamentById } from "@/lib/api/tournaments";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }> | { id: string };
}

const CATEGORY_IMAGES: Record<string, string> = {
  badminton: "/badminton.png",
  cricket: "/bat.png",
  football: "/football.png",
  pickleball: "/pickball.png",
  skating: "/skating.jpg",
  swimming: "/swimming.jpg",
  volleyball: "/volleyball.jpg",
  tennis: "/tennis.png",
  "table tennis": "/tabletennis.png",
};

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const tournament = await getPublicTournamentById(resolvedParams.id);
    if (!tournament) return {};

    const title = `${tournament.title} | Book Your Vibe`;
    const description = tournament.description || `Register for the ${tournament.title} tournament in ${tournament.city || "Udaipur"}.`;
    
    // Determine category image
    const categoryKey = (tournament.category || "").toLowerCase().trim();
    const imagePath = CATEGORY_IMAGES[categoryKey] || "/logo.jpg";
    const imageUrl = `https://www.bookyourvibe.in${imagePath}`;

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
            alt: tournament.title,
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

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
