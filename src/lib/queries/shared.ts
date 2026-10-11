import "server-only";

import { INSTITUTE_TIME_ZONE, formatTime } from "@/lib/time";
import type { Difficulty, Skill, TestSummary, Variant } from "@/lib/view-models/student";

/** Date-only value for today at the institute, never the Worker's timezone. */
export function instituteToday(now = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: INSTITUTE_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
	return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * When a locked-out student can sign in again, as "4:35 pm" in India, or
 * `null` if they aren't locked out. `locked` is `lockedAccounts()`' map.
 */
export function lockedUntilLabel(locked: ReadonlyMap<string, Date>, email: string): string | null {
	const until = locked.get(email.trim().toLowerCase());
	return until ? formatTime(until) : null;
}

/** Whole calendar days from today in India to a database `date`. */
export function daysUntil(date: string, now = new Date()): number {
	const today = Date.parse(`${instituteToday(now)}T00:00:00Z`);
	const target = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
	return Math.round((target - today) / 86_400_000);
}

/** A compact date used in dense staff tables. */
export function formatShortDate(value: string): string {
	return new Intl.DateTimeFormat("en-IN", {
		timeZone: INSTITUTE_TIME_ZONE,
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

/** A day and month used on student result cards. */
export function formatDayMonth(value: string): string {
	return new Intl.DateTimeFormat("en-IN", {
		timeZone: INSTITUTE_TIME_ZONE,
		day: "numeric",
		month: "long",
	}).format(new Date(value));
}

/** Human duration without trusting a browser clock. */
export function formatDuration(seconds: number): string {
	const safe = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(safe / 60);
	const remainder = safe % 60;
	if (minutes === 0) return `${remainder} sec`;
	return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} sec`;
}

/** A truthful, compact last-active label. */
export function relativeActivity(value: string | null, now = new Date()): string {
	if (!value) return "Never";
	const elapsed = Math.max(0, now.getTime() - new Date(value).getTime());
	const days = Math.floor(elapsed / 86_400_000);
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 14) return "Last week";
	return formatShortDate(value);
}

/** Joins the stored country code and contact number for display. */
export function displayPhone(countryCode: string | null, phone: string | null): string {
	if (!phone) return "Not provided";
	if (phone.startsWith("+")) return phone;
	return [countryCode, phone].filter(Boolean).join(" ");
}

/** Narrows database strings to the two MVP skills. */
export function isSkill(value: string): value is Skill {
	return value === "listening" || value === "reading";
}

/** Builds the public metadata shared by student cards. */
export function testSummary(row: {
	id: string;
	title: string;
	skill: string;
	variant: string;
	difficulty: string;
	total_questions: number;
	duration_seconds: number;
}): TestSummary | null {
	if (!isSkill(row.skill)) return null;
	if (!["academic", "general", "n_a"].includes(row.variant)) return null;
	if (!["easy", "medium", "hard"].includes(row.difficulty)) return null;
	return {
		id: row.id,
		title: row.title,
		skill: row.skill,
		variant: row.variant as Variant,
		difficulty: row.difficulty as Difficulty,
		questionCount: row.total_questions,
		durationMinutes: Math.ceil(row.duration_seconds / 60),
	};
}

/** Throws a context-only error while retaining the database detail in server logs. */
export function queryFailed(context: string, error: { message: string } | null): never {
	console.error(`${context}:`, error?.message ?? "no data returned");
	throw new Error(`Could not load ${context}.`);
}

/** Supabase's API returns at most this many rows per request (`supabase/config.toml` `max_rows`). */
export const API_MAX_ROWS = 1000;

/**
 * Every row of a query, fetched a page at a time.
 *
 * PostgREST **silently truncates** at `max_rows` — a class of 30 students has
 * 1,230 answer rows on a 41-question paper, and a plain `.in(...)` returns the
 * first 1,000 with no error. Use this wherever the row count grows with
 * students × questions. Each page is one subrequest; Workers Free allows 50
 * per request, so this suits thousands of rows, not hundreds of thousands.
 *
 * @param page Builds the query for one inclusive range, e.g.
 *   `(from, to) => supabase.from("answers").select("…").in("attempt_id", ids).order("attempt_id").order("q_number").range(from, to)`.
 *   It **must** have a stable `order`, or pages can overlap and skip rows.
 */
export async function selectAll<T>(
	context: string,
	page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
	const rows: T[] = [];
	for (let from = 0; ; from += API_MAX_ROWS) {
		const { data, error } = await page(from, from + API_MAX_ROWS - 1);
		if (error) queryFailed(context, error);
		rows.push(...(data ?? []));
		if (!data || data.length < API_MAX_ROWS) return rows;
	}
}
