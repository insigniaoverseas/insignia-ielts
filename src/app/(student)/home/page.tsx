import type { Metadata } from "next";
import { HomeView } from "@/components/student/views/home-view";

export const metadata: Metadata = { title: "Home" };

/** The data comes from the student layout's bundle — no query here. */
export default function HomePage() {
	return <HomeView />;
}
