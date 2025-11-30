import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Get prayer times from Aladhan API (free)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat") || "32.7940"; // Default: Haifa, Israel
    const lng = searchParams.get("lng") || "34.9896";
    const method = searchParams.get("method") || "2"; // 2 = ISNA (Islamic Society of North America)
    
    // Get today's date
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    // Aladhan API endpoint
    const url = `http://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=${method}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200 && data.data?.timings) {
      const timings = data.data.timings;
      return NextResponse.json({
        fajr: timings.Fajr,
        dhuhr: timings.Dhuhr,
        asr: timings.Asr,
        maghrib: timings.Maghrib,
        isha: timings.Isha,
        date: data.data.date.readable,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch prayer times" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Prayer times error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prayer times" },
      { status: 500 }
    );
  }
}

