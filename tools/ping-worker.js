// Cloudflare Worker: "someone opened your concept site" → Telegram ping to Samir.
// Deploy: Cloudflare dashboard → Workers & Pages → Create → Worker "dolcessi-ping" → paste this file → Deploy.
// Then Settings → Variables and Secrets → add two SECRETS: TG_TOKEN (the Alfred bot token) and TG_CHAT (8846417129).
// The concept sites call POST https://dolcessi-ping.<your-subdomain>.workers.dev/v with {s: slug, r: referrer, m: mobile}.
// Nothing is stored: no IPs, no cookies. Repeat visits to the same site are muted for 3 hours.

const QUIET_SECONDS = 3 * 60 * 60;
const ALLOWED_ORIGIN = "https://concept.dolcessi.com";

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/v") return new Response("ok", { headers: cors });
    if ((request.headers.get("Origin") || "") !== ALLOWED_ORIGIN) return new Response("no", { status: 403 });

    let body = {};
    try { body = JSON.parse(await request.text()); } catch (e) {}
    const slug = String(body.s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    if (!slug) return new Response("ok", { headers: cors });

    // Mute repeats per site for a few hours (edge cache as a tiny timer, nothing personal kept).
    const cache = caches.default;
    const key = new Request("https://ping.internal/seen/" + slug);
    if (await cache.match(key)) return new Response("ok", { headers: cors });
    ctx.waitUntil(cache.put(key, new Response("1", { headers: { "Cache-Control": "max-age=" + QUIET_SECONDS } })));

    const ref = String(body.r || "").replace(/^https?:\/\//, "").split("/")[0].slice(0, 60);
    const via = ref ? (/instagram/.test(ref) ? "Instagram" : /mail|outlook|live\.com|gmail/.test(ref) ? "email" : ref) : "a direct link";
    const city = (request.cf && request.cf.city) ? " near " + request.cf.city : "";
    const text =
      "🔔 Someone just opened your concept site for " + slug.replace(/-/g, " ") +
      " (" + (body.m ? "phone" : "computer") + ", via " + via + city + ").\n" +
      "https://concept.dolcessi.com/" + slug + "/\n" +
      "Good moment to follow up, sir.";

    ctx.waitUntil(fetch("https://api.telegram.org/bot" + env.TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TG_CHAT, text, disable_web_page_preview: true }),
    }));
    return new Response("ok", { headers: cors });
  },
};

/* Snippet added to every concept site (before </body>), with WORKER = your workers.dev URL:

<script>
(function(){try{
  var q=new URLSearchParams(location.search);
  if(q.has("me")){localStorage.setItem("dolcessi_me","1");}           // open any site once with ?me=1 on your own phone/laptop to mute yourself
  if(localStorage.getItem("dolcessi_me")||navigator.webdriver) return;
  var slug=location.pathname.split("/")[1]; if(!slug) return;
  if(sessionStorage.getItem("dp_"+slug)) return; sessionStorage.setItem("dp_"+slug,"1");
  setTimeout(function(){ fetch("WORKER/v",{method:"POST",headers:{"Content-Type":"text/plain"},keepalive:true,
    body:JSON.stringify({s:slug,r:document.referrer,m:/Mobi/.test(navigator.userAgent)})}).catch(function(){}); },4000);
}catch(e){}})();
</script>
*/
