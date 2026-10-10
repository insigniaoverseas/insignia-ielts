import type { Metadata } from "next";
import { ResultsIndexView } from "@/components/staff/views/results-index-view";

export const metadata: Metadata = { title: "Results", robots: { index: false, follow: false } };

/** `/teacher/results`. The data comes from the layout's bundle — no query here. */
export default function ResultsIndexPage() {
	return <ResultsIndexView />;
}
