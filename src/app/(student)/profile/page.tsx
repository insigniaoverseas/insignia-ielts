import type { Metadata } from "next";
import { ProfileView } from "@/components/student/views/profile-view";

export const metadata: Metadata = { title: "Profile" };

/** The data comes from the student layout's bundle — no query here. */
export default function ProfilePage() {
	return <ProfileView />;
}
