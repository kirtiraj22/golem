"use client";

import localFont from "next/font/local";
import React, { useState } from "react";
import { Alert, Button, Modal, NumberInput, Select } from "@mantine/core";
import { useEconomy } from "../../contexts/economy-context";
import { useMarketUi } from "../../contexts/market-ui-context";
import type {
  GoodDefinition,
  GoodId,
  MerchantState,
  TradeLogEntry,
} from "../../simulation/types";

const pixelFont = localFont({
  src: "../../../fonts/GAMERIA.ttf",
  display: "swap",
  fallback: ["monospace"],
});

const INK = "#2b1a08";
const PAPER = "#fff6d6";
const PAPER_LIGHT = "#fffdf0";
const GOLD = "#f4c95d";
const GREEN = "#a8d98a";

const panelClass =
  "border-4 border-[#2b1a08] bg-[#fff6d6] shadow-[4px_4px_0_#2b1a08]";

const roleLabels: Record<MerchantState["role"], string> = {
  FARMER: "Farmer",
  LUMBERJACK: "Lumberjack",
  BLACKSMITH: "Blacksmith",
};

const pixelLabelStyle: React.CSSProperties = {
  color: INK,
  fontFamily: pixelFont.style.fontFamily,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  lineHeight: 1.5,
  marginBottom: 4,
  textTransform: "uppercase",
};

const pixelInputStyle: React.CSSProperties = {
  background: PAPER_LIGHT,
  border: `3px solid ${INK}`,
  borderRadius: 0,
  color: INK,
  fontFamily: pixelFont.style.fontFamily,
  fontSize: 13,
  height: 40,
  letterSpacing: "0.02em",
  paddingLeft: 10,
};

const pixelOptionStyle: React.CSSProperties = {
  borderRadius: 0,
  color: INK,
  fontFamily: pixelFont.style.fontFamily,
  fontSize: 12,
  letterSpacing: "0.02em",
};

const pixelDropdownStyle: React.CSSProperties = {
  background: PAPER,
  border: `3px solid ${INK}`,
  borderRadius: 0,
  boxShadow: `4px 4px 0 ${INK}`,
  fontFamily: pixelFont.style.fontFamily,
  letterSpacing: "0.03em",
  padding: 4,
};

const pixelComboboxProps = {
  zIndex: 1200,
  withinPortal: true,
  classNames: { dropdown: "market-select-dropdown" },
  styles: { dropdown: pixelDropdownStyle },
};

function pixelButtonStyle(background: string): React.CSSProperties {
  return {
    background,
    border: `3px solid ${INK}`,
    borderRadius: 0,
    boxShadow: `3px 3px 0 ${INK}`,
    color: INK,
    fontFamily: pixelFont.style.fontFamily,
    fontSize: 12,
    fontWeight: 700,
    height: "auto",
    letterSpacing: "0.06em",
    lineHeight: 1.35,
    minHeight: 38,
    padding: "8px 12px",
    textAlign: "center",
    whiteSpace: "normal",
  };
}

function formatInventory(
  inventory: Record<GoodId, number>,
  goods: GoodDefinition[]
): string {
  return goods.map((good) => `${good.name} ${inventory[good.id]}`).join(" · ");
}

function formatTargets(
  merchant: MerchantState,
  goods: GoodDefinition[]
): string {
  const targets = goods
    .filter((good) => (merchant.wants[good.id] ?? 0) > 0)
    .map((good) => `${good.name} ${merchant.wants[good.id]}`);

  return targets.length > 0 ? targets.join(" · ") : "Nothing";
}

// These mirror the constraints used by playerBuy() and playerSell().
// The simulation remains the authority; these are display-only maximums.
function sellableAmount(merchant: MerchantState, goodId: GoodId): number {
  return Math.max(
    0,
    merchant.inventory[goodId] - (merchant.reserves[goodId] ?? 0)
  );
}

