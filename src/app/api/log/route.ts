import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { level, message, data } = await request.json();
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[BROWSER ${level.toUpperCase()}] ${timestamp}:`;
    
    if (data) {
      console.log(prefix, message, JSON.stringify(data, null, 2));
    } else {
      console.log(prefix, message);
    }
    
    return NextResponse.json({ ok: true });
  } catch (_err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
