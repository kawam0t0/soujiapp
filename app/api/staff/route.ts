import { google } from "googleapis";
import { NextResponse } from "next/server";

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Google service account credentials are not configured.");
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/calendar",
    ],
  });
}

export async function GET() {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEET_ID is not configured." }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "staff!A:B",
    });

    const rows = response.data.values ?? [];

    // Skip header row if first cell looks like a label
    const dataRows = rows[0]?.[0]?.toLowerCase().includes("name") ||
                     rows[0]?.[0]?.toLowerCase().includes("名前")
      ? rows.slice(1)
      : rows;

    const staff = dataRows
      .filter((row) => row[0]?.trim())
      .map((row) => ({
        name: row[0]?.trim() ?? "",
        email: row[1]?.trim() ?? "",
      }));

    return NextResponse.json({ staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[v0] Google Sheets API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
