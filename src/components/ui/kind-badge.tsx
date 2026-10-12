import { Badge } from "@/components/ui/badge";
import { KIND_LABEL, type TestKind } from "@/lib/test-details";

/** Mock stands out (it counts and is the exam); class and practice are plain labels. */
const VARIANT: Record<TestKind, "brand" | "neutral"> = { mock: "brand", class: "neutral", practice: "neutral" };

/**
 * A test's type — Mock, Class or Practice (M10-17). The word carries the
 * meaning; the brand tint on Mock is only a second cue.
 *
 * @example <KindBadge kind="practice" />
 */
export function KindBadge({ kind, className }: { kind: TestKind; className?: string }) {
	return (
		<Badge variant={VARIANT[kind]} className={className}>
			{KIND_LABEL[kind]}
		</Badge>
	);
}
