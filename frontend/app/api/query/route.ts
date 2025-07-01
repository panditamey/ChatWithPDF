import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.hash || !body.query) {
      return NextResponse.json(
        { error: "Hash and query are required" },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendResponse = await fetch("http://localhost:8000/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      return NextResponse.json(
        { error: "Failed to query PDF" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error querying PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 