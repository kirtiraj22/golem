import Image from "next/image";
import localFont from "next/font/local";
import OnboardingGate from "./onboarding/onboarding-gate";

const pixelFont = localFont({
  src: "./fonts/GAMERIA.ttf",
  display: "swap",
  fallback: ["monospace"],
});

const INK = "#2b1a08";
const PAPER = "#fff6d6";
const GOLD = "#f4c95d";

type TitleScreenProps = {
  initialOnboardingOpen?: boolean;
};

export default function TitleScreen({
  initialOnboardingOpen = false,
}: TitleScreenProps) {
  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8"
      style={{
        backgroundImage: "url('/title-market.png')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundColor: "#251404",
        imageRendering: "pixelated",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "rgba(28, 18, 8, 0.18)" }}
      />

      <section
        className="relative z-10 w-full max-w-[720px] border-[6px] p-6 sm:p-10"
        style={{
          backgroundColor: PAPER,
          borderColor: INK,
          boxShadow: `8px 8px 0 ${INK}`,
        }}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-5 border-4 p-1"
            style={{
              backgroundColor: GOLD,
              borderColor: INK,
              boxShadow: `4px 4px 0 ${INK}`,
            }}
          >
            <Image
              src="/logo512.png"
              alt=""
              width={80}
              height={80}
              unoptimized
              priority
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <p
            style={{
              color: INK,
              fontFamily: pixelFont.style.fontFamily,
              fontSize: 10,
              letterSpacing: "0.22em",
              lineHeight: 1.6,
              opacity: 0.78,
              textTransform: "uppercase",
            }}
          >
            Rook&apos;s Riverside
          </p>

          <h1
            style={{
              color: INK,
              fontFamily: pixelFont.style.fontFamily,
              fontSize: "clamp(2rem, 7vw, 4.25rem)",
              letterSpacing: "0.04em",
              lineHeight: 1.15,
              marginTop: 8,
              textTransform: "uppercase",
            }}
          >
            Stock Wars
          </h1>

          <div
            aria-hidden
            className="my-4 h-[3px] w-24"
            style={{ backgroundColor: INK }}
          />

          <p
            style={{
              color: INK,
              fontFamily: pixelFont.style.fontFamily,
              fontSize: "clamp(0.8rem, 1.8vw, 1rem)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
              maxWidth: 460,
            }}
          >
            Win the lockup. Flip the loot. Own the row.
          </p>

          <p
            className="mt-5"
            style={{
              color: INK,
              fontFamily: pixelFont.style.fontFamily,
              fontSize: 9,
              letterSpacing: "0.18em",
              lineHeight: 1.6,
              opacity: 0.72,
            }}
          >
            ELECTRONICS &nbsp;·&nbsp; FURNITURE &nbsp;·&nbsp; ANTIQUES
            &nbsp;·&nbsp; TOOLS &nbsp;·&nbsp; COLLECTIBLES &nbsp;·&nbsp; MISC
          </p>

          <OnboardingGate
            fontFamily={pixelFont.style.fontFamily}
            initialOpen={initialOnboardingOpen}
          />

          <p
            className="mt-5"
            style={{
              color: INK,
              fontFamily: pixelFont.style.fontFamily,
              fontSize: 8,
              letterSpacing: "0.16em",
              lineHeight: 1.6,
              opacity: 0.6,
              textTransform: "uppercase",
            }}
          >
            A storage auction empire awaits
          </p>
        </div>
      </section>
    </main>
  );
}
