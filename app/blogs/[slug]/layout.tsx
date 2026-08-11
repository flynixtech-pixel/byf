import type { Metadata } from "next";
import { getPublishedPostBySlug } from "@/lib/api/blog";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const post = await getPublishedPostBySlug(resolvedParams.slug);
    if (!post) return {};

    const title = `${post.title} | Book Your Vibe Blog`;
    // Clean snippet of post content
    const description = post.content 
      ? post.content.replace(/[#*`_\[\]]/g, "").slice(0, 160) + "..."
      : `Read our latest story "${post.title}" on Book Your Vibe.`;

    const imageUrl = post.thumbnail || "https://www.bookyourvibe.in/logo.jpg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: [
          {
            url: imageUrl,
            alt: post.title,
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

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
