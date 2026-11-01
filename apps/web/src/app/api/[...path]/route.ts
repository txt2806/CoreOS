import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin proxy to the Nest API.
 *
 * The browser only ever talks to this origin, so the HttpOnly session cookie is
 * set and read on the same site without CORS, and streamed responses (SSE for
 * notifications) keep flowing chunk by chunk.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";

/**
 * `app/api/[...path]` swallows the leading `/api` as its own folder name, so the
 * captured segments are `["v1", "tasks"]`. The Nest app serves its whole surface
 * under `/api/v1`, which means the prefix has to be put back before forwarding —
 * dropping it turns every call into a 404 from the API.
 */
const API_PREFIX = "api";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

async function forward(request: NextRequest, path: string[]) {
  const segments = path.map(encodeURIComponent).join("/");
  const origin = API_ORIGIN.replace(/\/+$/, "");
  // Absolute URL: a leading "/" would otherwise resolve against the origin only.
  const target = new URL(`${origin}/${API_PREFIX}/${segments}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.delete("accept-encoding");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      cache: "no-store",
      // Streaming request bodies need half-duplex in Node's fetch.
      duplex: hasBody ? "half" : undefined,
    } as RequestInit & { duplex?: "half" });
  } catch {
    return NextResponse.json(
      {
        message:
          "Không kết nối được tới máy chủ nghiệp vụ. Kiểm tra API đang chạy rồi thử lại.",
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie")
      responseHeaders.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie?.() ?? []) {
    responseHeaders.append("set-cookie", cookie);
  }
  responseHeaders.set("cache-control", "no-store");

  const isStream = upstream.headers.get("content-type")?.includes("text/event-stream");
  const responseBody = isStream ? upstream.body : await upstream.text();

  return new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path ?? []);
}
export async function POST(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path ?? []);
}
export async function PUT(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path ?? []);
}
export async function PATCH(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path ?? []);
}
export async function DELETE(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path ?? []);
}
