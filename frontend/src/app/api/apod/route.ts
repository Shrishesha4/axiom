import { NextResponse } from "next/server";

const NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";
const NASA_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY || "DEMO_KEY";

interface ApodItem {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  thumbnail_url?: string;
  media_type: "image" | "video";
  copyright?: string;
  date: string;
}

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(`${NASA_APOD_URL}?api_key=${NASA_KEY}&thumbs=true`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("APOD fetch failed");

    const data = (await res.json()) as ApodItem;
    const mediaUrl =
      data.media_type === "image"
        ? data.url
        : data.thumbnail_url || data.url;

    return NextResponse.json({
      title: data.title,
      explanation: data.explanation,
      mediaUrl,
      copyright: data.copyright,
      date: data.date,
    });
  } catch {
    return NextResponse.json(
      {
        title: "Pillars of Creation",
        explanation:
          "NASA's James Webb Space Telescope reveals newborn stars in a stellar nursery — discovery takes patience, just like a good investigation.",
        mediaUrl:
          "https://images-assets.nasa.gov/image/PIA04921/PIA04921~medium.jpg",
        date: new Date().toISOString().slice(0, 10),
        fallback: true,
      },
      { status: 200 }
    );
  }
}
