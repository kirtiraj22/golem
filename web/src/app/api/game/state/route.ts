import { NextResponse } from "next/server";
import { apiErrorResponse } from "~/lib/api/errors";
import { getSessionWallet } from "~/lib/auth/session";
import {
  applyGameAction,
  GameActionError,
  loadGameState,
} from "~/lib/game/state";
import type { GameAction } from "~/app/game/auction/types";
import { GOOD_IDS, type GoodId } from "~/app/game/simulation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gameErrorResponse(error: unknown) {
  if (error instanceof GameActionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return apiErrorResponse(error, "The auction house ledger could not be read.");
}

function profilePayload(profile: { wallet_address: string; username: string }) {
  return {
    walletAddress: profile.wallet_address,
    username: profile.username,
  };
}

export async function GET() {
  try {
    const wallet = await getSessionWallet();

    if (!wallet) {
      return NextResponse.json(
        { error: "Sign in with your wallet to open the auction ledger." },
        { status: 401 }
      );
    }

    const { profile, state } = await loadGameState(wallet);

    return NextResponse.json({
      profile: profilePayload(profile),
      state,
      serverNow: Date.now(),
    });
  } catch (error) {
    return gameErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const wallet = await getSessionWallet();

    if (!wallet) {
      return NextResponse.json(
        { error: "Sign in with your wallet to use the auction house." },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as {
      action?: string;
      lotId?: unknown;
      amount?: unknown;
      itemId?: unknown;
      goodId?: unknown;
      quantity?: unknown;
      sellerId?: unknown;
      buyerId?: unknown;
      expectedDay?: unknown;
    };

    const expectedDay =
      typeof payload.expectedDay === "number"
        ? payload.expectedDay
        : undefined;

    let action: GameAction;

    if (payload.action === "refresh") {
      action = { action: "refresh" };
    } else if (payload.action === "advance-day") {
      action = { action: "advance-day", expectedDay };
    } else if (payload.action === "fast-forward-week") {
      action = { action: "fast-forward-week", expectedDay };
    } else if (
      payload.action === "start-rumour" &&
      typeof payload.goodId === "string" &&
      (GOOD_IDS as readonly string[]).includes(payload.goodId)
    ) {
      action = {
        action: "start-rumour",
        goodId: payload.goodId as GoodId,
      };
    } else if (
      payload.action === "bid" &&
      typeof payload.lotId === "string" &&
      typeof payload.amount === "number"
    ) {
      action = {
        action: "bid",
        lotId: payload.lotId,
        amount: payload.amount,
      };
    } else if (payload.action === "reveal" && typeof payload.lotId === "string") {
      action = { action: "reveal", lotId: payload.lotId };
    } else if (payload.action === "sell" && typeof payload.itemId === "string") {
      action = {
        action: "sell",
        itemId: payload.itemId,
        buyerId:
          typeof payload.buyerId === "string" ? payload.buyerId : undefined,
      };
    } else if (
      payload.action === "buy-good" &&
      typeof payload.goodId === "string" &&
      typeof payload.quantity === "number"
    ) {
      action = {
        action: "buy-good",
        goodId: payload.goodId as GoodId,
        quantity: payload.quantity,
        sellerId:
          typeof payload.sellerId === "string" ? payload.sellerId : undefined,
      };
    } else if (
      payload.action === "sell-good" &&
      typeof payload.goodId === "string" &&
      typeof payload.quantity === "number"
    ) {
      action = {
        action: "sell-good",
        goodId: payload.goodId as GoodId,
        quantity: payload.quantity,
        buyerId:
          typeof payload.buyerId === "string" ? payload.buyerId : undefined,
      };
    } else {
      return NextResponse.json(
        { error: "That auction action is not valid." },
        { status: 400 }
      );
    }

    const { profile, state } = await applyGameAction(wallet, action);

    return NextResponse.json({
      profile: profilePayload(profile),
      state,
      serverNow: Date.now(),
    });
  } catch (error) {
    return gameErrorResponse(error);
  }
}
