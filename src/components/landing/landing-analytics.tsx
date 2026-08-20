"use client";

import { useEffect } from "react";
import { trackClientEvent } from "@/lib/analytics/client";

export function LandingAnalytics() {
  useEffect(() => {
    trackClientEvent({ eventName: "landing_view", path: "/" });
  }, []);
  return null;
}
