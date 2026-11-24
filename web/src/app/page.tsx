import TitleScreen from "./title-screen";

// LEGACY: The Cognivirues Outbreak startup/tutorial flow is preserved in
// ./menu/main.tsx for reference, but is intentionally not imported here.
// The active homepage starts directly with The Copper Stall title screen.
type HomeProps = {
  searchParams?: Promise<{
    onboarding?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = searchParams ? await searchParams : {};
  const onboarding = Array.isArray(params.onboarding)
    ? params.onboarding[0]
    : params.onboarding;

  return (
    <TitleScreen initialOnboardingOpen={onboarding === "required"} />
  );
}
