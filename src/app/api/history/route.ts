import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const formattedRecords = data.records.map((record: { id: string; fields: Record<string, unknown>; createdTime: string }) => {
      const f = record.fields;
      return {
        id: record.id,
        request_id: (f.request_id as string) || "",
        platform: (f.platform as string) || "X",
        status: (f.Status as string) || "Draft",
        content: (f.content as string) || "",
        image_url: (f.image_url as string) || "",
        created_at: (f.created_at as string) || record.createdTime,
      };
    });

    return NextResponse.json({ records: formattedRecords });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("History API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
