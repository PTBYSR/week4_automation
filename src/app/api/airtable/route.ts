import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME!;

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("request_id");
  const checkDuplicate = request.nextUrl.searchParams.get("check_duplicate");

  // --- Duplicate Check Case ---
  if (checkDuplicate) {
    try {
      // Escape single quotes for Airtable formula
      const safeValue = checkDuplicate.replace(/'/g, "\\'");
      const formula = encodeURIComponent(
        `OR({URL}='${safeValue}', {Raw Content}='${safeValue}')`
      );
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?filterByFormula=${formula}&maxRecords=1&fields%5B%5D=Request%20ID`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Airtable error: ${await response.text()}`);
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        return NextResponse.json({
          exists: true,
          request_id: data.records[0].fields["Request ID"],
        });
      }

      return NextResponse.json({ exists: false });
    } catch (err: unknown) {
      const error = err as Error;
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // --- Standard Request ID Polling Case ---
  if (!requestId) {
    return NextResponse.json(
      { error: "Missing request_id parameter" },
      { status: 400 }
    );
  }

  // Check if Airtable credentials are configured
  if (
    !AIRTABLE_PAT ||
    AIRTABLE_PAT.startsWith("pat_REPLACE") ||
    !AIRTABLE_BASE_ID ||
    AIRTABLE_BASE_ID === "app_REPLACE_ME"
  ) {
    // Return mock polling data for local development
    return NextResponse.json({
      status: "mock_mode",
      message: "Airtable credentials not configured. Using mock mode.",
    });
  }

  try {
    const formula = encodeURIComponent(`{Request ID}='${requestId}'`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Airtable API error:", errorText);
      return NextResponse.json(
        { error: "Failed to query Airtable", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return NextResponse.json({
        status: "not_found",
        message: `No record found for request_id: ${requestId}`,
      });
    }

    const record = data.records[0];
    const fields = record.fields;
    const status = fields["Status"] || "unknown";

    // Build the response
    const result: Record<string, unknown> = { status };

    // Always include per-platform post statuses if they exist
    result.postStatus = {
      Newsletter: fields["Newsletter Post Status"] || "",
      X: fields["X Post Status"] || "",
      LinkedIn: fields["Linkedin Post Status"] || "",
    };

    // Parse Drafts and Articles
    const rawWH = fields["Raw WH Response"];
    const rawArticles = fields["Raw Articles Output"];

    if (status === "waiting_for_selection" && (rawWH || rawArticles)) {
      try {
        const metadataArray = rawWH ? (typeof rawWH === "string" ? JSON.parse(rawWH) : rawWH) : [];
        const contentArray = rawArticles ? (typeof rawArticles === "string" ? JSON.parse(rawArticles) : rawArticles) : [];

        // Merge metadata (id, title, angle) with full content (output)
        result.drafts = metadataArray.map((meta: any, index: number) => ({
          id: meta.id || `draft_${index + 1}`,
          title: meta.title || "Untitled Draft",
          style: meta.style || meta.angle || "Professional",
          body: contentArray[index]?.output || meta.body || "",
          image_prompt: meta.image_prompt || "",
          word_count: meta.word_count || 0,
          image_url: meta.image_url || undefined,
        }));
      } catch (parseError) {
        console.error("Failed to parse draft data:", parseError);
        result.parseError = "Failed to parse draft data from Airtable";
      }
    }

    // When status is "waiting_post_selection", parse and include the social adaptations
    if (status === "waiting_post_selection" && fields["Raw WH2 Response"]) {
      try {
        const rawResponse = fields["Raw WH2 Response"];
        const adaptations =
          typeof rawResponse === "string"
            ? JSON.parse(rawResponse)
            : rawResponse;
        result.adaptations = adaptations;
      } catch (parseError) {
        console.error("Failed to parse Raw WH2 Response:", parseError);
        result.parseError = "Failed to parse social copy data from Airtable";
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Airtable polling error:", error.message);
    return NextResponse.json(
      { error: "Internal server error during Airtable polling", details: error.message },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update platform post status columns ─────────────────
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { request_id, fields: updateFields } = body;

  if (!request_id || !updateFields) {
    return NextResponse.json(
      { error: "Missing request_id or fields" },
      { status: 400 }
    );
  }

  try {
    // First, find the record by request_id
    const formula = encodeURIComponent(`{Request ID}='${request_id}'`);
    const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?filterByFormula=${formula}&maxRecords=1`;

    const findRes = await fetch(findUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
      cache: "no-store",
    });

    const findData = await findRes.json();
    if (!findData.records || findData.records.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const recordId = findData.records[0].id;

    // Now PATCH the record
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${recordId}`;
    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: updateFields }),
    });

    if (!patchRes.ok) {
      const errorText = await patchRes.text();
      console.error("Airtable PATCH error:", errorText);
      return NextResponse.json({ error: "Failed to update Airtable", details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Airtable Patch Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Create a new record from the frontend ────────────────
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { request_id, source_url, raw_content } = body;

  if (!request_id) {
    return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Request ID": request_id,
          "URL": source_url || "",
          "Raw Content": raw_content || "",
          "Status": "form_data_received",
          "Newsletter Post Status": "Pending",
          "X Post Status": "Pending",
          "Linkedin Post Status": "Pending",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Airtable POST error:", errorText);
      return NextResponse.json({ error: "Failed to create record", details: errorText }, { status: 500 });
    }

    const data = await response.json();
    console.log(`[SERVER AIRTABLE] Created initial record for ${request_id}`);
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Airtable POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
