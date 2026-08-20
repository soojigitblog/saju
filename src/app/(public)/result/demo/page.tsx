import { notFound } from "next/navigation";

/**
 * Demo free-result route — development only.
 * Production: 404
 */
export default function ResultDemoPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  notFound();
}