function demandCapacity(merchant: MerchantState, goodId: GoodId): number {
  return Math.max(
    0,
    (merchant.wants[goodId] ?? 0) - merchant.inventory[goodId]
  );
}

function affordableQuantity(balance: number, unitPrice: number): number {
  return unitPrice > 0 ? Math.max(0, Math.floor(balance / unitPrice)) : 0;
}

function PixelPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${panelClass} p-3 ${className}`}>{children}</section>
  );
}

const MarketHud = () => {
  const {
    snapshot,
    clock,
    error,
    clearError,
    endDay,
    fastForwardWeek,
    buy,
    sell,
    startRumour,
  } = useEconomy();

  const {
    isOpen,
    selectedMerchantId,
    openMarket,
    closeMarket,
    selectMerchant,
  } = useMarketUi();

  const [goodId, setGoodId] = useState<GoodId>("GRAIN");
  const [quantity, setQuantity] = useState<number | string>(1);

  const selectedGood =
    snapshot.goods.find((good) => good.id === goodId) ?? snapshot.goods[0];
  const selectedMerchant =
    snapshot.merchants.find((merchant) => merchant.id === selectedMerchantId) ??
    snapshot.merchants[0];
  const merchantId = selectedMerchant.id;

  const grainRumourActive = snapshot.activeEvents.some(
    (event) => event.goodId === "GRAIN"
  );

  const latestTrades = snapshot.history
    .filter((entry): entry is TradeLogEntry => entry.type === "TRADE")
    .slice(-10)
    .reverse();

  const actorName = (actorId: string) => {
    if (actorId === "player") {
      return snapshot.player.stall.name;
    }

    return (
      snapshot.merchants.find((merchant) => merchant.id === actorId)?.name ??
      actorId
    );
  };

  const goodName = (entryGoodId: GoodId) =>
    snapshot.goods.find((good) => good.id === entryGoodId)?.name ?? entryGoodId;

  const unitPrice = snapshot.prices[selectedGood.id];
  const tradeQuantity =
    typeof quantity === "number" ? quantity : Number(quantity);

  const buyStock = sellableAmount(selectedMerchant, selectedGood.id);
  const playerAffordable = affordableQuantity(
    snapshot.player.balance,
    unitPrice
  );
  const maxBuy = Math.min(buyStock, playerAffordable);

  const sellDemand = demandCapacity(selectedMerchant, selectedGood.id);
  const merchantAffordable = affordableQuantity(
    selectedMerchant.balance,
    unitPrice
  );
  const maxSell = Math.min(
    snapshot.player.inventory[selectedGood.id],
    sellDemand,
    merchantAffordable
  );

  const buyCost = tradeQuantity > 0 ? tradeQuantity * unitPrice : 0;
  const sellRevenue = tradeQuantity > 0 ? tradeQuantity * unitPrice : 0;

  const otherSellers = snapshot.merchants.filter(
    (merchant) =>
      merchant.id !== selectedMerchant.id &&
      sellableAmount(merchant, selectedGood.id) > 0
  );
  const demandBuyers = snapshot.merchants.filter(
    (merchant) => demandCapacity(merchant, selectedGood.id) > 0
  );

  const buyExplanation =
    buyStock <= 0
      ? `${selectedMerchant.name} has no ${
          selectedGood.name
        } above their reserve.${
          otherSellers.length > 0
            ? ` Try ${otherSellers
                .map((merchant) => merchant.name)
                .join(" or ")}.`
            : ""
        }`
      : playerAffordable <= 0
      ? `You need at least ${unitPrice} coins to buy one ${selectedGood.name}.`
      : "";

  const sellExplanation =
    sellDemand <= 0
      ? `${selectedMerchant.name} already has enough ${
          selectedGood.name
        } and is not buying more.${
          demandBuyers.length > 0
            ? ` Try ${demandBuyers
                .map((merchant) => merchant.name)
                .join(" or ")}.`
            : ` No merchant currently wants ${selectedGood.name}.`
        }`
      : snapshot.player.inventory[selectedGood.id] <= 0
      ? `You have no ${selectedGood.name} to sell.`
      : merchantAffordable <= 0
      ? `${selectedMerchant.name} cannot afford one ${selectedGood.name} right now.`
      : "";

  const handleGoodChange = (value: string | null) => {
    if (!value) {
      return;
    }

    const nextGood = snapshot.goods.find((good) => good.id === value);
    if (nextGood) {
      setGoodId(nextGood.id);
      clearError();
    }
  };

  const handleMerchantChange = (value: string | null) => {
    if (!value) {
      return;
    }

    selectMerchant(value);
    clearError();
  };

  return (
    <>
      <Button
        onClick={() => openMarket()}
        style={{
          ...pixelButtonStyle(GOLD),
          bottom: 16,
          position: "fixed",
          right: 16,
          zIndex: "var(--ui-popup-z-index)",
        }}
      >
        MARKET · DAY {snapshot.day}
      </Button>

      <Modal
        opened={isOpen}
        onClose={closeMarket}
        title="MARKET ROW"
        size="xl"
        centered
        zIndex={1000}
        overlayProps={{ backgroundOpacity: 0.72, blur: 2 }}
        classNames={{
          content:
            "!rounded-none !border-4 !border-[#2b1a08] !bg-[#fff6d6] !p-0 !shadow-[8px_8px_0_rgba(0,0,0,0.45)]",
          header:
            "!m-0 !border-b-4 !border-[#2b1a08] !bg-[#f4c95d] !px-4 !py-3",
          title: "!text-[#2b1a08] !font-bold !uppercase !tracking-[0.12em]",
          close:
            "!border-2 !border-[#2b1a08] !bg-[#fff6d6] !text-[#2b1a08] !rounded-none hover:!bg-[#fffdf0]",
          body: "!bg-[#fff6d6] !p-0 !max-h-[78vh] !overflow-y-auto",
        }}
        styles={{
          content: { fontFamily: pixelFont.style.fontFamily },
          title: { fontFamily: pixelFont.style.fontFamily, fontSize: 18 },
        }}
      >
        <div
          className="market-hud p-3 text-[#2b1a08]"
          style={{
            fontFamily: pixelFont.style.fontFamily,
            letterSpacing: "0.02em",
            lineHeight: 1.45,
          }}
        >
          <PixelPanel className="!bg-[#f8ecc2]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#4a3118]">
                  {snapshot.player.stall.town}
                </p>
                <p className="text-2xl font-bold uppercase">
                  Day {snapshot.day} · {clock.timeLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#4a3118]">
                  Stall
                </p>
                <p className="text-base font-bold">
                  {snapshot.player.stall.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest text-[#4a3118]">
                  Purse
                </p>
                <p className="text-2xl font-bold">
                  {snapshot.player.balance}{" "}
                  <span className="text-[11px] uppercase">coins</span>
                </p>
              </div>
            </div>
          </PixelPanel>

          {error && (
            <Alert
              color="red"
              variant="default"
              title="TRADE BLOCKED"
              withCloseButton
              closeButtonLabel="Dismiss trade error"
              onClose={clearError}
              classNames={{
                root: "!mt-3 !rounded-none !border-4 !border-[#2b1a08] !bg-[#ffd8cc] !text-[#2b1a08] !shadow-[4px_4px_0_#2b1a08]",
                title: "!font-bold !uppercase",
                message: "!text-[#2b1a08]",
              }}
            >
              {error}
            </Alert>
          )}

          {snapshot.validationErrors.length > 0 && (
            <Alert
              color="yellow"
              variant="default"
              title="SIMULATION WARNING"
              classNames={{
                root: "!mt-3 !rounded-none !border-4 !border-[#2b1a08] !bg-[#fff0b8] !text-[#2b1a08] !shadow-[4px_4px_0_#2b1a08]",
                title: "!font-bold !uppercase",
                message: "!text-[#2b1a08]",
              }}
            >
              {snapshot.validationErrors.join(" ")}
            </Alert>
          )}

          {snapshot.activeEvents.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.activeEvents.map((event) => (
                <span
                  key={event.id}
                  className="border-2 border-[#2b1a08] bg-[#ffcf70] px-2 py-1 text-[11px] font-bold uppercase shadow-[2px_2px_0_#2b1a08]"
                >
                  {event.goodId} demand ×{event.demandMultiplier.toFixed(2)} ·{" "}
                  {event.remainingDays} day
                  {event.remainingDays === 1 ? "" : "s"} left
                </span>
              ))}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold uppercase">Goods</h2>
              <p className="text-[11px] uppercase text-[#4a3118]">
                Prices react to stock and demand
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {snapshot.goods.map((good) => {
                const isSelected = good.id === selectedGood.id;
                const demand = snapshot.demandMultipliers[good.id];

                return (
                  <button
                    key={good.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleGoodChange(good.id)}
                    className={`border-4 p-3 text-left shadow-[3px_3px_0_#2b1a08] ${
                      isSelected
                        ? "border-[#2b1a08] bg-[#f4c95d]"
                        : "border-[#8b6b3f] bg-[#fffdf0] hover:bg-[#f8ecc2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-base font-bold uppercase">
                        {good.name}
                      </span>
                      {demand > 1 && (
                        <span className="border-2 border-[#2b1a08] bg-[#ffcf70] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          ×{demand.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {snapshot.prices[good.id]}{" "}
                      <span className="text-[11px] uppercase">coins</span>
                    </p>
                    <div className="mt-2 space-y-1 text-[11px] font-medium uppercase leading-snug text-[#4a3118]">
                      <p>Market stock {snapshot.marketStock[good.id]}</p>
                      <p>Your stock {snapshot.player.inventory[good.id]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <h2 className="mb-2 text-lg font-bold uppercase">Merchants</h2>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {snapshot.merchants.map((merchant) => {
                const isSelected = merchant.id === merchantId;

                return (
                  <button
                    key={merchant.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleMerchantChange(merchant.id)}
                    className={`border-4 p-3 text-left shadow-[3px_3px_0_#2b1a08] ${
                      isSelected
                        ? "border-[#2b1a08] bg-[#f4c95d]"
                        : "border-[#8b6b3f] bg-[#fffdf0] hover:bg-[#f8ecc2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold">{merchant.name}</p>
                        <p className="text-[10px] uppercase tracking-widest text-[#4a3118]">
                          {roleLabels[merchant.role]}
                        </p>
                      </div>
                      <span className="border-2 border-[#2b1a08] bg-[#fff6d6] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {isSelected ? "Selected" : "Choose"}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] font-bold">
                      Purse {merchant.balance} coins
                    </p>
                    <p className="mt-1 break-words text-[11px] leading-snug text-[#4a3118]">
                      Stock{" "}
                      {formatInventory(merchant.inventory, snapshot.goods)}
                    </p>
                    <p className="break-words text-[11px] leading-snug text-[#4a3118]">
                      Targets {formatTargets(merchant, snapshot.goods)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <PixelPanel className="mt-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold uppercase">Trade desk</h2>
              <p className="text-[11px] uppercase text-[#4a3118]">
                Choose one good and one merchant
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Select
                label="Good"
                value={goodId}
                onChange={handleGoodChange}
                allowDeselect={false}
                comboboxProps={pixelComboboxProps}
                data={snapshot.goods.map((good) => ({
                  value: good.id,
                  label: `${good.name} — ${snapshot.prices[good.id]} coins`,
                }))}
                styles={{
                  label: pixelLabelStyle,
                  input: pixelInputStyle,
                  option: pixelOptionStyle,
                }}
              />

              <Select
                label="Merchant"
                value={merchantId}
                onChange={handleMerchantChange}
                allowDeselect={false}
                comboboxProps={pixelComboboxProps}
                data={snapshot.merchants.map((merchant) => ({
                  value: merchant.id,
                  label: `${merchant.name} (${merchant.balance} coins)`,
                }))}
                styles={{
                  label: pixelLabelStyle,
                  input: pixelInputStyle,
                  option: pixelOptionStyle,
                }}
              />

              <NumberInput
                label="Quantity"
                value={quantity}
                onChange={setQuantity}
                min={1}
                step={1}
                allowDecimal={false}
                styles={{
                  label: pixelLabelStyle,
                  input: pixelInputStyle,
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="border-4 border-[#2b1a08] bg-[#dff3d2] p-3 shadow-[3px_3px_0_#2b1a08]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold uppercase">Buy</h3>
                  <span className="border-2 border-[#2b1a08] bg-[#fff6d6] px-2 py-0.5 text-[10px] font-bold uppercase">
                    Merchant → You
                  </span>
                </div>

                <p className="mt-2 text-[12px] font-bold">
                  From {selectedMerchant.name}
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="border-2 border-[#2b1a08] bg-[#fffdf0] p-2">
                    <p className="text-[10px] uppercase text-[#4a3118]">
                      Stock for sale
                    </p>
                    <p className="text-xl font-bold">{buyStock}</p>
                  </div>
                  <div className="border-2 border-[#2b1a08] bg-[#fffdf0] p-2">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] uppercase text-[#4a3118]">
                        Max you can buy
                      </p>
                      <button
                        type="button"
                        disabled={maxBuy < 1}
                        onClick={() => setQuantity(maxBuy)}
                        className="border-2 border-[#2b1a08] bg-[#f4c95d] px-1.5 py-0.5 text-[10px] font-bold uppercase shadow-[2px_2px_0_#2b1a08] disabled:cursor-not-allowed disabled:bg-[#d8cdb5] disabled:text-[#4a3118] disabled:opacity-100 disabled:shadow-[2px_2px_0_#6d5a44]"
                      >
                        Max
                      </button>
                    </div>
                    <p className="text-xl font-bold">{maxBuy}</p>
                  </div>
                </div>

                <p className="mt-2 text-[11px] uppercase text-[#4a3118]">
                  Price {unitPrice} coins each
                  {tradeQuantity > 0 ? ` · Cost ${buyCost} coins` : ""}
                </p>

                <Button
                  disabled={maxBuy < 1}
                  onClick={() =>
                    buy(selectedGood.id, tradeQuantity, selectedMerchant.id)
                  }
                  styles={{
                    root: { ...pixelButtonStyle(GREEN), width: "100%" },
                  }}
                  className="mt-2"
                >
                  BUY {selectedGood.name.toUpperCase()} FROM{" "}
                  {selectedMerchant.name.toUpperCase()}
                </Button>

                {buyExplanation && (
                  <p className="mt-2 border-2 border-[#2b1a08] bg-[#fff6d6] p-2 text-[11px] leading-relaxed">
                    {buyExplanation}
                  </p>
                )}
              </div>

              <div className="border-4 border-[#2b1a08] bg-[#f9e3b0] p-3 shadow-[3px_3px_0_#2b1a08]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold uppercase">Sell</h3>
                  <span className="border-2 border-[#2b1a08] bg-[#fff6d6] px-2 py-0.5 text-[10px] font-bold uppercase">
                    You → Merchant
                  </span>
                </div>

                <p className="mt-2 text-[12px] font-bold">
                  To {selectedMerchant.name}
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="border-2 border-[#2b1a08] bg-[#fffdf0] p-2">
                    <p className="text-[10px] uppercase text-[#4a3118]">
                      Remaining demand
                    </p>
                    <p className="text-xl font-bold">{sellDemand}</p>
                  </div>
                  <div className="border-2 border-[#2b1a08] bg-[#fffdf0] p-2">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] uppercase text-[#4a3118]">
                        Max you can sell
                      </p>
                      <button
                        type="button"
                        disabled={maxSell < 1}
                        onClick={() => setQuantity(maxSell)}
                        className="border-2 border-[#2b1a08] bg-[#f4c95d] px-1.5 py-0.5 text-[10px] font-bold uppercase shadow-[2px_2px_0_#2b1a08] disabled:cursor-not-allowed disabled:bg-[#d8cdb5] disabled:text-[#4a3118] disabled:opacity-100 disabled:shadow-[2px_2px_0_#6d5a44]"
                      >
                        Max
                      </button>
                    </div>
                    <p className="text-xl font-bold">{maxSell}</p>
                  </div>
                </div>

                <p className="mt-2 text-[11px] uppercase text-[#4a3118]">
                  Price {unitPrice} coins each
                  {tradeQuantity > 0 ? ` · Earn ${sellRevenue} coins` : ""}
                </p>

                <Button
                  disabled={maxSell < 1}
                  onClick={() =>
                    sell(selectedGood.id, tradeQuantity, selectedMerchant.id)
                  }
                  styles={{
                    root: { ...pixelButtonStyle(GOLD), width: "100%" },
                  }}
                  className="mt-2"
                >
                  SELL {selectedGood.name.toUpperCase()} TO{" "}
                  {selectedMerchant.name.toUpperCase()}
                </Button>

                {sellExplanation && (
                  <p className="mt-2 border-2 border-[#2b1a08] bg-[#fff6d6] p-2 text-[11px] leading-relaxed">
                    {sellExplanation}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 border-t-2 border-[#8b6b3f] pt-2 text-[11px] uppercase text-[#4a3118]">
              Buy moves goods from the merchant to you. Sell moves goods from
              you to the merchant.
            </p>
          </PixelPanel>

          <PixelPanel className="mt-4">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold uppercase">Economy</h2>
              <p className="text-[11px] uppercase text-[#4a3118]">
                Automatic market days · manual controls
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                onClick={endDay}
                styles={{ root: pixelButtonStyle(GOLD) }}
              >
                ADVANCE DAY
              </Button>
              <Button
                variant="default"
                onClick={fastForwardWeek}
                styles={{ root: pixelButtonStyle(GOLD) }}
              >
                FAST-FORWARD 7 DAYS
              </Button>
              <Button
                variant="default"
                color="orange"
                onClick={startRumour}
                disabled={grainRumourActive}
                styles={{ root: pixelButtonStyle("#ffcf70") }}
              >
                START GRAIN RUMOUR
              </Button>
            </div>
          </PixelPanel>

          <PixelPanel className="mt-4">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold uppercase">Latest trades</h2>
              <p className="text-[11px] uppercase text-[#4a3118]">
                Most recent 10
              </p>
            </div>

            {latestTrades.length === 0 ? (
              <p className="border-2 border-[#8b6b3f] bg-[#fffdf0] p-3 text-[12px] leading-relaxed">
                No trades yet. Advance a day to let the merchants trade.
              </p>
            ) : (
              <div className="space-y-1.5">
                {latestTrades.map((trade) => {
                  const involvesPlayer =
                    trade.buyerId === "player" || trade.sellerId === "player";

                  return (
                    <div
                      key={trade.id}
                      className="break-words border-2 border-[#8b6b3f] bg-[#fffdf0] px-3 py-2 text-[12px] leading-relaxed"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`border-2 border-[#2b1a08] px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              involvesPlayer ? "bg-[#f4c95d]" : "bg-[#d9d0c0]"
                            }`}
                          >
                            {involvesPlayer ? "Player" : "NPC"}
                          </span>
                          <span className="text-[11px] uppercase text-[#4a3118]">
                            Day {trade.day} · {trade.timestamp.slice(11, 16)}
                          </span>
                        </div>
                        <span className="font-bold tabular-nums">
                          {trade.quantity} × {goodName(trade.goodId)} @{" "}
                          {trade.unitPrice} = {trade.totalPrice} coins
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-[#4a3118]">
                        {actorName(trade.buyerId)} bought from{" "}
                        {actorName(trade.sellerId)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </PixelPanel>
        </div>
      </Modal>
    </>
  );
};

export default MarketHud;
