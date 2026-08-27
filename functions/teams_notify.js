/**
 * Outbound notifications to a Microsoft Teams channel.
 *
 * Mirrors the iOS push feed exactly: the same events (new obligations, tadil
 * progress, the 08:00 digest, manual sends) are posted to a Teams channel so
 * the team gets one shared running log without installing anything new. This
 * is hooked inside push.sendToAllDevices, so it inherits the same on/off
 * toggles (notificationSettings.push.*) and fires even when no iOS device is
 * registered.
 *
 * Delivery is a plain HTTPS POST to a channel webhook URL. Two ways to create
 * that URL, either works with the payload below:
 *
 * We POST a single `{ "text": "..." }` body. The Power Automate template
 * ("Post to a channel when a webhook request is received") reads that one
 * field. It deliberately carries NO MessageCard fields: when both `text` and
 * a `sections[]` block were sent, the flow rendered each message twice inside
 * one card.
 *
 * The URL is a secret (anyone holding it can post to the channel), so it lives
 * in functions/.env as TEAMS_WEBHOOK_URL and never in the repo.
 */

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || "";

// A slow or wedged webhook must never hold up the push path it's hooked into.
const TIMEOUT_MS = 5000;

// Shown as the first line of every message. The real Teams sender chip is
// fixed to "Workflows"/"Power Automate" and can't be renamed from here, so the
// SenAI identity lives in the body instead.
const SENDER = "🤖 SenAI";

function buildPayload(title, body) {
    // The Power Automate "Post card in a chat or channel" step parses the whole
    // request body as an Adaptive Card - a plain { text } body fails with
    // "Property 'type' must be 'AdaptiveCard'". So the body IS the card.
    //
    // TextBlock honours a small markdown subset (**bold**, links) and needs a
    // blank line for a line break, so collapse any run of newlines to two.
    const spaced = String(body).replace(/\r?\n[\r\n]*/g, "\n\n");
    return {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.4",
        body: [
            { type: "TextBlock", text: SENDER, size: "Small", isSubtle: true, spacing: "None" },
            { type: "TextBlock", text: title, weight: "Bolder", size: "Medium", wrap: true, spacing: "Small" },
            { type: "TextBlock", text: spaced, wrap: true, spacing: "Small" }
        ]
    };
}

/**
 * @param {string} title
 * @param {string} body
 * @returns {Promise<{ok: boolean, skipped?: boolean, status?: number, error?: string}>}
 */
async function sendToTeams(title, body) {
    if (!TEAMS_WEBHOOK_URL) {
        console.log("🔕 TEAMS_WEBHOOK_URL tanımlı değil, Teams bildirimi atlandı.");
        return { ok: false, skipped: true };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(TEAMS_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPayload(title, body)),
            signal: controller.signal
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            console.error(`❌ Teams webhook ${res.status}: ${detail.slice(0, 200)}`);
            return { ok: false, status: res.status };
        }
        console.log(`✅ Teams bildirimi gönderildi: ${title}`);
        return { ok: true };
    } catch (err) {
        const reason = err && err.name === "AbortError" ? "zaman aşımı" : (err && err.message);
        console.error("❌ Teams webhook hatası:", reason);
        return { ok: false, error: reason };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { sendToTeams };
