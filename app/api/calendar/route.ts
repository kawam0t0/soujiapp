import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Google service account credentials are not configured.");
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

// POST /api/calendar
// Body: { members: [{name, email}], date: "2026-03-19" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { members, date } = body as {
      members: { name: string; email: string }[];
      date: string; // ISO date string "YYYY-MM-DD"
    };

    if (!members?.length || !date) {
      return NextResponse.json({ error: "members and date are required." }, { status: 400 });
    }

    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: "v3", auth });

    // 9:00 JST = 00:00 UTC (UTC+9)
    const startDateTime = `${date}T09:00:00+09:00`;
    const endDateTime   = `${date}T09:30:00+09:00`;

    const results = await Promise.allSettled(
      members
        .filter((m) => m.email)
        .map((member) =>
          calendar.events.insert({
            calendarId: member.email,
            requestBody: {
              summary: "掃除当番 - Clean Ambassador",
              description: `本日の掃除当番です。\nHave a clean day!!!`,
              start: {
                dateTime: startDateTime,
                timeZone: "Asia/Tokyo",
              },
              end: {
                dateTime: endDateTime,
                timeZone: "Asia/Tokyo",
              },
              colorId: "11", // Tomato red
              reminders: {
                useDefault: false,
                overrides: [{ method: "popup", minutes: 10 }],
              },
            },
          })
        )
    );

    const succeeded = results
      .map((r, i) => ({ member: members[i], result: r }))
      .filter((r) => r.result.status === "fulfilled")
      .map((r) => r.member.name);

    const failed = results
      .map((r, i) => ({ member: members[i], result: r }))
      .filter((r) => r.result.status === "rejected")
      .map((r) => ({
        name: r.member.name,
        error: (r.result as PromiseRejectedResult).reason?.message ?? "Unknown error",
      }));

    return NextResponse.json({ succeeded, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[v0] Google Calendar API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
