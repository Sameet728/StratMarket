import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHmac } from "crypto";

// Resend uses Svix for webhook delivery — verify HMAC-SHA256 signature
function verifyResendWebhookSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  webhookSecret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[Resend Webhook] Missing svix headers — skipping signature check");
    return true; // Allow through without headers (Resend may not always send them in test mode)
  }

  try {
    // Svix HMAC format: "v1,<base64>" — secret is base64url-encoded after "whsec_" prefix
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const secretBytes = Buffer.from(webhookSecret.replace(/^whsec_/, ""), "base64");
    const hmac = createHmac("sha256", secretBytes);
    const computedSig = `v1,${hmac.update(signedContent).digest("base64")}`;

    // Signature header may contain multiple space-separated values (rotation support)
    const sigParts = svixSignature.split(" ");
    const isValid = sigParts.some((sig) => sig === computedSig);

    if (!isValid) {
      console.error(
        "[Resend Webhook] Signature mismatch. Computed:",
        computedSig.substring(0, 20) + "...",
        "Got signatures:",
        sigParts.length
      );
    }
    return isValid;
  } catch (err: any) {
    console.error("[Resend Webhook] Signature verification exception:", err?.message);
    return false;
  }
}

// Map Resend event type → internal delivery status
const EVENT_STATUS_MAP: Record<string, string> = {
  "email.sent":             "SENT",
  "email.delivered":        "DELIVERED",
  "email.bounced":          "BOUNCED",
  "email.complained":       "COMPLAINED",
  "email.delivery_delayed": "RETRYING",
  "email.clicked":          "DELIVERED", // If clicked, it's definitely delivered
  "email.opened":           "DELIVERED", // If opened, it's definitely delivered
};

export async function POST(request: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await request.text();

    const svixId        = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    const webhookSecret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyResendWebhookSignature(
        rawBody,
        svixId,
        svixTimestamp,
        svixSignature,
        webhookSecret
      );
      if (!isValid) {
        console.error("[Resend Webhook] Rejected — invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("[Resend Webhook] RESEND_WEBHOOK_SECRET not set — signature verification skipped");
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    if (!type || !data) {
      console.warn("[Resend Webhook] Malformed event — missing type or data:", rawBody.substring(0, 200));
      return NextResponse.json({ received: true, warning: "Malformed event" });
    }

    const newStatus = EVENT_STATUS_MAP[type];
    if (!newStatus) {
      console.log(`[Resend Webhook] Unhandled event type: ${type} — ignoring`);
      return NextResponse.json({ received: true });
    }

    // Extract the Resend message ID from the event data
    // Resend sends email_id or id depending on event type
    const messageId: string | undefined = data.email_id || data.id;

    if (messageId) {
      await db.updateDeliveryStatusByMessageId(messageId, newStatus, type);
      console.log(`[Resend Webhook] ✓ ${type} → messageId: ${messageId} → status: ${newStatus}`);
    } else {
      console.warn(`[Resend Webhook] Event ${type} has no messageId in data:`, JSON.stringify(data).substring(0, 200));
    }

    return NextResponse.json({ received: true, type, status: newStatus });
  } catch (err: any) {
    console.error("[Resend Webhook] Processing error:", err?.message || err);
    console.error("[Resend Webhook] Raw body sample:", rawBody.substring(0, 300));
    // Always return 200 to Resend to prevent retry storms on our processing errors
    return NextResponse.json({ received: true, error: "Internal processing error" }, { status: 200 });
  }
}

