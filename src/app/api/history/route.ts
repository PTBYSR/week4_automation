import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME!;

export async function GET() {
  // Check credentials
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    return NextResponse.json({ records: [] });
  }

  try {
    // Fetch last 50 records
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?maxRecords=50`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${await response.text()}`);
    }

    const data = await response.json();

    const formattedRecords = data.records.map((record: any) => {
      const f = record.fields;
      const res: any = {
        id: f["Request ID"] || record.id,
        status: f["Status"] || "Unknown",
        createdAt: record.createdTime,
        platforms: {
          X: f["X Post Status"] || "Pending",
          LinkedIn: f["Linkedin Post Status"] || "Pending",
          Newsletter: f["Newsletter Post Status"] || "Pending",
        },
        sourceUrl: f["URL"],
        rawContent: f["Raw Content"],
      };

      // 1. Extract Title and Style/Angle from Raw WH Response
      try {
        if (f["Raw WH Response"]) {
          const wh = typeof f["Raw WH Response"] === "string" ? JSON.parse(f["Raw WH Response"]) : f["Raw WH Response"];
          if (Array.isArray(wh) && wh.length > 0) {
             res.title = wh[0].title || "Untitled Pipeline";
             res.style = wh[0].style || wh[0].angle || "Professional";
             res.imageUrl = wh[0].image_url;
          }
        }
      } catch (e) {}

      // 2. Extract Social Content from Raw WH2 Response
      try {
        if (f["Raw WH2 Response"]) {
          const wh2 = typeof f["Raw WH2 Response"] === "string" ? JSON.parse(f["Raw WH2 Response"]) : f["Raw WH2 Response"];
          const channels = wh2.channels || wh2;
          res.content = {
            twitter: channels.twitter?.content || "",
            linkedin: channels.linkedin?.content || "",
            newsletter: channels.newsletter?.content || "",
          };
          // Use image from WH2 if available
          if (channels.twitter?.image_url) res.imageUrl = channels.twitter.image_url;
        }
      } catch (e) {}

      return res;
    });

    return NextResponse.json({ records: formattedRecords });
  } catch (error: any) {
    console.error("History API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
