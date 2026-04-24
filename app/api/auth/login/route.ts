import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Built-in login is disabled. Use Cloudflare Access." },
    { status: 410 },
  );
}
