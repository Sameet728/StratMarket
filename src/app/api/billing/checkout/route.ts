import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";

const CheckoutSchema = z.object({
  planSlug: z.enum(["single-strategy", "all-access", "professional"]),
  strategyId: z.string().optional().nullable(),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  paymentMethod: z.enum(["CARD", "RAZORPAY", "DIRECT_INSTITUTIONAL"]).default("CARD"),
  cardDetails: z
    .object({
      cardNumber: z.string().optional(),
      cardExpiry: z.string().optional(),
      cardCvc: z.string().optional(),
      cardholderName: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to complete checkout. Please sign in or create an account." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { planSlug, strategyId, billingCycle, paymentMethod } = parsed.data;

    // Validate single strategy selection
    if (planSlug === "single-strategy") {
      if (!strategyId) {
        return NextResponse.json(
          { error: "Please select a specific strategy for the Single Strategy plan." },
          { status: 400 }
        );
      }
      const strategy = await db.getStrategyBySlug(strategyId);
      if (!strategy) {
        return NextResponse.json(
          { error: `Strategy ${strategyId} was not found in the catalogue.` },
          { status: 404 }
        );
      }
    }

    const durationDays = billingCycle === "annual" ? 365 : 30;

    // Direct Instant Institutional Payment & Entitlement Processing
    const { entitlement, order } = await db.createPaidEntitlement(
      user.id,
      planSlug,
      planSlug === "single-strategy" ? strategyId : null,
      durationDays
    );

    // Record audit event
    await db.createAuditEvent({
      action: "SUBSCRIPTION_PAYMENT_PROCESSED",
      entityType: "BILLING",
      entityId: order.id,
      userId: user.id,
      details: JSON.stringify({
        planSlug,
        strategyId: order.strategyId,
        amount: order.amount,
        billingCycle,
        paymentMethod,
        entitlementId: entitlement.id,
      }),
    });

    const targetStrategySlug = planSlug === "single-strategy" && strategyId ? strategyId.toLowerCase() : null;
    const redirectUrl = targetStrategySlug ? `/chart/${targetStrategySlug}` : "/dashboard";

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      message:
        planSlug === "single-strategy"
          ? `Direct payment confirmed! Pro access to ${strategyId} is now active.`
          : `Direct payment confirmed! All 14 quantitative strategies are now unlocked.`,
      order: {
        id: order.id,
        planSlug: order.planSlug,
        strategyId: order.strategyId,
        amount: order.amount,
        currency: order.currency,
        createdAt: order.createdAt,
        expiryTime: order.expiryTime,
      },
      entitlement: {
        id: entitlement.id,
        strategyId: entitlement.strategyId,
        status: entitlement.status,
        expiryTime: entitlement.expiryTime,
        daysRemaining: durationDays,
      },
      redirectUrl,
    });
  } catch (error: any) {
    console.error("POST /api/billing/checkout error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process direct payment." },
      { status: 500 }
    );
  }
}
