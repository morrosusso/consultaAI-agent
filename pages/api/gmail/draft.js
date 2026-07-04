import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { from, subject, snippet } = req.body;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: `You are an AI assistant for Morro Susso, an IT consultant and teacher in The Gambia. 
Draft professional, warm, and concise email replies under 150 words.`,
      messages: [
        {
          role: "user",
          content: `Draft a reply to this email:\nFrom: ${from}\nSubject: ${subject}\nContent: ${snippet}`,
        },
      ],
    });

    const reply = message.content[0].text;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("AI draft error:", error);
    res.status(500).json({ error: "Failed to generate reply" });
  }
}
