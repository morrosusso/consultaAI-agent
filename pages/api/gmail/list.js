import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { google } from "googleapis";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
      labelIds: ["INBOX"],
    });

    const messages = listRes.data.messages || [];

    const emails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = detail.data.payload.headers;
        const from = headers.find((h) => h.name === "From")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "(no subject)";
        const date = headers.find((h) => h.name === "Date")?.value || "";
        const snippet = detail.data.snippet || "";

        return { id: msg.id, from, subject, date, snippet };
      })
    );

    res.status(200).json({ emails });
  } catch (error) {
    console.error("Gmail list error:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
}
