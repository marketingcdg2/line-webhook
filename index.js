const CHANNEL_ACCESS_TOKEN = "gPTH9qo58RL80DhQQ6Wc7LttQkg4i5SzmCyucNPhUHpgJqEQfhrV/hn7fou7pC4MnqowoBdSqSe4cbmnPwIOObE03xgBZ5i9Plt75BdTmrAHdKsw6h6mtucORUglB7dRmYL/+Z0aEq656LFkcpkMAAdB04t89/1O/w1cDnyilFU=";
const CHANNEL_SECRET = "56c10923be25796f368f1aab4d6847b0";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyeW1MH1nYGVBIogsGEte-ziInIOz35bkC83gxQgzHmvpAPZCruqr7uYG8n7WfuFmOLIw/exec";

async function handleWebhook(request) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hash = btoa(String.fromCharCode(...new Uint8Array(sig)));

  if (signature && signature !== hash) {
    return new Response("Invalid signature", { status: 401 });
  }

  const json = JSON.parse(body);
  const events = json.events || [];

  for (const event of events) {
    if (event.type === "follow") {
      const userId = event.source.userId;
      const profile = await getProfile(userId);
      await logToSheet({
        timestamp: new Date().toISOString(),
        displayName: profile.displayName || "",
        userId: userId,
        pictureUrl: profile.pictureUrl || ""
      });
    }
  }

  return new Response(JSON.stringify({ status: "success" }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function getProfile(userId) {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { "Authorization": `Bearer ${CHANNEL_ACCESS_TOKEN}` }
  });
  return res.json();
}

async function logToSheet(data) {
  const params = new URLSearchParams({
    type: "follower",
    timestamp: data.timestamp,
    displayName: data.displayName,
    userId: data.userId,
    pictureUrl: data.pictureUrl
  });
  await fetch(SHEET_URL + "?" + params.toString());
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleWebhook(request);
    }
    return new Response(JSON.stringify({ status: "LINE Webhook Running" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
