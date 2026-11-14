import TitleScreen from "./title-screen";

// LEGACY: The Cognivirues Outbreak startup/tutorial flow is preserved in
// ./menu/main.tsx for reference, but is intentionally not imported here.
// The active homepage starts directly with The Copper Stall title screen.
export default function Home() {
  return <TitleScreen />;
}
