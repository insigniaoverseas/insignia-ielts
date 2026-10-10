import type { Metadata } from "next";
import { PlansView } from "@/components/staff/views/plans-view";

export const metadata: Metadata = { title: "Plans & validity" };

/** Screen 24. The data comes from the layout's bundle — no query here. */
export default function PlansPage() {
	return <PlansView />;
}
