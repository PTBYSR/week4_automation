import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME!;

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("request_id");

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
      console.log(`[SERVER AIRTABLE] No record found yet for ${requestId}`);
      return NextResponse.json({
        status: "not_found",
        message: `No record found for request_id: ${requestId}`,
      });
    }

    const record = data.records[0];
    const fields = record.fields;
    const status = fields["Status"] || "unknown";
    
    console.log(`[SERVER AIRTABLE] Found record ${requestId}: status = ${status}`);

    // Build the response
    const result: any = { status };

    // When status is "waiting_for_selection", parse and include the draft data
    if (status === "waiting_for_selection" && fields["Raw WH Response"]) {
      try {
        const rawResponse = fields["Raw WH Response"];
        const drafts =
          typeof rawResponse === "string"
            ? JSON.parse(rawResponse)
            : rawResponse;
        result.drafts = drafts;
      } catch (parseError) {
        console.error("Failed to parse Raw WH Response:", parseError);
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
  } catch (error) {
    console.error("Airtable polling error:", error);
    return NextResponse.json(
      { error: "Internal server error during Airtable polling" },
      { status: 500 }
    );
  }
}
