import type { Metadata } from "next";
import { Onboarding } from "@/components/views/onboarding";

export const metadata: Metadata = { title: "Set up workspace" };

export default function OnboardingPage() {
  return <Onboarding />;
}
