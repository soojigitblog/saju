import { redirect } from "next/navigation";

export const metadata = {
  title: "분석 중",
  robots: { index: false, follow: false },
};

/** Legacy path — form now redirects to /fortune/loading/[id]. */
export default function FortuneLoadingPage() {
  redirect("/fortune");
}
