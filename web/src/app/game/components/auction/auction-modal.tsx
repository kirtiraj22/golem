// "use client";

// import localFont from "next/font/local";
// import React, { useEffect, useMemo, useState } from "react";
// import { Modal } from "@mantine/core";
// import { useAuction } from "../../contexts/auction-context";
// import {
//   CATEGORY_LABELS,
//   RARITY_COLORS,
//   RARITY_LABELS,
//   itemConditionLabel,
//   saleValue,
//   type InventoryItem,
//   type StorageLot,
// } from "../../auction/types";
// import {
//   formatCoins,
//   formatCountdown,
//   haulValue,
//   lotPhaseLabel,
//   lotStatusColor,
//   lotStatusLabel,
//   shortWallet,
// } from "../../auction/format";

// const pixelFont = localFont({
//   src: "../../../fonts/GAMERIA.ttf",
//   display: "swap",
//   fallback: ["monospace"],
// });

// const INK = "#2b1a08";
// const PAPER = "#fff6d6";
// const PAPER_LIGHT = "#fffdf0";
// const GOLD = "#f4c95d";
// const GREEN = "#a8d98a";
// const RED = "#ffd8cc";
// const MUTED = "#4a3118";

// const panelClass =
//   "border-4 border-[#2b1a08] bg-[#fff6d6] shadow-[4px_4px_0_#2b1a08]";

// const labelStyle: React.CSSProperties = {
//   color: MUTED,
//   fontFamily: pixelFont.style.fontFamily,
//   fontSize: 10,
//   fontWeight: 700,
//   letterSpacing: "0.1em",
//   lineHeight: 1.5,
//   textTransform: "uppercase",
// };

// const tabStyle: React.CSSProperties = {
//   border: `3px solid ${INK}`,
//   borderRadius: 0,
//   boxShadow: `3px 3px 0 ${INK}`,
//   color: INK,
//   cursor: "pointer",
//   fontFamily: pixelFont.style.fontFamily,
//   fontSize: 11,
//   fontWeight: 700,
//   letterSpacing: "0.05em",
//   padding: "8px 12px",
//   textTransform: "uppercase",
// };

// function buttonStyle(background: string, disabled = false): React.CSSProperties {
//   return {
//     background: disabled ? "#d8cdb5" : background,
//     border: `3px solid ${INK}`,
//     borderRadius: 0,
//     boxShadow: `3px 3px 0 ${disabled ? "#6d5a44" : INK}`,
//     color: disabled ? MUTED : INK,
//     cursor: disabled ? "not-allowed" : "pointer",
//     fontFamily: pixelFont.style.fontFamily,
//     fontSize: 11,
//     fontWeight: 700,
//     letterSpacing: "0.04em",
//     lineHeight: 1.35,
//     opacity: 1,
//     padding: "8px 12px",
//     textTransform: "uppercase",
//   };
// }

// function useNow(intervalMs = 1_000): number {
//   const [now, setNow] = useState(() => Date.now());

//   useEffect(() => {
//     const timer = setInterval(() => setNow(Date.now()), intervalMs);
//     return () => clearInterval(timer);
//   }, [intervalMs]);

//   return now;
// }

// function Panel({
//   children,
//   className = "",
//   background = PAPER,
// }: {
//   children: React.ReactNode;
//   className?: string;
//   background?: string;
// }) {
//   return (
//     <section
//       className={`${panelClass} p-3 ${className}`}
//       style={{ background }}
//     >
//       {children}
//     </section>
//   );
// }

// function Badge({
//   children,
//   background = PAPER,
// }: {
//   children: React.ReactNode;
//   background?: string;
// }) {
//   return (
//     <span
//       className="border-2 border-[#2b1a08] px-1.5 py-0.5 text-[10px] font-bold uppercase"
//       style={{ background, fontFamily: pixelFont.style.fontFamily }}
//     >
//       {children}
//     </span>
//   );
// }

// function Silhouettes({ lot }: { lot: StorageLot }) {
//   return (
//     <div className="flex flex-wrap gap-1.5">
//       {lot.silhouettes.map((silhouette) => (
//         <span
//           key={silhouette.category}
//           className="border-2 border-[#2b1a08] bg-[#eee4c9] px-1.5 py-1 text-[15px] leading-none"
//           title={`${silhouette.label} shape`}
//         >
//           <span style={{ filter: "grayscale(1) brightness(0.35)" }}>
//             {silhouette.icon}
//           </span>
//           <span
//             className="ml-1 align-middle text-[8px] font-bold uppercase"
//             style={{ fontFamily: pixelFont.style.fontFamily }}
//           >
//             {silhouette.label}
//           </span>
//         </span>
//       ))}
//     </div>
//   );
// }

// function LotCard({
//   lot,
//   now,
//   selected,
//   onSelect,
// }: {
//   lot: StorageLot;
//   now: number;
//   selected: boolean;
//   onSelect: () => void;
// }) {
//   const status = lotStatusLabel(lot);

//   return (
//     <button
//       type="button"
//       onClick={onSelect}
//       aria-pressed={selected}
//       className="relative w-full border-4 p-3 text-left shadow-[3px_3px_0_#2b1a08] transition-transform hover:-translate-y-0.5"
//       style={{
//         background: selected ? "#f8ecc2" : PAPER_LIGHT,
//         borderColor: selected ? INK : "#8b6b3f",
//         color: INK,
//         fontFamily: pixelFont.style.fontFamily,
//       }}
//     >
//       <div className="flex items-start justify-between gap-2">
//         <div>
//           <p className="text-[9px] uppercase tracking-[0.12em]" style={labelStyle}>
//             Lot {String(lot.listingNumber).padStart(2, "0")} · {lot.unitNumber}
//           </p>
//           <p className="mt-1 text-[15px] font-bold uppercase leading-tight">
//             {lot.title}
//           </p>
//         </div>
//         <Badge background={lotStatusColor(lot)}>{status}</Badge>
//       </div>

//       <p className="mt-1 text-[9px] uppercase leading-snug" style={labelStyle}>
//         {lot.facility} · {lot.sizeLabel}
//       </p>

//       <div className="mt-2">
//         <Silhouettes lot={lot} />
//       </div>

//       <p className="mt-2 line-clamp-2 text-[10px] leading-snug">
//         {lot.previewClues[0]}
//       </p>

//       <div className="mt-2 flex items-end justify-between gap-2 border-t-2 border-[#d8c9a6] pt-2">
//         <div>
//           <p className="text-[8px] uppercase" style={labelStyle}>
//             Current bid
//           </p>
//           <p className="text-lg font-bold leading-none">
//             {formatCoins(lot.currentBid)}c
//           </p>
//         </div>
//         <div className="text-right">
//           <p className="text-[8px] uppercase" style={labelStyle}>
//             {lot.status === "preview" || lot.status === "live"
//               ? "Clock"
//               : "Result"}
//           </p>
//           <p className="text-[10px] font-bold uppercase">
//             {lotPhaseLabel(lot, now)}
//           </p>
//         </div>
//       </div>

//       {lot.playerBid > 0 && lot.status === "live" && (
//         <p
//           className="mt-2 border-2 border-[#2b1a08] px-2 py-1 text-[9px] font-bold uppercase"
//           style={{ background: lot.isLeading ? GREEN : "#ffcf70" }}
//         >
//           {lot.isLeading
//             ? `You lead at ${lot.playerBid}c`
//             : `Outbid · your ${lot.playerBid}c is held`}
//         </p>
//       )}
//     </button>
//   );
// }

// function ItemRow({
//   item,
//   multipliers,
//   busy,
//   onSell,
// }: {
//   item: InventoryItem;
//   multipliers: Record<string, number>;
//   busy: boolean;
//   onSell: () => void;
// }) {
//   const value = saleValue(
//     item,
//     multipliers as Parameters<typeof saleValue>[1]
//   );

