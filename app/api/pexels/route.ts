import { NextRequest, NextResponse } from "next/server";

interface PexelsPhoto {
  alt: string | null;
  src: {
    landscape: string;
    medium: string;
  };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ url: null, alt: null }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ url: null, alt: null }, { status: 200 });
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: apiKey },
        next: { revalidate: 60 * 60 * 24 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ url: null, alt: null }, { status: 200 });
    }

    const data: PexelsSearchResponse = await res.json();
    const photo = data.photos?.[0];
    const url = photo?.src?.landscape ?? photo?.src?.medium ?? null;

    return NextResponse.json({ url, alt: photo?.alt ?? null }, { status: 200 });
  } catch {
    return NextResponse.json({ url: null, alt: null }, { status: 200 });
  }
}
