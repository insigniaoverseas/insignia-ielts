import type { Metadata } from "next";
import { ProgressView } from "@/components/student/views/progress-view";

export const metadata: Metadata = { title: "My Progress" };

/** The data comes from the student layout's bundle — no query here. */
export default function ProgressPage() {
	return <ProgressView />;
}
