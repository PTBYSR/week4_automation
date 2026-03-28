import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = request.headers.get("x-worker-secret") || searchParams.get("secret");

  if (secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
  const WEBHOOK_PUBLISH_URL = "https://cohort2pod1.app.n8n.cloud/webhook/5ef3c9b5-f992-4d5c-8acf-8b31ed494f59";

  try {
    // 1. Fetch "due" records from Airtable
    // Filter: Status is 'Scheduled' AND Scheduled Time is in the past
    const formula = encodeURIComponent(`AND({Status}='Scheduled', IS_BEFORE({Scheduled Time}, NOW()))`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME!)}?filterByFormula=${formula}`;

    const airtableRes = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });

    if (!airtableRes.ok) {
      throw new Error(`Airtable fetch failed: ${await airtableRes.text()}`);
    }

    const { records } = await airtableRes.json();
    const results = [];

    // 2. Process each record
    for (const record of records) {
      const payloadString = record.fields["Raw Publish Data From Frontend"];
      if (!payloadString) continue;

      try {
        const payload = JSON.parse(payloadString);
        
        // Override action to 'publish' for the final trigger
        payload.action = "publish";

        // Trigger n8n webhook
        const n8nRes = await fetch(WEBHOOK_PUBLISH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (n8nRes.ok) {
          // Update Airtable to 'Published'
          const platform = payload.platform;
          const statusField = platform === "X" ? "X Post Status" : 
                             platform === "LinkedIn" ? "Linkedin Post Status" : 
                             "Newsletter Post Status";

          await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME!)}/${record.id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${AIRTABLE_PAT}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: {
                "Status": "Published",
                [statusField]: "Published",
              },
            }),
          });

          results.push({ id: record.id, status: "Success", platform });
        } else {
          results.push({ id: record.id, status: "n8n_failed", error: await n8nRes.text() });
        }
      } catch (err: unknown) {
        const parseErr = err as Error;
        results.push({ id: record.id, status: "error", error: parseErr.message });
      }
    }

    return NextResponse.json({ processed: records.length, results });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Worker Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
