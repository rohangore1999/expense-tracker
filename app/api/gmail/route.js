import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export async function GET(request) {
  try {
    // Get the session to access the access token
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in with Google." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const messageId = searchParams.get("messageId");

    let url;
    if (messageId) {
      // Fetch specific message
      url = `${GMAIL_API_BASE}/users/me/messages/${messageId}`;
    } else {
      // Fetch messages list
      url = `${GMAIL_API_BASE}/users/me/messages${query ? `?${query}` : ""}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Gmail API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Get the session to access the access token
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in with Google." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, messageId } = body;

    let url;
    if (messageId) {
      // Fetch specific message
      url = `${GMAIL_API_BASE}/users/me/messages/${messageId}`;
    } else {
      // Fetch messages list
      url = `${GMAIL_API_BASE}/users/me/messages${query ? `?${query}` : ""}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Gmail API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
