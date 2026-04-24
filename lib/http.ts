import { NextResponse } from "next/server";

export const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const getClientAddress = (request: Request) =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "local";
