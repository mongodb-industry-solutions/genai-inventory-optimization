import { NextResponse } from "next/server";
import { getGeneratedCriteria } from "@/lib/bedrock";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const criteria = await getGeneratedCriteria(prompt);

    if (!criteria) {
      return NextResponse.json(
        { error: "Failed to generate criteria" },
        { status: 500 }
      );
    }

    return NextResponse.json(criteria, { status: 200 });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
