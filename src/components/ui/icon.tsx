import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Check,
	Circle,
	CircleAlert,
	CircleUser,
	ClipboardCheck,
	FileText,
	Hourglass,
	House,
	Info,
	KeyRound,
	LayoutDashboard,
	LayoutGrid,
	Lock,
	Pause,
	Play,
	Plus,
	RotateCcw,
	ScrollText,
	Search,
	TrendingUp,
	TriangleAlert,
	User,
	Users,
	X,
	type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Every icon the app draws, by name. One set (lucide line icons, 2px stroke)
 * so the whole product shares one look; no emoji, which render differently on
 * every phone.
 *
 * Keyed by string rather than passed as components so nav and list data can
 * cross the server → client boundary as plain props.
 */
const ICONS = {
	"arrow-down": ArrowDown,
	"arrow-left": ArrowLeft,
	"arrow-right": ArrowRight,
	"arrow-up": ArrowUp,
	account: CircleUser,
	alert: CircleAlert,
	audit: ScrollText,
	batches: LayoutGrid,
	check: Check,
	circle: Circle,
	dot: Circle,
	home: House,
	hourglass: Hourglass,
	info: Info,
	key: KeyRound,
	lock: Lock,
	overview: LayoutDashboard,
	pause: Pause,
	play: Play,
	plus: Plus,
	profile: User,
	progress: TrendingUp,
	results: ClipboardCheck,
	rewind: RotateCcw,
	search: Search,
	students: Users,
	test: FileText,
	warning: TriangleAlert,
	x: X,
} satisfies Record<string, LucideIcon>;

/** A name from the app's icon set. */
export type IconName = keyof typeof ICONS;

/** Icons drawn solid rather than as an outline. */
const FILLED: ReadonlySet<IconName> = new Set(["dot", "play", "pause"]);

/**
 * An inline SVG icon from the app's set. Sized to the surrounding text
 * (`1em`) and coloured by it (`currentColor`), so it drops in wherever a text
 * glyph sat. Always decorative: the word next to it carries the meaning.
 *
 * @param name Which icon — see {@link IconName}.
 * @param className Extra classes, e.g. `size-6` to break from the text size.
 * @param strokeWidth Line weight; 2 by default, 3 for small bold marks.
 *
 * @example
 * <span className="text-success"><Icon name="check" /> Correct</span>
 */
export function Icon({
	name,
	className,
	strokeWidth = 2,
}: {
	name: IconName;
	className?: string;
	strokeWidth?: number;
}) {
	const Svg = ICONS[name];
	return (
		<Svg
			aria-hidden="true"
			focusable="false"
			strokeWidth={strokeWidth}
			fill={FILLED.has(name) ? "currentColor" : "none"}
			className={cn("inline-block size-[1em] shrink-0 align-[-0.125em]", className)}
		/>
	);
}
