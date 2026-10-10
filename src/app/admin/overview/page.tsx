import type { Metadata } from "next";
import { OverviewView } from "@/components/staff/views/overview-view";

export const metadata: Metadata = { title: "Overview" };

/** Screen 20. The data comes from the layout's bundle — no query here. */
export default function OverviewPage() {
	return <OverviewView />;
}
