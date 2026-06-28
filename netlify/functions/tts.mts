import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // On accepte uniquement les requêtes POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let word: string;
  try {
    const body = await req.json();
    word = (body.word || "").toString().trim();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!word || word.length > 80) {
    return new Response(JSON.stringify({ error: "Invalid word" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const voiceId = "XB0fDUnXU5powFXDhCwa"; // Charlotte — voix féminine multilingue

  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: word,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!ttsResponse.ok) {
    const errText = await ttsResponse.text();
    return new Response(
      JSON.stringify({ error: "TTS failed", detail: errText, status: ttsResponse.status }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const audioBuffer = await ttsResponse.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
};

export const config: Config = {
  path: "/api/tts",
};
