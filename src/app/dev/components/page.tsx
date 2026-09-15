import type { Metadata } from "next";
import { AccuracyBars } from "@/components/ui/accuracy-bars";
import { AnswerLine, BandScore } from "@/components/ui/band-score";
import { BandTrendChart } from "@/components/ui/band-trend-chart";
import { Banner } from "@/components/ui/banner";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { StudentTabBar } from "@/components/ui/student-tab-bar";
import { Countdown } from "@/components/player/countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioDemo, DialogDemo, NavigatorDemo, PinDemo, TableDemo, ToastDemo, WidgetsDemo } from "./demos";

/*
 * /dev/components — the design system, live (MVP-1 D13, task M0-23).
 * The in-repo successor to "Design files/Prioritizing project scope/00 Design System.dc.html",
 * and laid out in the same section order so the two can be compared side by side.
 *
 * Demo content only. No real test data, no answers, nothing authenticated.
 */

export const metadata: Metadata = {
	title: "Design system",
	robots: { index: false, follow: false },
};

const SWATCHES: { token: string; hex: string; use: string; className: string }[] = [
	{ token: "brand", hex: "#1D4ED8", use: "Primary buttons, links, focus", className: "bg-brand" },
	{ token: "brand-hover", hex: "#1E40AF", use: "Hover, pressed", className: "bg-brand-hover" },
	{ token: "brand-soft", hex: "#EFF4FF", use: "Selected rows, info panels", className: "bg-brand-soft" },
	{ token: "success", hex: "#15803D", use: "Correct, passed, active plan", className: "bg-success" },
	{ token: "success-soft", hex: "#ECFDF3", use: "Correct-answer rows", className: "bg-success-soft" },
	{ token: "warning", hex: "#B45309", use: "Expiring soon, time low", className: "bg-warning" },
	{ token: "warning-soft", hex: "#FFFBEB", use: "Warning banners", className: "bg-warning-soft" },
	{ token: "danger", hex: "#B42318", use: "Wrong, expired, destructive", className: "bg-danger" },
	{ token: "danger-soft", hex: "#FEF3F2", use: "Wrong-answer rows", className: "bg-danger-soft" },
	{ token: "ink", hex: "#111827", use: "Primary text", className: "bg-ink" },
	{ token: "ink-2", hex: "#4B5563", use: "Secondary text", className: "bg-ink-2" },
	{ token: "ink-3", hex: "#9CA3AF", use: "Hints, placeholders, disabled", className: "bg-ink-3" },
	{ token: "line", hex: "#E5E7EB", use: "Borders, dividers", className: "bg-line" },
	{ token: "surface", hex: "#FFFFFF", use: "Cards, inputs", className: "bg-surface border-b border-line" },
	{ token: "bg", hex: "#F7F8FA", use: "Page background", className: "bg-bg border-b border-line" },
];

const DARK_SWATCHES = ["brand", "brand-soft", "success", "warning", "danger", "ink", "surface", "bg"] as const;
const DARK_CLASS: Record<(typeof DARK_SWATCHES)[number], string> = {
	brand: "bg-brand",
	"brand-soft": "bg-brand-soft",
	success: "bg-success",
	warning: "bg-warning",
	danger: "bg-danger",
	ink: "bg-ink",
	surface: "bg-surface border border-line",
	bg: "bg-bg border border-line",
};

