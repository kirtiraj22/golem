import { redirect } from "next/navigation";

// LEGACY: The old Cognivirues Outbreak menu remains in ./main.tsx for
// reference. This route is intentionally disabled so the old tutorial,
// journal, and distortion startup flow cannot be launched accidentally.
export default function Page() {
  redirect("/");
}
