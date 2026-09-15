"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Table — shadcn/ui, restyled to the tokens (M0-03).
 * Section 12 of "00 Design System.dc.html": sticky header, multi-select,
 * sort, pagination, sticky bulk-action bar.
 *
 * Staff-only. `text-small` (14px) appears here and nowhere on the student side.
 * A table is never the right answer for a student screen — use cards.
 */

/** Wraps the table in the bordered card the design shows it inside. */
function TableCard({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="table-card"
			className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}
			{...props}
		/>
	);
}

/** The search + filter-chip strip above the table. */
function TableToolbar({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="table-toolbar"
			className={cn("flex flex-wrap items-center gap-4 border-b border-line px-6 py-4", className)}
			{...props}
		/>
	);
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
	return (
		<div data-slot="table-container" className="relative w-full overflow-x-auto">
			<table
				data-slot="table"
				className={cn("w-full caption-bottom border-collapse text-body", className)}
				{...props}
			/>
		</div>
	);
}

/**
 * The header row group.
 *
 * @param sticky - Keep the header visible while a long list scrolls. Needs a
 *   scroll container with a bounded height around the table.
 */
function TableHeader({
	className,
	sticky = false,
	...props
}: React.ComponentProps<"thead"> & { sticky?: boolean }) {
	return (
		<thead
			data-slot="table-header"
			className={cn("bg-bg", sticky && "sticky top-0 z-10", className)}
			{...props}
		/>
	);
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn("border-t border-line bg-bg font-semibold", className)}
			{...props}
		/>
	);
}

/**
 * A table row.
 *
 * @param selected - Tints the row brand-soft. Keep it in step with the row's
 *   checkbox: the tint is a second cue, never the only one.
 */
function TableRow({
	className,
	selected,
	...props
}: React.ComponentProps<"tr"> & { selected?: boolean }) {
	return (
		<tr
			data-slot="table-row"
			data-state={selected ? "selected" : undefined}
			aria-selected={selected}
			className={cn(
				"border-t border-line transition-colors",
				selected ? "bg-brand-soft" : "hover:bg-bg",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * A header cell.
 *
 * @param sorted - `asc` or `desc`. Sets `aria-sort` and shows the arrow, so the
 *   sort state is announced rather than only drawn.
 */
function TableHead({
	className,
	sorted,
	children,
	...props
}: React.ComponentProps<"th"> & { sorted?: "asc" | "desc" }) {
	return (
		<th
			data-slot="table-head"
			aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
			className={cn(
				"px-4 py-3 text-left align-middle text-small font-semibold text-ink-2 whitespace-nowrap",
				"first:pl-6 last:pr-6",
				"[&:has([role=checkbox])]:w-12",
				className,
			)}
			{...props}
		>
			{children}
			{sorted ? (
				<span aria-hidden="true" className="ml-1">
					{sorted === "asc" ? "↑" : "↓"}
				</span>
			) : null}
		</th>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			data-slot="table-cell"
			className={cn("px-4 py-4 align-middle first:pl-6 last:pr-6", className)}
			{...props}
		/>
	);
}

/** Pagination strip: "1–3 of 248" on the left, Previous/Next on the right. */
function TablePagination({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="table-pagination"
			className={cn(
				"flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-3 text-small text-ink-2",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * The bulk-action bar that appears when rows are selected.
 *
 * Dark (`--color-ink`) so it reads as a temporary mode rather than part of the
 * table. It must always say how many rows are affected — a bulk action that
 * doesn't state its blast radius is how 248 students get deactivated at once.
 */
function TableBulkActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="table-bulk-actions"
			role="region"
			aria-label="Bulk actions"
			className={cn(
				"sticky bottom-0 flex flex-wrap items-center justify-between gap-4 bg-ink px-6 py-4 text-white shadow-soft",
				className,
			)}
			{...props}
		/>
	);
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("mt-4 text-small text-ink-2", className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableBody,
	TableBulkActions,
	TableCaption,
	TableCard,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TablePagination,
	TableRow,
	TableToolbar,
};
