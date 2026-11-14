import { redirect } from "next/navigation";

// LEGACY: The old journal/distortion startup route remains in ./main.tsx for
// reference. This route is intentionally disabled.
export default function Page() {
  redirect("/");
}
