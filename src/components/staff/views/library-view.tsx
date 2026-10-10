"use client";

import Link from "next/link";

import { LibraryBrowser } from "@/components/admin/library-browser";
import { Button } from "@/components/ui/button";
import { filtersFromQuery } from "@/lib/library-filters";
import { pageData, useAdminData } from "@/components/staff/staff-data";

/**
 * Screen 26 — Test library (M5-08, filters M10-02).
 *
 * Loads every test once; `LibraryBrowser` filters it in the browser by skill,
 * variant (Academic / General Training), difficulty, type and status, plus a
 * search. The URL query only sets where the filters *start*, so a shared link
 * opens already filtered. Answer-key completeness is on each test's key page,
 * which reads the key itself.
 */
export function LibraryView({ query }: { query: Record<string, string | undefined> }) {
	const rows = pageData(useAdminData().library, "/admin/overview");

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="m-0 text-h1">Test library</h1>
				<Button asChild>
					<Link href="/admin/library/new">Create test</Link>
				</Button>
			</div>
			<LibraryBrowser rows={rows} initial={filtersFromQuery(query)} />
		</div>
	);
}