const TYPE_SCALE: { spec: string; className: string; sample: string }[] = [
	{ spec: "hero 64/1 700", className: "text-hero font-bold tabular-nums", sample: "6.5" },
	{ spec: "display 32/40 700", className: "text-display", sample: "Band 6.5" },
	{ spec: "h1 24/32 700", className: "text-h1", sample: "Reading Test 4" },
	{ spec: "h2 20/28 600", className: "text-h2", sample: "What to practise" },
	{ spec: "h3 17/24 600", className: "text-h3", sample: "Listening Mock Test 2" },
	{ spec: "body 16/26 400", className: "text-body", sample: "The timer will not stop once you begin. Never below 16px for students." },
	{ spec: "body-strong 600", className: "text-body font-semibold", sample: "Your answer" },
	{ spec: "small 14/20 400", className: "text-small text-ink-2", sample: "Last active 2 hours ago — admin and teacher only" },
	{ spec: "mono 16/24 500", className: "font-mono font-medium", sample: "28:14 · +91 98200 11234" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
	return (
		<section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-6">
			<h2 id={`${id}-title`} className="m-0 text-h2">
				{title}
			</h2>
			{children}
		</section>
	);
}

const card = "flex flex-col gap-4 rounded-card border border-line bg-surface p-6";
const caption = "font-mono text-small text-ink-3";

export default function DesignSystemPage() {
	return (
		<main className="mx-auto flex max-w-[1200px] flex-col gap-16 px-6 pt-12 pb-24">
			<header className="flex flex-col gap-4 border-b border-line pb-8">
				<div className="flex items-center gap-3">
					<div className="grid size-9 place-items-center rounded-control bg-brand text-h3 font-bold text-white">B</div>
					<span className="text-small font-semibold tracking-[0.08em] text-ink-2 uppercase">Screen 00 · live</span>
				</div>
				<h1 className="m-0 text-display">IELTS Practice Platform — Design System</h1>
				<p className="m-0 max-w-[70ch] text-passage text-ink-2">
					Calm, confident, encouraging. Everything on the student side is built around one rule: a 10-year-old must be
					able to use it without being told how. One obvious action per screen, words over icons, nothing below 16px.
				</p>
				<Banner tone="info">
					This page is the running app&apos;s version of <code>00 Design System.dc.html</code>, in the same section
					order. Generic primitives (button, input, card, table, dialog, toast) are shadcn/ui restyled to the tokens.
				</Banner>
			</header>

			<Section id="colour" title="A2 · Colour">
				<div className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-4">
					{SWATCHES.map((s) => (
						<div key={s.token} className="overflow-hidden rounded-card border border-line bg-surface">
							<div className={`h-18 ${s.className}`} />
							<div className="flex flex-col gap-1 p-3">
								<span className="font-semibold">{s.token}</span>
								<span className="font-mono text-small text-ink-2">{s.hex}</span>
								<span className="text-small text-ink-2">{s.use}</span>
							</div>
						</div>
					))}
				</div>
				<Banner tone="info">
					Colour never carries meaning alone. Correct and wrong always pair colour with a mark (✓ / ✕) <em>and</em> a
					word. Some students are colour-blind; all of them are stressed.
				</Banner>
				<div data-theme="dark" className="flex flex-col gap-4 rounded-card border border-line bg-bg p-6 text-ink">
					<h3 className="m-0 text-h3">Dark theme palette — opt-in, not used by any screen yet</h3>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(min(148px,100%),1fr))] gap-3">
						{DARK_SWATCHES.map((t) => (
							<div key={t} className="flex flex-col gap-2">
								<div className={`h-12 rounded-control ${DARK_CLASS[t]}`} />
								<span className="font-mono text-small text-ink-2">{t}</span>
							</div>
						))}
					</div>
				</div>
			</Section>

			<Section id="type" title="A3 · Typography — Inter, IBM Plex Mono for numbers">
				<div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-8">
					{TYPE_SCALE.map((t, i) => (
						<div
							key={t.spec}
							className={`flex flex-wrap items-baseline gap-6 ${i < TYPE_SCALE.length - 1 ? "border-b border-line pb-6" : ""}`}
						>
							<span className="w-40 flex-none font-mono text-small text-ink-3">{t.spec}</span>
							<span className={t.className}>{t.sample}</span>
						</div>
					))}
				</div>
				<div className="max-w-[70ch] rounded-card border border-line bg-surface p-8">
					<span className="mb-3 block font-mono text-small text-ink-3">passage / question text — 17px, 1.7, ~70ch</span>
					<p className="m-0 text-passage text-pretty">
						Urban beekeeping has grown quickly over the past decade, and city councils across Europe now report more
						registered hives than at any point since records began. This is a reading test — legibility is the product.
					</p>
				</div>
			</Section>

			<Section id="space" title="A4 · Space, shape, depth">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
					<div className={card}>
						<h3 className="m-0 text-h3">Spacing — 8pt scale</h3>
						<div className="flex items-end gap-3">
							{[
								["size-1", "4"],
								["size-2", "8"],
								["size-3", "12"],
								["size-4", "16"],
								["size-6", "24"],
								["size-8", "32"],
								["size-12", "48"],
								["size-16", "64"],
							].map(([cls, label]) => (
								<div key={label} className="flex flex-col items-center gap-2">
									<div className={`${cls} bg-brand`} />
									<span className="font-mono text-small text-ink-2">{label}</span>
								</div>
							))}
						</div>
					</div>
					<div className={card}>
						<h3 className="m-0 text-h3">Radius &amp; elevation</h3>
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex flex-col items-center gap-2">
								<div className="h-14 w-18 rounded-control border border-brand-line bg-brand-soft" />
								<span className="font-mono text-small text-ink-2">8 · control</span>
							</div>
							<div className="flex flex-col items-center gap-2">
								<div className="h-14 w-18 rounded-card border border-brand-line bg-brand-soft" />
								<span className="font-mono text-small text-ink-2">12 · card</span>
							</div>
							<div className="flex flex-col items-center gap-2">
								<div className="h-8 w-18 rounded-full border border-brand-line bg-brand-soft" />
								<span className="font-mono text-small text-ink-2">full · pill</span>
							</div>
							<div className="flex flex-col items-center gap-2">
								<div className="h-14 w-18 rounded-card border border-line bg-surface shadow-soft" />
								<span className="font-mono text-small text-ink-2">shadow-soft</span>
							</div>
						</div>
						<p className="m-0 text-ink-2">
							Cards are a 1px border, never a shadow. The one soft shadow is reserved for modals, dropdowns and sticky
							bars.
						</p>
					</div>
				</div>
			</Section>

			<Section id="buttons" title="1 · Buttons">
				<div className={card}>
					<span className={caption}>Primary — student, 56px</span>
					<div className="flex flex-wrap items-start gap-4">
						{(
							[
								["default", {}],
								["hover", { className: "bg-brand-hover" }],
								["focus ring", { className: "outline-2 outline-offset-2 outline-brand outline-solid" }],
								["disabled", { disabled: true }],
								["loading", { loading: true }],
							] as const
						).map(([label, props]) => (
							<div key={label} className="flex flex-col items-center gap-2">
								<Button size="student" {...props}>
									{label === "loading" ? "Starting…" : "Start Test"}
								</Button>
								<span className={caption}>{label}</span>
							</div>
						))}
					</div>
					<span className={caption}>Secondary · Ghost · Danger — admin, 40px</span>
					<div className="flex flex-wrap gap-4">
						<Button variant="secondary">Secondary</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="danger">Deactivate</Button>
						<Button variant="secondary" className="gap-2">
							<span aria-hidden="true">+</span>Add student
						</Button>
					</div>
					<span className={caption}>Full width on mobile</span>
					<Button size="student" className="w-full sm:max-w-sm">
						I&apos;m ready — Start
					</Button>
				</div>
			</Section>

			<Section id="inputs" title="2–3 · Inputs, PIN and phone">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
					<div className={card}>
						<div className="flex flex-col gap-2">
							<Label htmlFor="ds-name">Your name</Label>
							<Input id="ds-name" defaultValue="Priya Sharma" />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="ds-empty">Your name</Label>
							<Input id="ds-empty" placeholder="Type here" />
							<span className={caption}>placeholder — click it to see the focus ring</span>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="ds-error">Your name</Label>
							<Input id="ds-error" aria-invalid aria-describedby="ds-error-msg" />
							<span id="ds-error-msg" className="flex items-center gap-2 text-danger">
								<span aria-hidden="true">✕</span>Please enter your name.
							</span>
						</div>
						<div className="group flex flex-col gap-2" data-disabled="true">
							<Label htmlFor="ds-disabled">Batch</Label>
							<Input id="ds-disabled" defaultValue="Andheri — Morning" disabled />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="ds-phone">Phone number</Label>
							<PhoneInput id="ds-phone" defaultValue="98200 11234" />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="ds-select">Batch</Label>
							<Select defaultValue="andheri-am">
								<SelectTrigger id="ds-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="andheri-am">Andheri — Morning</SelectItem>
									<SelectItem value="andheri-pm">Andheri — Evening</SelectItem>
									<SelectItem value="bandra-pm">Bandra — Evening</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<PinDemo />
				</div>
			</Section>

			<Section id="pills" title="4–5 · Card, status pills and difficulty">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
					<Card>
						<div className="flex flex-wrap gap-2">
							<Badge variant="brand">Listening</Badge>
							<Badge>Mock test</Badge>
						</div>
						<CardTitle>Listening Mock Test 2</CardTitle>
						<CardDescription>40 questions · 30 minutes · Closes today at 6:00 PM</CardDescription>
						<Button size="student">Start Test</Button>
					</Card>
					<div className={card}>
						<h3 className="m-0 text-h3">Status pills</h3>
						<div className="flex flex-wrap gap-3">
							<StatusPill status="not_started" />
							<StatusPill status="in_progress" />
							<StatusPill status="submitted" />
							<StatusPill status="locked" />
							<StatusPill status="expired" />
							<StatusPill status="active" />
							<StatusPill status="expiring" />
						</div>
						<span className={caption}>small — for admin tables</span>
						<div className="flex flex-wrap gap-3">
							<StatusPill status="expiring" size="sm" label="In 5 days" />
							<StatusPill status="active" size="sm" />
						</div>
					</div>
					<div className={card}>
						<h3 className="m-0 text-h3">Difficulty — word plus three bars</h3>
						<div className="flex flex-wrap gap-3">
							<DifficultyBadge level="easy" />
							<DifficultyBadge level="medium" />
							<DifficultyBadge level="hard" />
						</div>
						<p className="m-0 text-ink-2">Never colour alone: the bar count and the word carry the meaning.</p>
					</div>
				</div>
			</Section>

			<Section id="timer" title="6–7 · Countdown and question navigator">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
					<div className={card}>
						<h3 className="m-0 text-h3">Countdown timer</h3>
						<div className="flex flex-col gap-4">
							{(
								[
									[1694, "Calm — plenty of time"],
									[272, "Under 5 minutes"],
									[48, "Under 1 minute — gentle pulse, never flashing"],
								] as const
							).map(([secs, label]) => (
								<div key={secs} className="flex items-center gap-4">
									<Countdown seconds={secs} note="" />
									<span className="text-ink-2">{label}</span>
								</div>
							))}
						</div>
						<p className="m-0 text-small text-ink-2">Display only — the server owns the clock (MVP-1 §7).</p>
					</div>
					<NavigatorDemo />
				</div>
			</Section>

			<Section id="widgets" title="8 · Answer widgets">
				<WidgetsDemo />
			</Section>

			<Section id="audio" title="9–10 · Audio player and band score">
				<AudioDemo />
				<div className={card}>
					<h3 className="m-0 text-h3">Band score display</h3>
					<div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
						<BandScore band={6.5} descriptor="Good user" />
						<div className="flex flex-col justify-center gap-3">
							<AnswerLine kind="correct" value="twenty" />
							<AnswerLine kind="yours" value="twelve" />
						</div>
					</div>
				</div>
			</Section>

			<Section id="table" title="11–12 · Data table, search and filter chips">
				<TableDemo />
				<p className="m-0 text-small text-ink-2">
					Staff only. Tick rows to see the bulk-action bar; it always states how many rows it will change.
				</p>
			</Section>

			<Section id="feedback" title="13–17 · Modal, toast, banners, empty state, loading">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
					<DialogDemo />
					<ToastDemo />
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
					<div className="flex flex-col gap-4">
						<Banner tone="info">Your next test opens on Monday at 9:00 AM.</Banner>
						<Banner tone="warning" action={<a href="#feedback">Ask your teacher to extend it</a>}>
							Your access ends in 5 days.
						</Banner>
						<Banner tone="danger">Your access has ended. You can still see your old results.</Banner>
					</div>
					<EmptyState
						icon="📄"
						title="No tests for you right now"
						action={<Button size="student">Practice at Home</Button>}
					>
						Your teacher will add one soon. Until then you can practise on your own.
					</EmptyState>
					<div className={card}>
						<span className={caption}>loading — skeleton, never a spinner</span>
						<Skeleton className="h-6 w-3/5" />
						<Skeleton className="h-4 w-[90%]" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-primary" />
					</div>
				</div>
			</Section>

			<Section id="stats" title="18–19 · Stat cards and charts">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
					<StatCard label="Active students" value="248" delta="+12 this week" deltaTone="good" />
					<StatCard label="Tests taken this week" value="613" delta="+8%" deltaTone="good" />
					<StatCard label="Plans expiring in 7 days" value="28" valueTone="attention" delta="Needs action" />
					<StatCard label="Live sessions now" value="3" delta="42 students testing" />
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
					<div className={card}>
						<h3 className="m-0 text-h3">Band over time</h3>
						<BandTrendChart
							title="Band over time"
							series={[
								{
									name: "Reading",
									tone: "brand",
									points: [
										{ label: "May", band: 5.5 },
										{ label: "Jun", band: 5.5 },
										{ label: "Jul", band: 6 },
										{ label: "Aug", band: 6 },
										{ label: "Sep", band: 6.5 },
									],
								},
								{
									name: "Listening",
									tone: "success",
									points: [
										{ label: "May", band: 5 },
										{ label: "Jun", band: 5 },
										{ label: "Jul", band: 5.5 },
										{ label: "Aug", band: 5.5 },
										{ label: "Sep", band: 6 },
									],
								},
							]}
						/>
					</div>
					<div className={card}>
						<h3 className="m-0 text-h3">What to practise</h3>
						<AccuracyBars
							items={[
								{ label: "Multiple choice", percent: 86 },
								{ label: "Gap-fill", percent: 79 },
								{ label: "True/False/Not Given", percent: 41 },
								{ label: "Matching headings", percent: 58 },
							]}
						/>
					</div>
				</div>
			</Section>

			<Section id="nav" title="20 · Navigation">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
					<div className="flex flex-col gap-3">
						<span className={caption}>student — bottom tabs, max 4, always labelled</span>
						<StudentTabBar activeHref="/home" className="max-w-[390px]" />
					</div>
					<div className="flex flex-col gap-3">
						<span className={caption}>teacher / admin — grouped sidebar</span>
						<StaffSidebar
							activeHref="/overview"
							groups={[
								{
									title: "Teach",
									items: [
										{ href: "/overview", label: "Overview", icon: "▦" },
										{ href: "/batches", label: "Batches" },
										{ href: "/assign", label: "Assign a test" },
										{ href: "/live", label: "Live sessions" },
									],
								},
								{
									title: "Manage",
									items: [
										{ href: "/students", label: "Students" },
										{ href: "/plans", label: "Plans & validity" },
										{ href: "/library", label: "Test library" },
									],
								},
							]}
						/>
					</div>
				</div>
			</Section>
		</main>
	);
}
