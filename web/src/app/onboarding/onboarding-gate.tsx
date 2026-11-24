"use client";

import dynamic from "next/dynamic";
import StartTrading from "./start-trading";

const SolanaProvider = dynamic(() => import("./solana-provider"), {
  ssr: false,
});

type OnboardingGateProps = {
  fontFamily: string;
  initialOpen?: boolean;
};

/**
 * Loads the wallet-adapter stack only in the browser. The server never renders
 * the wallet hooks or touches browser wallet globals.
 */
export default function OnboardingGate(props: OnboardingGateProps) {
  return (
    <SolanaProvider>
      <StartTrading {...props} />
    </SolanaProvider>
  );
}
