import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { target, payload } = await request.json();
    
    // Webhook Map (Using production URLs for consistency)
    const WEBHOOK_MAP: Record<string, string> = {
      ideation: "https://cohort2pod1.app.n8n.cloud/webhook/e1bbd678-2b08-412c-b3fc-64cafa186ba7",
      adaptation: "https://cohort2pod1.app.n8n.cloud/webhook/a8018dfd-567f-4132-97f5-fc8391cb24b6",
      publish: "https://cohort2pod1.app.n8n.cloud/webhook/5ef3c9b5-f992-4d5c-8acf-8b31ed494f59",
    };

    const webhookUrl = WEBHOOK_MAP[target] || WEBHOOK_MAP.publish;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Publish Proxy Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
