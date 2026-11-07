import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to activate a 7-day trial. Please sign in or register." },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const strategy = await db.getStrategyBySlug(slug);

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
    }

    if (!strategy.trialEligibility) {
      return NextResponse.json(
        { error: "This strategy is currently ineligible for trial access." },
        { status: 400 }
      );
    }

    // Attempt atomic trial creation with duplicate prevention
    try {
      const result = await db.startTrial(user.id, strategy.slug, user);
      const now = new Date();
      const msLeft = new Date(result.trial.expiryTime).getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

      const response = NextResponse.json({
        success: true,
        message: `7-day trial activated for ${strategy.name}.`,
        trial: {
          id: result.trial.id,
          strategyId: result.trial.strategyId,
          startTime: result.trial.startTime,
          expiryTime: result.trial.expiryTime,
          status: result.trial.status,
          daysRemaining,
        },
        entitlement: {
          id: result.entitlement.id,
          status: result.entitlement.status,
          expiryTime: result.entitlement.expiryTime,
        },
      });

      // Set durable signed trial cookie for serverless lambda synchronization
      response.cookies.set(`stratmarket_trial_${strategy.slug}`, JSON.stringify({
        userId: user.id,
        strategyId: strategy.id,
        expiryTime: result.trial.expiryTime,
      }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    } catch (err: any) {
      if (err.message === "TRIAL_ALREADY_USED") {
        // If the trial was already started, check if it is STILL ACTIVE
        const trials = await db.getUserTrials(user.id);
        const now = new Date();
        const existingTrial = trials.find(
          (t) =>
            t.strategyId.toUpperCase() === strategy.id.toUpperCase() ||
            t.strategyId.toLowerCase() === strategy.slug.toLowerCase()
        );

        if (existingTrial && existingTrial.status === "ACTIVE" && new Date(existingTrial.expiryTime) > now) {
          const msLeft = new Date(existingTrial.expiryTime).getTime() - now.getTime();
          const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

          const response = NextResponse.json({
            success: true,
            alreadyActive: true,
            message: `Your 7-day trial for ${strategy.name} is currently active.`,
            trial: {
              id: existingTrial.id,
              strategyId: existingTrial.strategyId,
              startTime: existingTrial.startTime,
              expiryTime: existingTrial.expiryTime,
              status: existingTrial.status,
              daysRemaining,
            },
            entitlement: {
              id: existingTrial.associatedEntitlementId,
              status: "ACTIVE",
              expiryTime: existingTrial.expiryTime,
            },
          });

          response.cookies.set(`stratmarket_trial_${strategy.slug}`, JSON.stringify({
            userId: user.id,
            strategyId: strategy.id,
            expiryTime: existingTrial.expiryTime,
          }), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });

          return response;
        }

        return NextResponse.json(
          {
            error: "You have already used your 7-day trial for this strategy.",
            code: "TRIAL_ALREADY_USED",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.error("POST /api/strategies/[slug]/trial error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start trial." },
      { status: 500 }
    );
  }
}