//   return (
//     <div className="flex items-start gap-3 border-4 border-[#8b6b3f] bg-[#fffdf0] p-3 shadow-[3px_3px_0_#2b1a08]">
//       <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#2b1a08] bg-[#f8ecc2] text-2xl">
//         {item.icon}
//       </div>
//       <div className="min-w-0 flex-1">
//         <div className="flex flex-wrap items-start justify-between gap-1">
//           <div>
//             <p className="text-[13px] font-bold uppercase leading-tight">
//               {item.name}
//             </p>
//             <p className="mt-0.5 text-[9px] uppercase" style={labelStyle}>
//               {CATEGORY_LABELS[item.category]} · {itemConditionLabel(item.condition)} ·
//               from lot #{item.sourceListing}
//             </p>
//           </div>
//           <Badge background={RARITY_COLORS[item.rarity]}>
//             <span
//               style={{
//                 color: item.rarity === "common" ? INK : "#fff6d6",
//               }}
//             >
//               {RARITY_LABELS[item.rarity]}
//             </span>
//           </Badge>
//         </div>
//         <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
//           <p className="text-[12px] font-bold">
//             Estimated sale{" "}
//             <span className="text-lg">{formatCoins(value)}c</span>
//           </p>
//           <button
//             type="button"
//             disabled={busy}
//             onClick={onSell}
//             style={buttonStyle(GOLD, busy)}
//           >
//             Sell to Marla
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function LotDetail({ lot, now }: { lot: StorageLot; now: number }) {
//   const { busy, placeBid, revealLot } = useAuction();
//   const [bid, setBid] = useState(0);
//   const minBid = lot.currentBid + 1;
//   const held = lot.playerBid;
//   const additional = Math.max(0, bid - held);
//   const canBid =
//     lot.status === "live" &&
//     !busy &&
//     Number.isInteger(bid) &&
//     bid >= minBid &&
//     additional >= 0;

//   useEffect(() => {
//     setBid(Math.max(lot.currentBid + 10, lot.startingBid));
//   }, [lot.id]);

//   const raiseBy = (amount: number) => {
//     setBid((current) => Math.max(minBid, current + amount));
//   };

//   return (
//     <Panel background="#f8ecc2">
//       <div className="flex items-start justify-between gap-2">
//         <div>
//           <p className="text-[9px] uppercase tracking-[0.12em]" style={labelStyle}>
//             Lot {String(lot.listingNumber).padStart(2, "0")} · {lot.unitNumber}
//           </p>
//           <h3 className="mt-1 text-xl font-bold uppercase leading-tight">
//             {lot.title}
//           </h3>
//           <p className="mt-1 text-[10px] uppercase" style={labelStyle}>
//             {lot.facility} · {lot.sizeLabel}
//           </p>
//         </div>
//         <Badge background={lotStatusColor(lot)}>{lotStatusLabel(lot)}</Badge>
//       </div>

//       <div className="mt-3 border-4 border-[#2b1a08] bg-[#fffdf0] p-3">
//         <div className="flex flex-wrap items-end justify-between gap-2">
//           <div>
//             <p className="text-[9px] uppercase" style={labelStyle}>
//               {lot.status === "live"
//                 ? "Time on the block"
//                 : lot.status === "preview"
//                 ? "Preview ends"
//                 : "Lot closed"}
//             </p>
//             <p className="text-2xl font-bold leading-none">
//               {lot.status === "preview"
//                 ? formatCountdown(Date.parse(lot.previewEndsAt) - now)
//                 : lot.status === "live"
//                 ? formatCountdown(Date.parse(lot.endsAt) - now)
//                 : lotPhaseLabel(lot, now)}
//             </p>
//           </div>
//           <div className="text-right">
//             <p className="text-[9px] uppercase" style={labelStyle}>
//               Current bid
//             </p>
//             <p className="text-2xl font-bold leading-none">
//               {formatCoins(lot.currentBid)}c
//             </p>
//           </div>
//         </div>
//       </div>

//       <div className="mt-3 grid grid-cols-2 gap-2">
//         <div className="border-2 border-[#2b1a08] bg-[#fffdf0] p-2">
//           <p className="text-[9px] uppercase" style={labelStyle}>
//             {lot.rivalName}
//           </p>
//           <p className="text-lg font-bold">{formatCoins(lot.rivalBid)}c</p>
//         </div>
//         <div
//           className="border-2 border-[#2b1a08] p-2"
//           style={{ background: lot.isLeading ? GREEN : "#ffcf70" }}
//         >
//           <p className="text-[9px] uppercase" style={labelStyle}>
//             Your bid
//           </p>
//           <p className="text-lg font-bold">
//             {lot.playerBid > 0 ? `${formatCoins(lot.playerBid)}c` : "—"}
//           </p>
//         </div>
//       </div>

//       <div className="mt-3">
//         <p className="mb-1 text-[9px] uppercase" style={labelStyle}>
//           Preview clues
//         </p>
//         <ul className="space-y-1">
//           {lot.previewClues.map((clue) => (
//             <li
//               key={clue}
//               className="border-l-4 border-[#8b6b3f] bg-[#fffdf0] px-2 py-1 text-[10px] leading-snug"
//             >
//               {clue}
//             </li>
//           ))}
//         </ul>
//       </div>

//       <div className="mt-3">
//         <p className="mb-1 text-[9px] uppercase" style={labelStyle}>
//           Shapes in the unit
//         </p>
//         <Silhouettes lot={lot} />
//       </div>

//       {lot.status === "preview" && (
//         <div className="mt-3 border-4 border-[#2b1a08] bg-[#fff0b8] p-3 text-[10px] leading-relaxed">
//           The preview is open. Bidding starts when the clock hits zero. Keep this
//           panel open; the ledger refreshes automatically.
//         </div>
//       )}

//       {lot.status === "live" && (
//         <div className="mt-3 border-4 border-[#2b1a08] bg-[#fffdf0] p-3">
//           <div className="flex flex-wrap items-end justify-between gap-2">
//             <div>
//               <p className="text-[9px] uppercase" style={labelStyle}>
//                 Place a bid
//               </p>
//               <p className="text-[10px]">
//                 Minimum {formatCoins(minBid)}c · rival holds{" "}
//                 {formatCoins(lot.rivalBid)}c
//               </p>
//             </div>
//             {lot.playerBid > 0 && (
//               <Badge background={lot.isLeading ? GREEN : "#ffcf70"}>
//                 {lot.isLeading ? "Leading" : "Outbid"}
//               </Badge>
//             )}
//           </div>

//           <div className="mt-2 flex flex-wrap items-center gap-2">
//             <input
//               aria-label="Bid amount in coins"
//               type="number"
//               min={minBid}
//               step={1}
//               value={bid}
//               onChange={(event) => setBid(Number(event.target.value))}
//               className="h-10 w-28 border-[3px] border-[#2b1a08] bg-[#fff6d6] px-2 text-base font-bold outline-none"
//               style={{ fontFamily: pixelFont.style.fontFamily }}
//             />
//             {[10, 25, 50].map((amount) => (
//               <button
//                 key={amount}
//                 type="button"
//                 onClick={() => raiseBy(amount)}
//                 style={buttonStyle("#fff6d6")}
//               >
//                 +{amount}c
//               </button>
//             ))}
//           </div>

//           <p className="mt-2 text-[9px] uppercase leading-snug" style={labelStyle}>
//             {held > 0
//               ? `${formatCoins(held)}c is already held on this lot. A raise takes ${formatCoins(
//                   additional
//                 )}c more from your purse.`
//               : "The full bid is held in escrow until the lot closes."}
//           </p>

//           <button
//             type="button"
//             disabled={!canBid}
//             onClick={() => void placeBid(lot.id, bid)}
//             style={{ ...buttonStyle(GREEN, !canBid), width: "100%", marginTop: 8 }}
//           >
//             {busy ? "Sending bid…" : `Bid ${formatCoins(bid)}c`}
//           </button>
//         </div>
//       )}

//       {lot.status === "won" && (
//         <div className="mt-3 border-4 border-[#2b1a08] bg-[#dff3d2] p-3">
//           <div className="flex flex-wrap items-center justify-between gap-2">
//             <div>
//               <p className="text-[11px] font-bold uppercase">
//                 Hammer price {formatCoins(lot.paidPrice ?? 0)}c
//               </p>
//               <p className="text-[9px] uppercase" style={labelStyle}>
//                 {lot.revealStatus === "revealed"
//                   ? "The vault is open"
//                   : "The vault is yours to open"}
//               </p>
//             </div>
//             <Badge background={lot.revealStatus === "revealed" ? GREEN : GOLD}>
//               {lot.revealStatus}
//             </Badge>
//           </div>

//           {lot.revealStatus === "ready" && (
//             <>
//               <p className="mt-2 text-[10px] leading-relaxed">
//                 The lock has been released. Open the unit to log its contents
//                 into your haul.
//               </p>
//               <button
//                 type="button"
//                 disabled={busy}
//                 onClick={() => void revealLot(lot.id)}
//                 style={{ ...buttonStyle(GOLD, busy), width: "100%", marginTop: 8 }}
//               >
//                 {busy ? "Opening vault…" : "Open the vault"}
//               </button>
//             </>
//           )}

//           {lot.revealStatus === "pending" && (
//             <p className="mt-2 border-2 border-[#2b1a08] bg-[#fff0b8] p-2 text-[10px] leading-relaxed">
//               The tumbler is turning. This panel refreshes automatically when the
//               contents are logged.
//             </p>
//           )}

//           {lot.revealStatus === "failed" && (
//             <>
//               <p className="mt-2 border-2 border-[#2b1a08] bg-[#ffd8cc] p-2 text-[10px] leading-relaxed">
//                 {lot.revealError ?? "The lock jammed. Try the vault again."}
//               </p>
//               <button
//                 type="button"
//                 disabled={busy}
//                 onClick={() => void revealLot(lot.id)}
//                 style={{ ...buttonStyle(GOLD, busy), width: "100%", marginTop: 8 }}
//               >
//                 Retry the vault
//               </button>
//             </>
//           )}

//           {lot.revealStatus === "revealed" && lot.contents && (
//             <div className="mt-2 space-y-1.5">
//               {lot.contents.map((item) => (
//                 <div
//                   key={item.id}
//                   className="flex items-center gap-2 border-2 border-[#8b6b3f] bg-[#fffdf0] px-2 py-1.5"
//                 >
//                   <span className="text-lg">{item.icon}</span>
//                   <div className="min-w-0 flex-1">
//                     <p className="truncate text-[11px] font-bold uppercase">
//                       {item.name}
//                     </p>
//                     <p className="text-[8px] uppercase" style={labelStyle}>
//                       {itemConditionLabel(item.condition)} ·{" "}
//                       {RARITY_LABELS[item.rarity]}
//                     </p>
//                   </div>
//                 </div>
//               ))}
//               <p className="text-[9px] uppercase" style={labelStyle}>
//                 All contents are now in your haul.
//               </p>
//             </div>
//           )}
//         </div>
//       )}

//       {lot.status === "lost" && (
//         <div className="mt-3 border-4 border-[#2b1a08] bg-[#ffd8cc] p-3 text-[10px] leading-relaxed">
//           {lot.rivalName} won this unit for {formatCoins(lot.currentBid)}c.{" "}
//           {lot.refundedAmount
//             ? `Your ${formatCoins(lot.refundedAmount)}c escrowed bid was returned.`
//             : "You did not place a bid."}
//         </div>
//       )}
//     </Panel>
//   );
// }

// function HaulTab() {
//   const { data, busy, sellItem } = useAuction();
//   const inventory = data?.state.inventory ?? [];
//   const multipliers = data?.state.market.multipliers ?? {};
//   const sorted = useMemo(
//     () =>
//       [...inventory].sort(
//         (a, b) =>
//           saleValue(b, multipliers as Parameters<typeof saleValue>[1]) -
//           saleValue(a, multipliers as Parameters<typeof saleValue>[1])
//       ),
//     [inventory, multipliers]
//   );

//   if (sorted.length === 0) {
//     return (
//       <Panel className="mt-3">
//         <h3 className="text-lg font-bold uppercase">Your haul is empty</h3>
//         <p className="mt-1 text-[11px] leading-relaxed">
//           Win a storage lot, open the vault, and the contents will appear here.
//           Marla buys anything from the haul for in-game coins.
//         </p>
//       </Panel>
//     );
//   }

//   return (
//     <div className="mt-3 space-y-2">
//       <Panel background="#f8ecc2">
//         <div className="flex flex-wrap items-end justify-between gap-2">
//           <div>
//             <p className="text-[9px] uppercase" style={labelStyle}>
//               Haul ledger
//             </p>
//             <p className="text-lg font-bold uppercase">
//               {sorted.length} item{sorted.length === 1 ? "" : "s"}
//             </p>
//           </div>
//           <p className="text-lg font-bold">
//             {formatCoins(haulValue(sorted, multipliers))}c{" "}
//             <span className="text-[9px] uppercase">estimated</span>
//           </p>
//         </div>
//       </Panel>
//       {sorted.map((item) => (
//         <ItemRow
//           key={item.id}
//           item={item}
//           multipliers={multipliers}
//           busy={busy}
//           onSell={() => void sellItem(item.id)}
//         />
//       ))}
//     </div>
//   );
// }

// function LedgerTab() {
//   const { data, busy, advanceDay } = useAuction();
//   const state = data?.state;

//   if (!state) {
//     return null;
//   }

//   return (
//     <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
//       <Panel>
//         <div className="flex flex-wrap items-end justify-between gap-2">
//           <div>
//             <p className="text-[9px] uppercase" style={labelStyle}>
//               Auction ledger day
//             </p>
//             <p className="text-xl font-bold uppercase">Day {state.day}</p>
//           </div>
//           <button
//             type="button"
//             disabled={busy}
//             onClick={() => void advanceDay()}
//             style={buttonStyle(GOLD, busy)}
//           >
//             {busy ? "Closing market…" : "Advance day"}
//           </button>
//         </div>
//         <p className="mt-2 text-[10px] leading-relaxed">
//           Advancing the day rerolls item-category multipliers and prints new
//           market headlines. Your current lots keep their clocks.
//         </p>

//         <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
//           {Object.entries(state.market.multipliers).map(([category, value]) => (
//             <div
//               key={category}
//               className="border-2 border-[#2b1a08] bg-[#fffdf0] p-2"
//             >
//               <p className="text-[8px] uppercase" style={labelStyle}>
//                 {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
//               </p>
//               <p
//                 className="text-base font-bold"
//                 style={{ color: value >= 1 ? "#2f6b39" : "#a33e2d" }}
//               >
//                 ×{value.toFixed(2)}
//               </p>
//             </div>
//           ))}
//         </div>
//       </Panel>

//       <Panel background="#f8ecc2">
//         <h3 className="text-lg font-bold uppercase">Market headlines</h3>
//         <div className="mt-2 space-y-2">
//           {state.market.headlines.map((headline) => (
//             <div
//               key={headline.id}
//               className="border-2 border-[#8b6b3f] bg-[#fffdf0] p-2"
//             >
//               <div className="flex flex-wrap items-center justify-between gap-1">
//                 <Badge>
//                   {CATEGORY_LABELS[headline.category]} · D{headline.day}
//                 </Badge>
//                 {headline.changePct !== 0 && (
//                   <span
//                     className="text-[10px] font-bold"
//                     style={{
//                       color: headline.changePct > 0 ? "#2f6b39" : "#a33e2d",
//                     }}
//                   >
//                     {headline.changePct > 0 ? "+" : ""}
//                     {headline.changePct}%
//                   </span>
//                 )}
//               </div>
//               <p className="mt-1 text-[10px] leading-snug">{headline.text}</p>
//             </div>
//           ))}
//         </div>
//       </Panel>

//       <Panel className="lg:col-span-2">
//         <h3 className="text-lg font-bold uppercase">Recent entries</h3>
//         <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
//           {[...state.history].reverse().map((entry) => (
//             <div
//               key={entry.id}
//               className="border-2 border-[#8b6b3f] bg-[#fffdf0] px-2 py-1.5"
//             >
//               <div className="flex flex-wrap items-center justify-between gap-1">
//                 <div className="flex items-center gap-1.5">
//                   <Badge
//                     background={
//                       entry.type === "WIN" || entry.type === "SALE"
//                         ? GREEN
//                         : entry.type === "LOSS"
//                         ? "#ffd8cc"
//                         : PAPER
//                     }
//                   >
//                     {entry.type}
//                   </Badge>
//                   <span className="text-[8px] uppercase" style={labelStyle}>
//                     Day {entry.day}
//                   </span>
//                 </div>
//                 {typeof entry.amount === "number" && (
//                   <span className="text-[10px] font-bold">
//                     {formatCoins(entry.amount)}c
//                   </span>
//                 )}
//               </div>
//               <p className="mt-1 text-[10px] leading-snug">{entry.message}</p>
//             </div>
//           ))}
//         </div>
//       </Panel>
//     </div>
//   );
// }

// export default function AuctionHouseModal() {
//   const {
//     profile,
//     data,
//     loading,
//     error,
//     feedback,
//     isOpen,
//     closeAuction,
//     selectedLotId,
//     selectLot,
//     refresh,
//     dismissError,
//   } = useAuction();
//   const now = useNow();
//   const [tab, setTab] = useState<"lots" | "haul" | "ledger">("lots");

//   const state = data?.state;
//   const lots = state?.lots ?? [];
//   const selectedLot =
//     lots.find((lot) => lot.id === selectedLotId) ??
//     lots.find((lot) => lot.status === "live") ??
//     lots[0] ??
//     null;
//   const held = lots.reduce((total, lot) => total + lot.playerBid, 0);
//   const haulTotal = state
//     ? haulValue(state.inventory, state.market.multipliers)
//     : 0;
//   const activeCount = lots.filter(
//     (lot) => lot.status === "preview" || lot.status === "live"
//   ).length;

//   useEffect(() => {
//     if (selectedLot && !selectedLotId) {
//       selectLot(selectedLot.id);
//     }
//   }, [selectedLot, selectedLotId, selectLot]);

//   return (
//     <Modal
//       opened={isOpen}
//       onClose={closeAuction}
//       title="STOCK WARS · ROOK'S RIVERSIDE AUCTION"
//       size="xl"
//       centered
//       zIndex={1000}
//       overlayProps={{ backgroundOpacity: 0.72, blur: 2 }}
//       classNames={{
//         content:
//           "!rounded-none !border-4 !border-[#2b1a08] !bg-[#fff6d6] !p-0 !shadow-[8px_8px_0_rgba(0,0,0,0.45)]",
//         header:
//           "!m-0 !border-b-4 !border-[#2b1a08] !bg-[#f4c95d] !px-4 !py-3",
//         title: "!text-[#2b1a08] !font-bold !uppercase !tracking-[0.1em]",
//         close:
//           "!border-2 !border-[#2b1a08] !bg-[#fff6d6] !text-[#2b1a08] !rounded-none hover:!bg-[#fffdf0]",
//         body: "!bg-[#fff6d6] !p-0 !max-h-[80vh] !overflow-y-auto",
//       }}
//       styles={{
//         content: { fontFamily: pixelFont.style.fontFamily },
//         title: { fontFamily: pixelFont.style.fontFamily, fontSize: 15 },
//       }}
//     >
//       <div
//         className="p-3 text-[#2b1a08]"
//         style={{
//           fontFamily: pixelFont.style.fontFamily,
//           letterSpacing: "0.02em",
//           lineHeight: 1.45,
//         }}
//       >
//         <Panel background="#f8ecc2">
//           <div className="flex flex-wrap items-end justify-between gap-3">
//             <div>
//               <p className="text-[9px] uppercase tracking-widest" style={labelStyle}>
//                 Bidder
//               </p>
//               <p className="text-lg font-bold uppercase">{profile.username}</p>
//               <p className="text-[8px] uppercase" style={labelStyle}>
//                 {shortWallet(profile.walletAddress)}
//               </p>
//             </div>
//             <div>
//               <p className="text-[9px] uppercase tracking-widest" style={labelStyle}>
//                 Day
//               </p>
//               <p className="text-lg font-bold uppercase">
//                 {state ? state.day : "—"}
//               </p>
//             </div>
//             <div>
//               <p className="text-[9px] uppercase tracking-widest" style={labelStyle}>
//                 Free purse
//               </p>
//               <p className="text-2xl font-bold">
//                 {state ? `${formatCoins(state.balance)}c` : "—"}
//               </p>
//             </div>
//             <div>
//               <p className="text-[9px] uppercase tracking-widest" style={labelStyle}>
//                 Held bids
//               </p>
//               <p className="text-lg font-bold">{formatCoins(held)}c</p>
//             </div>
//             <div>
//               <p className="text-[9px] uppercase tracking-widest" style={labelStyle}>
//                 Haul
//               </p>
//               <p className="text-lg font-bold">
//                 {state?.inventory.length ?? 0} · {formatCoins(haulTotal)}c
//               </p>
//             </div>
//             <button
//               type="button"
//               onClick={() => void refresh()}
//               style={buttonStyle(PAPER)}
//             >
//               Refresh
//             </button>
//           </div>
//         </Panel>

//         {error && (
//           <div className="mt-3 flex items-start justify-between gap-2 border-4 border-[#2b1a08] bg-[#ffd8cc] p-3 shadow-[4px_4px_0_#2b1a08]">
//             <div>
//               <p className="text-[10px] font-bold uppercase">Ledger error</p>
//               <p className="text-[10px] leading-snug">{error}</p>
//             </div>
//             <button
//               type="button"
//               onClick={dismissError}
//               style={buttonStyle(PAPER)}
//             >
//               Dismiss
//             </button>
//           </div>
//         )}

//         {feedback && (
//           <div
//             className="mt-3 border-4 border-[#2b1a08] p-3 shadow-[4px_4px_0_#2b1a08]"
//             style={{
//               background:
//                 feedback.tone === "error"
//                   ? RED
//                   : feedback.tone === "success"
//                   ? "#dff3d2"
//                   : "#fff0b8",
//             }}
//           >
//             <p className="text-[10px] font-bold uppercase">
//               {feedback.tone === "working"
//                 ? "Working"
//                 : feedback.tone === "success"
//                 ? "Recorded"
//                 : "Blocked"}
//             </p>
//             <p className="text-[10px] leading-snug">{feedback.message}</p>
//           </div>
//         )}

//         <div className="mt-3 flex flex-wrap items-center gap-2">
//           {(
//             [
//               ["lots", `Lots (${activeCount})`],
//               ["haul", `Haul (${state?.inventory.length ?? 0})`],
//               ["ledger", "Ledger"],
//             ] as const
//           ).map(([value, label]) => (
//             <button
//               key={value}
//               type="button"
//               onClick={() => setTab(value)}
//               aria-pressed={tab === value}
//               style={{
//                 ...tabStyle,
//                 background: tab === value ? GOLD : PAPER,
//               }}
//             >
//               {label}
//             </button>
//           ))}
//           <p className="ml-auto text-[9px] uppercase" style={labelStyle}>
//             {loading && !data
//               ? "Reading ledger…"
//               : "Auto-refresh · 4.5s"}
//           </p>
//         </div>

//         {loading && !data && (
//           <Panel className="mt-3">
//             <p className="text-[11px] uppercase" style={labelStyle}>
//               Reading the auction ledger…
//             </p>
//           </Panel>
//         )}

//         {state && tab === "lots" && (
//           <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_1fr]">
//             <div className="space-y-2">
//               {lots.map((lot) => (
//                 <LotCard
//                   key={lot.id}
//                   lot={lot}
//                   now={now}
//                   selected={lot.id === selectedLot?.id}
//                   onSelect={() => selectLot(lot.id)}
//                 />
//               ))}
//             </div>
//             <div className="lg:sticky lg:top-0 lg:self-start">
//               {selectedLot ? (
//                 <LotDetail lot={selectedLot} now={now} />
//               ) : (
//                 <Panel>
//                   <p className="text-[11px]">
//                     No lots are on the block. Refresh the ledger.
//                   </p>
//                 </Panel>
//               )}
//             </div>
//           </div>
//         )}

//         {state && tab === "haul" && <HaulTab />}
//         {state && tab === "ledger" && <LedgerTab />}

//         <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#8b6b3f] pt-2">
//           <p className="text-[9px] uppercase leading-snug" style={labelStyle}>
//             Bids are whole in-game coins. Rival bidders are NPCs and never need
//             wallets.
//           </p>
//           <p className="text-[9px] uppercase" style={labelStyle}>
//             Press E at Rook in the market square
//           </p>
//         </div>
//       </div>
//     </Modal>
//   );
// }


"use client";

import localFont from "next/font/local";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@mantine/core";
import { useAuction } from "../../contexts/auction-context";
import {
  CATEGORY_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
  itemConditionLabel,
  type InventoryItem,
  type StorageLot,
} from "../../auction/types";
import {
  formatCoins,
  formatCountdown,
  haulValue,
  itemDealerOffer,
  lotPhaseLabel,
  lotStatusColor,
  lotStatusLabel,
  shortWallet,
} from "../../auction/format";

const pixelFont = localFont({
  src: "../../../fonts/GAMERIA.ttf",
  display: "swap",
  fallback: ["monospace"],
});

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                              */
/* -------------------------------------------------------------------------- */

const INK = "#2b1a08";
const PAPER = "#fff6d6";
const GOLD = "#f4c95d";
const WOOD_DARK = "#5e3b1a";
const URGENT_MS = 10_000;

// Pixel face: titles, names, prices, timers, buttons.
// Body face (`--ah-body` below): clues, descriptions, stock lines, journal text.
const fontVars = {
  "--ah-pixel": pixelFont.style.fontFamily,
} as React.CSSProperties;

/*
 * Scoped stylesheet. globals.css forces Arial + letter-spacing on
 * span/p/div/h1-h6/input, so everything here is class-based (0,1,0 beats those
 * element selectors) and the reset re-inherits fonts/spacing inside the modal.
 */
const AUCTION_CSS = `
.ah-root, .ah-entry {
  --ink: ${INK};
  --paper: ${PAPER};
  --paper-hi: #fffdf0;
  --paper-lo: #f3e3b0;
  --edge: #c9a867;
  --wood: #7d4f25;
  --wood-dk: ${WOOD_DARK};
  --gold: ${GOLD};
  --gold-dk: #d9a63a;
  --green: #8fc36f;
  --green-dk: #3f6b2c;
  --green-bg: #e3f2d3;
  --red: #9b3a2e;
  --red-bg: #f6d9cf;
  --amber: #ffcf70;
  --muted: #6a4a26;
  --ah-body: "Trebuchet MS", "Segoe UI", Verdana, system-ui, sans-serif;
  font-family: var(--ah-body);
  letter-spacing: normal;
  color: var(--ink);
}
.ah-root *, .ah-root *::before, .ah-root *::after { box-sizing: border-box; }
.ah-root * { font-family: inherit; letter-spacing: inherit; }
.ah-pixel { font-family: var(--ah-pixel); font-weight: 400; letter-spacing: 0.04em; }

.ah-root {
  padding: 4px 18px 24px;
  font-size: 15px;
  line-height: 1.45;
  background-color: var(--paper-lo);
  background-image: repeating-linear-gradient(0deg, rgba(94,59,26,0.05) 0 2px, transparent 2px 4px);
}

/* ---- Frames --------------------------------------------------------------- */
.ah-panel {
  position: relative;
  margin-top: 22px;
  padding: 24px 14px 14px;
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px var(--paper-hi), inset 0 0 0 5px var(--edge), 4px 4px 0 var(--ink);
}
.ah-panel--lo { background: #f8ecc2; }
.ah-plank {
  position: absolute;
  top: -17px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 5px 12px 4px;
  font-size: 15px;
  line-height: 1.2;
  color: var(--paper-hi);
  background: var(--wood);
  border: 3px solid var(--ink);
  box-shadow: inset 0 -3px 0 var(--wood-dk), 2px 2px 0 var(--ink);
  text-shadow: 1px 1px 0 var(--ink);
}
.ah-plank::before, .ah-plank::after {
  content: "";
  width: 4px;
  height: 4px;
  background: var(--gold);
  box-shadow: 1px 1px 0 var(--ink);
}
.ah-hint { margin: 0 0 10px; font-size: 13.5px; color: var(--muted); }
.ah-label { margin: 0; font-size: 12px; line-height: 1.3; color: var(--muted); }
.ah-meta { margin: 0; font-size: 13.5px; color: var(--muted); }

.ah-coin {
  flex: none;
  display: inline-block;
  width: 14px;
  height: 14px;
  background: var(--gold);
  border: 2px solid var(--ink);
  border-radius: 50%;
  box-shadow: inset -2px -2px 0 var(--gold-dk);
}

/* ---- Marquee hero --------------------------------------------------------- */
.ah-hero {
  margin-top: 18px;
  color: var(--paper-hi);
  background-color: var(--wood);
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 3px, transparent 3px 46px);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px rgba(255,246,214,0.18), 4px 4px 0 var(--ink);
}
.ah-bulbs { position: relative; height: 14px; border-bottom: 3px solid var(--ink); background: var(--wood-dk); }
.ah-bulbs::before, .ah-bulbs::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 6px 7px, var(--gold) 0 3px, transparent 3.5px) 0 0 / 24px 14px repeat-x;
  animation: ah-blink 1.2s steps(1) infinite;
}
.ah-bulbs::after { background-position: 12px 0; animation-delay: -0.6s; }
@keyframes ah-blink { 0% { opacity: 1; } 50% { opacity: 0.25; } }

.ah-hero-inner { display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px; padding: 14px; }
.ah-bidder { flex: 1 1 180px; align-self: center; min-width: 0; }
.ah-bidder-label { margin: 0; font-size: 13px; color: #f3dfb0; }
.ah-bidder-name { margin: 2px 0 0; font-size: 20px; line-height: 1.25; text-shadow: 2px 2px 0 var(--ink); overflow-wrap: anywhere; }
.ah-wallet { display: inline-block; margin-top: 4px; padding: 0 8px; font-size: 13px; color: var(--ink); background: var(--paper); border: 2px solid var(--ink); }

.ah-plaque {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 16px;
  color: var(--ink);
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge), 3px 3px 0 var(--ink);
}
.ah-plaque-label { margin: 0; font-size: 13px; color: var(--muted); }
.ah-plaque-val { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 20px; line-height: 1.2; }
.ah-plaque--purse { min-width: 190px; background: #fff0b8; }
.ah-plaque--purse .ah-plaque-val { font-size: 30px; }
.ah-plaque--purse .ah-coin { width: 20px; height: 20px; }
.ah-pop { display: inline-block; animation: ah-pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1); }
@keyframes ah-pop { 0% { transform: scale(1.35); } 100% { transform: scale(1); } }

/* ---- Alerts --------------------------------------------------------------- */
.ah-alert {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--red-bg);
  border: 3px solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
}
.ah-alert--working { background: #fff0b8; }
.ah-alert--success { background: var(--green-bg); }
.ah-alert-title { margin: 0 0 2px; font-size: 14px; }
.ah-alert-text { margin: 0; font-size: 14.5px; }

/* ---- Tabs ----------------------------------------------------------------- */
.ah-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 20px; }
.ah-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-family: var(--ah-pixel);
  font-size: 14px;
  letter-spacing: 0.06em;
  color: var(--ink);
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: 0 4px 0 var(--ink);
  cursor: pointer;
}
.ah-tab:hover { background: #fff0c4; }
.ah-tab[aria-pressed="true"] { background: var(--gold); transform: translateY(2px); box-shadow: 0 2px 0 var(--ink); }
.ah-sync { margin: 0 0 0 auto; display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted); }
.ah-dot { width: 8px; height: 8px; background: var(--green-dk); border: 2px solid var(--ink); animation: ah-blink 1.4s steps(1) infinite; }

/* ---- Chips ---------------------------------------------------------------- */
.ah-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--ink);
  background: var(--paper);
  border: 2px solid var(--ink);
  white-space: nowrap;
}

/* ---- Lot cards: little storage-unit doors --------------------------------- */
.ah-lots { display: flex; flex-direction: column; gap: 14px; margin-top: 22px; }
.ah-lot {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  text-align: left;
  color: var(--ink);
  background: var(--paper-hi);
  border: 3px solid var(--edge);
  cursor: pointer;
  overflow: hidden;
}
.ah-lot:hover { border-color: var(--wood); transform: translateY(-2px); }
.ah-lot[aria-pressed="true"] { border-color: var(--ink); box-shadow: 4px 4px 0 var(--ink); background: #fff3c4; }
.ah-lot--lost { background: #f1e8d0; }
.ah-door {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: repeating-linear-gradient(0deg, #a07a4a 0 6px, #8a6538 6px 8px);
  border-bottom: 3px solid var(--ink);
}
.ah-lot[aria-pressed="true"] .ah-door::before {
  content: "";
  flex: none;
  border-left: 9px solid var(--ink);
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  margin-right: -2px;
}
.ah-plate {
  padding: 2px 10px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ink);
  background: var(--paper);
  border: 2px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
}
.ah-door-lot { margin-right: auto; font-size: 13px; color: var(--paper-hi); text-shadow: 1px 1px 0 var(--ink); }
.ah-lot-body { padding: 10px 14px 12px; }
.ah-lot-title { margin: 0; font-size: 17px; line-height: 1.25; }
.ah-clue { margin: 8px 0 0; font-size: 14px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ah-lot-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-top: 10px; padding-top: 8px; border-top: 2px dashed var(--edge); }
.ah-bid-big { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 22px; line-height: 1.2; }
.ah-clock-sm { margin: 0; font-size: 14px; font-weight: 700; text-align: right; }
.ah-urgent { color: var(--red); animation: ah-beat 0.8s steps(2) infinite; }
@keyframes ah-beat { 50% { opacity: 0.55; } }
.ah-live { display: inline-block; width: 9px; height: 9px; margin-right: 6px; background: var(--red); border: 2px solid var(--ink); animation: ah-blink 1s steps(1) infinite; }
.ah-bidline { margin: 10px 0 0; padding: 6px 10px; font-size: 14px; font-weight: 700; border: 2px solid var(--ink); }
.ah-bidline--lead { background: var(--green); }
.ah-bidline--out { background: var(--amber); animation: ah-shake 0.45s; }
@keyframes ah-shake { 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }

.ah-stamp {
  position: absolute;
  top: 40px;
  right: 14px;
  padding: 2px 12px;
  font-size: 18px;
  line-height: 1.3;
  color: var(--green-dk);
  background: rgba(255,253,240,0.9);
  border: 3px solid var(--green-dk);
  transform: rotate(-9deg);
  pointer-events: none;
  animation: ah-stamp 0.3s cubic-bezier(0.2, 1.6, 0.4, 1) both;
}
.ah-stamp--lost { color: var(--red); border-color: var(--red); }
@keyframes ah-stamp { 0% { transform: rotate(-9deg) scale(2); opacity: 0; } 100% { transform: rotate(-9deg) scale(1); opacity: 1; } }

.ah-shapes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ah-shape { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; font-size: 13px; background: #e6d9b4; border: 2px solid var(--ink); }
.ah-shape-icon { filter: grayscale(1) brightness(0.35); font-size: 16px; line-height: 1; }

/* ---- Lot detail: the block ------------------------------------------------ */
.ah-detail-title { margin: 0; font-size: 22px; line-height: 1.25; }
.ah-detail-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ah-clock {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 14px;
  color: var(--paper-hi);
  background: var(--wood-dk);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px rgba(255,246,214,0.2);
}
.ah-clock-label { margin: 0; font-size: 13px; color: #f3dfb0; }
.ah-clock-val { display: inline-flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 32px; line-height: 1.1; text-shadow: 2px 2px 0 var(--ink); }
.ah-clock-val.ah-urgent { color: #ffb4a3; }
.ah-clock .ah-coin { width: 18px; height: 18px; }

.ah-duel { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 8px; margin-top: 12px; }
.ah-duel-vs { align-self: center; font-size: 14px; color: var(--wood-dk); }
.ah-duel-side { padding: 8px 10px; background: var(--paper-hi); border: 3px solid var(--ink); }
.ah-duel-side--lead { background: var(--green); }
.ah-duel-side--out { background: var(--amber); }
.ah-duel-name { margin: 0; font-size: 13.5px; font-weight: 700; overflow-wrap: anywhere; }
.ah-duel-val { margin: 2px 0 0; font-size: 20px; line-height: 1.2; }

.ah-notes { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 0; padding: 0; list-style: none; }
.ah-note { padding: 6px 10px; font-size: 14px; line-height: 1.45; background: #fff3a8; border-left: 5px solid var(--gold-dk); box-shadow: 2px 2px 0 rgba(43,26,8,0.25); }
.ah-sub { margin: 14px 0 0; font-size: 14px; }
.ah-box { margin-top: 14px; padding: 12px; border: 3px solid var(--ink); background: var(--paper-hi); }
.ah-box--warn { background: #fff0b8; font-size: 14.5px; }
.ah-box--won { background: var(--green-bg); }
.ah-box--lost { background: var(--red-bg); font-size: 14.5px; }
.ah-box-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px; }
.ah-box-title { margin: 0; font-size: 15px; line-height: 1.3; }
.ah-text { margin: 8px 0 0; font-size: 14.5px; }
.ah-note-box { margin: 10px 0 0; padding: 8px 10px; font-size: 14px; background: var(--paper); border: 2px solid var(--ink); }
.ah-note-box--bad { background: var(--red-bg); }
.ah-dots::after { content: ""; animation: ah-dots 1.2s steps(1) infinite; }
@keyframes ah-dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } }

.ah-bidrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
.ah-input {
  width: 120px;
  height: 46px;
  padding: 0 10px;
  font-family: var(--ah-pixel);
  font-size: 22px;
  letter-spacing: 0.02em;
  color: var(--ink);
  background: var(--paper);
  border: 3px solid var(--ink);
  border-radius: 0;
  outline: none;
}
.ah-input:focus { background: #fff; box-shadow: 0 0 0 3px var(--gold); }

/* ---- Buttons -------------------------------------------------------------- */
.ah-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  font-family: var(--ah-pixel);
  font-size: 14px;
  line-height: 1.25;
  letter-spacing: 0.06em;
  text-align: center;
  color: var(--ink);
  background: var(--gold);
  border: 3px solid var(--ink);
  box-shadow: inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(94,59,26,0.28), 0 4px 0 var(--ink);
  cursor: pointer;
  transition: transform 0.06s, box-shadow 0.06s;
}
.ah-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.ah-btn:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(94,59,26,0.28), 0 1px 0 var(--ink);
}
.ah-btn:disabled { color: #6a5a44; background: #ddd2b8; border-color: #8b7a60; box-shadow: 0 2px 0 #8b7a60; cursor: not-allowed; }
.ah-btn--green { background: var(--green); }
.ah-btn--paper { background: var(--paper); }
.ah-btn--sm { min-height: 40px; padding: 4px 12px; font-size: 13px; }
.ah-btn--block { width: 100%; margin-top: 12px; }
.ah-btn--big { min-height: 54px; font-size: 17px; }
.ah-btn--bob:not(:disabled) { animation: ah-bob 1s steps(2) infinite; }
@keyframes ah-bob { 50% { transform: translateY(-3px); } }
.ah-x { flex: none; width: 28px; height: 28px; font-size: 18px; line-height: 1; color: var(--ink); background: var(--paper); border: 2px solid var(--ink); cursor: pointer; }
.ah-btn:focus-visible, .ah-tab:focus-visible, .ah-lot:focus-visible, .ah-x:focus-visible { outline: 3px dashed var(--ink); outline-offset: 2px; }

/* ---- Items: haul + vault loot -------------------------------------------- */
.ah-haul-banner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.ah-haul-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin-top: 14px; }
@media (min-width: 680px) { .ah-haul-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1020px) { .ah-haul-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.ah-item { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: var(--paper-hi); border: 3px solid var(--ink); border-top: 8px solid var(--rar, var(--edge)); box-shadow: 3px 3px 0 var(--ink); }
.ah-item-top { display: flex; align-items: flex-start; gap: 10px; }
.ah-itemslot {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  font-size: 30px;
  line-height: 1;
  background: #e6cf96;
  border: 3px solid var(--rar, var(--ink));
  box-shadow: inset 3px 3px 0 rgba(94,59,26,0.3), inset -3px -3px 0 rgba(255,253,240,0.55);
  overflow: hidden;
}
.ah-itemslot--sm { width: 42px; height: 42px; font-size: 22px; }
.ah-sheen::after {
  content: "";
  position: absolute;
  top: -20%;
  left: -60%;
  width: 40%;
  height: 140%;
  background: rgba(255,255,255,0.55);
  transform: skewX(-20deg);
  animation: ah-sheen 2.6s ease-in-out infinite;
}
@keyframes ah-sheen { 0%, 55% { left: -60%; } 100% { left: 140%; } }
.ah-item-name { margin: 0; font-size: 15px; line-height: 1.3; overflow-wrap: anywhere; }
.ah-item-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 8px; border-top: 2px dashed var(--edge); }
.ah-worth { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 20px; line-height: 1.2; }
.ah-loot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 10px; }
.ah-loot { display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--paper-hi); border: 2px solid var(--ink); border-left: 6px solid var(--rar, var(--ink)); animation: ah-loot 0.4s cubic-bezier(0.2, 1.5, 0.4, 1) both; animation-delay: calc(var(--i, 0) * 110ms); }
.ah-loot-name { margin: 0; font-size: 13.5px; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
@keyframes ah-loot { 0% { opacity: 0; transform: translateY(12px) scale(0.6); } 100% { opacity: 1; transform: none; } }

/* ---- Ledger --------------------------------------------------------------- */
.ah-ledger-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0 20px; }
@media (min-width: 1024px) { .ah-ledger-grid { grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); } .ah-span { grid-column: 1 / -1; } }
.ah-day-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.ah-day-big { margin: 0; font-size: 28px; line-height: 1.2; }
.ah-mults { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin-top: 12px; }
.ah-mult { padding: 6px 10px; background: var(--paper-hi); border: 2px solid var(--ink); }
.ah-mult-val { margin: 2px 0 0; font-size: 20px; line-height: 1.2; }
.ah-up { color: var(--green-dk); }
.ah-down { color: var(--red); }
.ah-clip { padding: 8px 10px; background: var(--paper-hi); border: 2px dashed var(--wood); }
.ah-clip + .ah-clip { margin-top: 8px; }
.ah-clip-text { margin: 4px 0 0; font-size: 14.5px; }
.ah-clip-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; }
.ah-entries { display: flex; flex-direction: column; gap: 8px; max-height: 18rem; overflow-y: auto; padding-right: 4px; }
.ah-entry-row { padding: 6px 10px; background: var(--paper-hi); border: 2px solid var(--edge); }
.ah-empty { margin: 0; padding: 14px; font-size: 15px; background: var(--paper-hi); border: 3px dashed var(--wood); }

.ah-detail-wrap { margin-top: 0; }
@media (min-width: 1024px) { .ah-detail-wrap { position: sticky; top: 0; align-self: start; } }
.ah-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin: 22px 0 0; padding-top: 10px; font-size: 13.5px; color: var(--muted); border-top: 2px solid var(--edge); }

/* ---- Scrollbars ----------------------------------------------------------- */
.ah-scroll, .ah-entries { scrollbar-color: #7d4f25 #f3e3b0; }
.ah-scroll::-webkit-scrollbar, .ah-entries::-webkit-scrollbar { width: 14px; }
.ah-scroll::-webkit-scrollbar-track, .ah-entries::-webkit-scrollbar-track { background: #f3e3b0; border-left: 3px solid ${INK}; }
.ah-scroll::-webkit-scrollbar-thumb, .ah-entries::-webkit-scrollbar-thumb { background: #7d4f25; border: 3px solid ${INK}; }

@media (prefers-reduced-motion: reduce) {
  .ah-root *, .ah-root *::before, .ah-root *::after { animation: none !important; transition: none !important; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Small hooks and presentational pieces                                      */
/* -------------------------------------------------------------------------- */

function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

// Counts a number up/down toward its target so purse changes are satisfying.
function useTweened(target: number, durationMs = 600): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) {
      return;
    }

    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      current.current = target;
      setShown(target);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      current.current = value;
      setShown(value);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}

function Coin() {
  return <span className="ah-coin" aria-hidden="true" />;
}

function Panel({
  title,
  hint,
  children,
  className = "",
  tone = "paper",
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "lo";
}) {
  return (
    <section
      className={`ah-panel ${tone === "lo" ? "ah-panel--lo" : ""} ${className}`}
    >
      {title && <h2 className="ah-plank ah-pixel">{title}</h2>}
      {hint && <p className="ah-hint">{hint}</p>}
      {children}
    </section>
  );
}

function Chip({
  children,
  background,
  color,
}: {
  children: React.ReactNode;
  background?: string;
  color?: string;
}) {
  return (
    <span className="ah-chip" style={{ background, color }}>
      {children}
    </span>
  );
}

function RarityChip({ item }: { item: InventoryItem }) {
  return (
    <Chip background={RARITY_COLORS[item.rarity]} color={PAPER}>
      {RARITY_LABELS[item.rarity]}
    </Chip>
  );
}

function rarityVars(item: InventoryItem): React.CSSProperties {
  return { "--rar": RARITY_COLORS[item.rarity] } as React.CSSProperties;
}

function Silhouettes({ lot }: { lot: StorageLot }) {
  return (
    <div className="ah-shapes">
      {lot.silhouettes.map((silhouette) => (
        <span
          key={silhouette.category}
          className="ah-shape"
          title={`${silhouette.label} shape`}
        >
          <span className="ah-shape-icon" aria-hidden="true">
            {silhouette.icon}
          </span>
          {silhouette.label}
        </span>
      ))}
    </div>
  );
}

function lotNumber(lot: StorageLot): string {
  return String(lot.listingNumber).padStart(2, "0");
}

function entryColor(type: string): string {
  switch (type) {
    case "WIN":
    case "SALE":
      return "#a8d98a";
    case "LOSS":
      return "#ffd8cc";
    case "BID":
      return "#ffe8a3";
    default:
      return PAPER;
  }
}

/* -------------------------------------------------------------------------- */
/*  Lots                                                                       */
/* -------------------------------------------------------------------------- */

function LotCard({
  lot,
  now,
  selected,
  onSelect,
}: {
  lot: StorageLot;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const isLive = lot.status === "live";
  const urgent = isLive && Date.parse(lot.endsAt) - now <= URGENT_MS;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`ah-lot ah-lot--${lot.status}`}
    >
      <div className="ah-door">
        <span className="ah-plate ah-pixel">Unit {lot.unitNumber}</span>
        <span className="ah-door-lot ah-pixel">Lot {lotNumber(lot)}</span>
        <Chip background={lotStatusColor(lot)}>
          {isLive && <span className="ah-live" aria-hidden="true" />}
          {lotStatusLabel(lot)}
        </Chip>
      </div>

      {lot.status === "won" && (
        <span className="ah-stamp ah-pixel">Won!</span>
      )}
      {lot.status === "lost" && (
        <span className="ah-stamp ah-stamp--lost ah-pixel">Lost</span>
      )}

      <div className="ah-lot-body">
        <p className="ah-lot-title ah-pixel">{lot.title}</p>
        <p className="ah-meta">
          {lot.facility} · {lot.sizeLabel}
        </p>

        <Silhouettes lot={lot} />

        {lot.previewClues[0] && (
          <p className="ah-clue">“{lot.previewClues[0]}”</p>
        )}

        <div className="ah-lot-foot">
          <div>
            <p className="ah-label">Current bid</p>
            <p className="ah-bid-big ah-pixel">
              <span key={lot.currentBid} className="ah-pop">
                {formatCoins(lot.currentBid)}
              </span>
              <Coin />
            </p>
          </div>
          <div>
            <p className="ah-label" style={{ textAlign: "right" }}>
              {lot.status === "preview" || lot.status === "live"
                ? "Clock"
                : "Result"}
            </p>
            <p className={`ah-clock-sm ${urgent ? "ah-urgent" : ""}`}>
              {lotPhaseLabel(lot, now)}
            </p>
          </div>
        </div>

        {lot.playerBid > 0 && isLive && (
          <p
            className={`ah-bidline ${
              lot.isLeading ? "ah-bidline--lead" : "ah-bidline--out"
            }`}
          >
            {lot.isLeading
              ? `You lead at ${lot.playerBid}c`
              : `Outbid · your ${lot.playerBid}c is held`}
          </p>
        )}
      </div>
    </button>
  );
}

function LotDetail({ lot, now }: { lot: StorageLot; now: number }) {
  const { busy, placeBid, revealLot } = useAuction();
  const [bid, setBid] = useState(0);
  const minBid = lot.currentBid + 1;
  const held = lot.playerBid;
  const additional = Math.max(0, bid - held);
  const canBid =
    lot.status === "live" &&
    !busy &&
    Number.isInteger(bid) &&
    bid >= minBid &&
    additional >= 0;

  useEffect(() => {
    setBid(Math.max(lot.currentBid + 10, lot.startingBid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot.id]);

  const raiseBy = (amount: number) => {
    setBid((current) => Math.max(minBid, current + amount));
  };

  const isLive = lot.status === "live";
  const urgent = isLive && Date.parse(lot.endsAt) - now <= URGENT_MS;
  const youHaveBid = lot.playerBid > 0;

  return (
    <Panel title={`Lot ${lotNumber(lot)}`} tone="lo">
      <div className="ah-detail-top">
        <div>
          <h3 className="ah-detail-title ah-pixel">{lot.title}</h3>
          <p className="ah-meta" style={{ marginTop: 4 }}>
            {lot.unitNumber} · {lot.facility} · {lot.sizeLabel}
          </p>
        </div>
        <Chip background={lotStatusColor(lot)}>{lotStatusLabel(lot)}</Chip>
      </div>

      <div className="ah-clock">
        <div>
          <p className="ah-clock-label">
            {lot.status === "live"
              ? "Time on the block"
              : lot.status === "preview"
              ? "Preview ends"
              : "Lot closed"}
          </p>
          <p className={`ah-clock-val ah-pixel ${urgent ? "ah-urgent" : ""}`}>
            {lot.status === "preview"
              ? formatCountdown(Date.parse(lot.previewEndsAt) - now)
              : lot.status === "live"
              ? formatCountdown(Date.parse(lot.endsAt) - now)
              : lotPhaseLabel(lot, now)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="ah-clock-label">Current bid</p>
          <p className="ah-clock-val ah-pixel" style={{ justifyContent: "flex-end" }}>
            <span key={lot.currentBid} className="ah-pop">
              {formatCoins(lot.currentBid)}
            </span>
            <Coin />
          </p>
        </div>
      </div>

      <div className="ah-duel">
        <div className="ah-duel-side">
          <p className="ah-duel-name">{lot.rivalName}</p>
          <p className="ah-duel-val ah-pixel">{formatCoins(lot.rivalBid)}c</p>
        </div>
        <span className="ah-duel-vs ah-pixel">VS</span>
        <div
          className={`ah-duel-side ${
            youHaveBid
              ? lot.isLeading
                ? "ah-duel-side--lead"
                : "ah-duel-side--out"
              : ""
          }`}
        >
          <p className="ah-duel-name">Your bid</p>
          <p className="ah-duel-val ah-pixel">
            {lot.playerBid > 0 ? `${formatCoins(lot.playerBid)}c` : "—"}
          </p>
        </div>
      </div>

      <p className="ah-label ah-pixel ah-sub">Preview clues</p>
      <ul className="ah-notes">
        {lot.previewClues.map((clue) => (
          <li key={clue} className="ah-note">
            {clue}
          </li>
        ))}
      </ul>

      <p className="ah-label ah-pixel ah-sub">Shapes in the unit</p>
      <Silhouettes lot={lot} />

      {lot.status === "preview" && (
        <div className="ah-box ah-box--warn">
          The preview is open. Bidding starts when the clock hits zero. Keep
          this panel open; the ledger refreshes automatically.
        </div>
      )}

      {lot.status === "live" && (
        <div className="ah-box">
          <div className="ah-box-head">
            <div>
              <p className="ah-box-title ah-pixel">Place a bid</p>
              <p className="ah-meta">
                Minimum {formatCoins(minBid)}c · rival holds{" "}
                {formatCoins(lot.rivalBid)}c
              </p>
            </div>
            {lot.playerBid > 0 && (
              <Chip background={lot.isLeading ? "#a8d98a" : "#ffcf70"}>
                {lot.isLeading ? "Leading" : "Outbid"}
              </Chip>
            )}
          </div>

          <div className="ah-bidrow">
            <input
              aria-label="Bid amount in coins"
              type="number"
              min={minBid}
              step={1}
              value={bid}
              onChange={(event) => setBid(Number(event.target.value))}
              className="ah-input"
            />
            <button
              type="button"
              className="ah-btn ah-btn--sm ah-btn--paper"
              onClick={() => setBid(minBid)}
            >
              Min
            </button>
            {[10, 25, 50].map((amount) => (
              <button
                key={amount}
                type="button"
                className="ah-btn ah-btn--sm ah-btn--paper"
                onClick={() => raiseBy(amount)}
              >
                +{amount}c
              </button>
            ))}
          </div>

          <p className="ah-meta" style={{ marginTop: 10 }}>
            {held > 0
              ? `${formatCoins(held)}c is already held on this lot. A raise takes ${formatCoins(
                  additional
                )}c more from your purse.`
              : "The full bid is held in escrow until the lot closes."}
          </p>

          <button
            type="button"
            disabled={!canBid}
            onClick={() => void placeBid(lot.id, bid)}
            className="ah-btn ah-btn--green ah-btn--big ah-btn--block"
          >
            {busy ? "Sending bid…" : `Bid ${formatCoins(bid)}c`}
          </button>
        </div>
      )}

      {lot.status === "won" && (
        <div className="ah-box ah-box--won">
          <div className="ah-box-head">
            <div>
              <p className="ah-box-title ah-pixel">
                Hammer price {formatCoins(lot.paidPrice ?? 0)}c
              </p>
              <p className="ah-meta">
                {lot.revealStatus === "revealed"
                  ? "The vault is open"
                  : "The vault is yours to open"}
              </p>
            </div>
            <Chip
              background={lot.revealStatus === "revealed" ? "#a8d98a" : GOLD}
            >
              {lot.revealStatus}
            </Chip>
          </div>

          {lot.revealStatus === "ready" && (
            <>
              <p className="ah-text">
                The lock has been released. Open the unit to log its contents
                into your haul.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void revealLot(lot.id)}
                className="ah-btn ah-btn--big ah-btn--block ah-btn--bob"
              >
                {busy ? "Opening vault…" : "Open the vault"}
              </button>
            </>
          )}

          {lot.revealStatus === "pending" && (
            <p className="ah-note-box">
              The tumbler is turning
              <span className="ah-dots" aria-hidden="true" /> This panel
              refreshes automatically when the contents are logged.
            </p>
          )}

          {lot.revealStatus === "failed" && (
            <>
              <p className="ah-note-box ah-note-box--bad">
                {lot.revealError ?? "The lock jammed. Try the vault again."}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void revealLot(lot.id)}
                className="ah-btn ah-btn--block"
              >
                Retry the vault
              </button>
            </>
          )}

          {lot.revealStatus === "revealed" && lot.contents && (
            <>
              <div className="ah-loot-grid">
                {lot.contents.map((item, index) => (
                  <div
                    key={item.id}
                    className="ah-loot"
                    style={
                      {
                        ...rarityVars(item),
                        "--i": index,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className={`ah-itemslot ah-itemslot--sm ${
                        item.rarity === "legendary" ? "ah-sheen" : ""
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="ah-loot-name">{item.name}</p>
                      <p className="ah-meta" style={{ fontSize: 12.5 }}>
                        {itemConditionLabel(item.condition)} ·{" "}
                        {RARITY_LABELS[item.rarity]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="ah-meta" style={{ marginTop: 10 }}>
                All contents are now in your haul.
              </p>
            </>
          )}
        </div>
      )}

      {lot.status === "lost" && (
        <div className="ah-box ah-box--lost">
          {lot.rivalName} won this unit for {formatCoins(lot.currentBid)}c.{" "}
          {lot.refundedAmount
            ? `Your ${formatCoins(lot.refundedAmount)}c escrowed bid was returned.`
            : "You did not place a bid."}
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Haul                                                                       */
/* -------------------------------------------------------------------------- */

function ItemCard({
  item,
  value,
  busy,
  onSell,
}: {
  item: InventoryItem;
  value: number;
  busy: boolean;
  onSell: () => void;
}) {
  return (
    <div className="ah-item" style={rarityVars(item)}>
      <div className="ah-item-top">
        <span
          className={`ah-itemslot ${
            item.rarity === "legendary" ? "ah-sheen" : ""
          }`}
        >
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="ah-item-name ah-pixel">{item.name}</p>
          <p className="ah-meta" style={{ marginTop: 2 }}>
            {CATEGORY_LABELS[item.category]} ·{" "}
            {itemConditionLabel(item.condition)}
          </p>
          <p className="ah-meta">from lot #{item.sourceListing}</p>
        </div>
      </div>
      <div>
        <RarityChip item={item} />
      </div>
      <div className="ah-item-foot">
        <div>
          <p className="ah-label">Dealer offer</p>
          <p className="ah-worth ah-pixel">
            {formatCoins(value)}
            <Coin />
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onSell}
          className="ah-btn ah-btn--sm"
        >
          Sell to dealer
        </button>
      </div>
    </div>
  );
}

function HaulTab({ onGoToLots }: { onGoToLots: () => void }) {
  const { data, economy, busy, sellItem } = useAuction();
  const inventory = data?.state.inventory ?? [];
  const sorted = useMemo(
    () =>
      [...inventory].sort(
        (a, b) => itemDealerOffer(b, economy) - itemDealerOffer(a, economy)
      ),
    [inventory, economy]
  );
  const total = haulValue(sorted, economy);
  const shownTotal = useTweened(total);

  if (sorted.length === 0) {
    return (
      <Panel title="Your haul">
        <h3 className="ah-box-title ah-pixel" style={{ fontSize: 18 }}>
          Your haul is empty
        </h3>
        <p className="ah-text">
          Win a storage lot, open the vault, and the contents will appear here.
          Take the loot to a specialist dealer on Rook&apos;s Riverside and sell
          what they actually want.
        </p>
        <button
          type="button"
          className="ah-btn ah-btn--block"
          onClick={onGoToLots}
        >
          Browse the lots
        </button>
      </Panel>
    );
  }

  return (
    <Panel title="Your haul" tone="lo">
      <div className="ah-haul-banner">
        <div>
          <p className="ah-label">Haul ledger</p>
          <p className="ah-day-big ah-pixel">
            {sorted.length} item{sorted.length === 1 ? "" : "s"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="ah-label">Best dealer offer</p>
          <p className="ah-worth ah-pixel" style={{ fontSize: 28 }}>
            {formatCoins(shownTotal)}
            <Coin />
          </p>
        </div>
      </div>

      <div className="ah-haul-grid">
        {sorted.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            value={itemDealerOffer(item, economy)}
            busy={busy}
            onSell={() => void sellItem(item.id)}
          />
        ))}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ledger                                                                     */
/* -------------------------------------------------------------------------- */

function LedgerTab() {
  const { data, economy, busy, advanceDay } = useAuction();
  const state = data?.state;

  if (!state) {
    return null;
  }

  return (
    <div className="ah-ledger-grid">
      <Panel title="Auction day">
        <div className="ah-day-row">
          <div>
            <p className="ah-label">Auction ledger day</p>
            <p className="ah-day-big ah-pixel">Day {state.day}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void advanceDay()}
            className="ah-btn ah-btn--big"
          >
            {busy ? "Closing market…" : "Advance day"}
          </button>
        </div>
        <p className="ah-text">
          Advancing the day runs dealer restocking, NPC deals, consumption and
          fresh town headlines. Headlines become short demand events for the
          loot categories they mention.
        </p>

        <div className="ah-mults">
          {economy?.goods.map((good) => {
            const demand = economy.demandMultipliers[good.id];
            return (
              <div key={good.id} className="ah-mult">
                <p className="ah-label">{good.name}</p>
                <p className="ah-mult-val ah-pixel">
                  {formatCoins(economy.prices[good.id])}
                  <Coin />
                </p>
                <p
                  className={`ah-meta ${
                    demand >= 1 ? "ah-up" : "ah-down"
                  }`}
                >
                  Demand ×{demand.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Market headlines" tone="lo">
        <p className="ah-text" style={{ marginTop: 0 }}>
          Fresh headlines move dealer demand for two days. Rumours work the same
          way but can be started from Rook&apos;s Riverside.
        </p>
        {state.market.headlines.map((headline) => (
          <div key={headline.id} className="ah-clip">
            <div className="ah-clip-top">
              <Chip>
                {CATEGORY_LABELS[headline.category] ?? headline.category} · D
                {headline.day}
              </Chip>
              {headline.changePct !== 0 && (
                <span
                  className={`ah-pixel ${
                    headline.changePct > 0 ? "ah-up" : "ah-down"
                  }`}
                  style={{ fontSize: 15 }}
                >
                  {headline.changePct > 0 ? "+" : ""}
                  {headline.changePct}%
                </span>
              )}
            </div>
            <p className="ah-clip-text">{headline.text}</p>
          </div>
        ))}
      </Panel>

      <Panel title="Recent entries" className="ah-span">
        <div className="ah-entries ah-scroll">
          {[...state.history].reverse().map((entry) => (
            <div key={entry.id} className="ah-entry-row">
              <div className="ah-clip-top">
                <div className="flex items-center gap-2">
                  <Chip background={entryColor(entry.type)}>{entry.type}</Chip>
                  <span className="ah-meta">Day {entry.day}</span>
                </div>
                {typeof entry.amount === "number" && (
                  <span className="ah-pixel" style={{ fontSize: 15 }}>
                    {formatCoins(entry.amount)}c
                  </span>
                )}
              </div>
              <p className="ah-clip-text">{entry.message}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                      */
/* -------------------------------------------------------------------------- */

export default function AuctionHouseModal() {
  const {
    profile,
    data,
    economy,
    loading,
    error,
    feedback,
    isOpen,
    closeAuction,
    selectedLotId,
    selectLot,
    refresh,
    dismissError,
  } = useAuction();
  const now = useNow();
  const [tab, setTab] = useState<"lots" | "haul" | "ledger">("lots");

  const state = data?.state;
  const lots = state?.lots ?? [];
  const selectedLot =
    lots.find((lot) => lot.id === selectedLotId) ??
    lots.find((lot) => lot.status === "live") ??
    lots[0] ??
    null;
  const held = lots.reduce((total, lot) => total + lot.playerBid, 0);
  const haulTotal = state ? haulValue(state.inventory, economy) : 0;
  const activeCount = lots.filter(
    (lot) => lot.status === "preview" || lot.status === "live"
  ).length;

  const shownPurse = useTweened(state?.balance ?? 0);
  const shownHeld = useTweened(held);
  const shownHaul = useTweened(haulTotal);

  useEffect(() => {
    if (selectedLot && !selectedLotId) {
      selectLot(selectedLot.id);
    }
  }, [selectedLot, selectedLotId, selectLot]);

  return (
    <Modal
      opened={isOpen}
      onClose={closeAuction}
      title="STOCK WARS · ROOK'S RIVERSIDE AUCTION"
      size="min(1180px, 96vw)"
      centered
      zIndex={1000}
      overlayProps={{ backgroundOpacity: 0.72, blur: 2 }}
      classNames={{ body: "ah-scroll" }}
      styles={{
        content: {
          background: PAPER,
          border: `4px solid ${INK}`,
          borderRadius: 0,
          boxShadow: "8px 8px 0 rgba(0,0,0,0.5)",
        },
        header: {
          background: WOOD_DARK,
          borderBottom: `4px solid ${INK}`,
          margin: 0,
          padding: "10px 16px",
        },
        title: {
          color: GOLD,
          fontFamily: pixelFont.style.fontFamily,
          fontSize: 19,
          fontWeight: 400,
          letterSpacing: "0.08em",
          textShadow: `2px 2px 0 ${INK}`,
        },
        close: {
          background: PAPER,
          border: `3px solid ${INK}`,
          borderRadius: 0,
          color: INK,
        },
        body: {
          maxHeight: "calc(90vh - 70px)",
          overflowY: "auto",
          padding: 0,
        },
      }}
    >
      <style>{AUCTION_CSS}</style>

      <div className="ah-root" style={fontVars}>
        {/* Marquee sign: bidder, purse, quick stats */}
        <header className="ah-hero">
          <div className="ah-bulbs" aria-hidden="true" />
          <div className="ah-hero-inner">
            <div className="ah-bidder">
              <p className="ah-bidder-label">Bidder</p>
              <p className="ah-bidder-name ah-pixel">{profile.username}</p>
              <span className="ah-wallet">{shortWallet(profile.walletAddress)}</span>
            </div>

            <div className="ah-plaque ah-plaque--purse">
              <p className="ah-plaque-label">Free purse</p>
              <p className="ah-plaque-val ah-pixel">
                {state ? (
                  <>
                    <Coin />
                    {formatCoins(shownPurse)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>

            <div className="ah-plaque">
              <p className="ah-plaque-label">Day</p>
              <p className="ah-plaque-val ah-pixel">{state ? state.day : "—"}</p>
            </div>

            <div className="ah-plaque">
              <p className="ah-plaque-label">Held bids</p>
              <p className="ah-plaque-val ah-pixel">{formatCoins(shownHeld)}c</p>
            </div>

            <div className="ah-plaque">
              <p className="ah-plaque-label">Haul</p>
              <p className="ah-plaque-val ah-pixel">
                {state?.inventory.length ?? 0} · {formatCoins(shownHaul)}c
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              className="ah-btn ah-btn--paper ah-btn--sm"
              style={{ alignSelf: "center" }}
            >
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="ah-alert">
            <div>
              <p className="ah-alert-title ah-pixel">Ledger error</p>
              <p className="ah-alert-text">{error}</p>
            </div>
            <button
              type="button"
              className="ah-btn ah-btn--paper ah-btn--sm"
              onClick={dismissError}
            >
              Dismiss
            </button>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className={`ah-alert ${
              feedback.tone === "working"
                ? "ah-alert--working"
                : feedback.tone === "success"
                ? "ah-alert--success"
                : ""
            }`}
          >
            <div>
              <p className="ah-alert-title ah-pixel">
                {feedback.tone === "working"
                  ? "Working"
                  : feedback.tone === "success"
                  ? "Recorded"
                  : "Blocked"}
              </p>
              <p className="ah-alert-text">{feedback.message}</p>
            </div>
          </div>
        )}

        <div className="ah-tabs">
          {(
            [
              ["lots", `Lots (${activeCount})`],
              ["haul", `Haul (${state?.inventory.length ?? 0})`],
              ["ledger", "Ledger"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className="ah-tab"
            >
              {label}
            </button>
          ))}
          <p className="ah-sync">
            <span className="ah-dot" aria-hidden="true" />
            {loading && !data ? "Reading ledger…" : "Auto-refresh · 4.5s"}
          </p>
        </div>

        {loading && !data && (
          <Panel title="Ledger">
            <p className="ah-text" style={{ margin: 0 }}>
              Reading the auction ledger…
            </p>
          </Panel>
        )}

        {state && tab === "lots" && (
          <div className="grid grid-cols-1 gap-x-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="ah-lots">
              {lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  now={now}
                  selected={lot.id === selectedLot?.id}
                  onSelect={() => selectLot(lot.id)}
                />
              ))}
            </div>
            <div className="ah-detail-wrap" style={{ marginTop: 0 }}>
              {selectedLot ? (
                <LotDetail lot={selectedLot} now={now} />
              ) : (
                <Panel title="The block">
                  <p className="ah-text" style={{ margin: 0 }}>
                    No lots are on the block. Refresh the ledger.
                  </p>
                </Panel>
              )}
            </div>
          </div>
        )}

        {state && tab === "haul" && <HaulTab onGoToLots={() => setTab("lots")} />}
        {state && tab === "ledger" && <LedgerTab />}

        <div className="ah-foot">
          <p style={{ margin: 0 }}>
            Bids are whole in-game coins. Rival bidders are NPCs and never need
            wallets.
          </p>
          <p style={{ margin: 0 }}>Press E at Rook in the market square</p>
        </div>
      </div>
    </Modal>
  );
}