import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendResponse = await fetch("http://localhost:8000/process", {
      method: "POST",
      body: formData,
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      return NextResponse.json(
        { error: "Failed to process PDF" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 