import { redirect } from "next/navigation";

/** The bare application URL always enters through the authentication flow. */
export default function Home() {
	redirect("/login");
}
