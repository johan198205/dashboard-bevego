"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
	value: "ga4" | "bq";
};

export default function SourceToggle({ value }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	// Feature flag: temporarily disable BigQuery in UI (GA4-only)
	const enableBq = process.env.NEXT_PUBLIC_ENABLE_BQ === "true";

	const setParam = useCallback(
		(key: string, val: string | null) => {
			const sp = new URLSearchParams(searchParams?.toString());
			if (val === null) sp.delete(key);
			else sp.set(key, val);
			return sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
		},
		[pathname, searchParams],
	);

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				className={`rounded-md border px-3 py-1 text-sm ${value === "ga4" ? "bg-primary text-white" : "bg-white dark:bg-dark-2"}`}
				onClick={() => router.push(setParam("ds", "ga4"), { scroll: false })}
			>
				GA4
			</button>
			{enableBq ? (
				<button
					type="button"
					className={`rounded-md border px-3 py-1 text-sm ${value === "bq" ? "bg-primary text-white" : "bg-white dark:bg-dark-2"}`}
					onClick={() => router.push(setParam("ds", "bq"), { scroll: false })}
				>
					BigQuery
				</button>
			) : null}
		</div>
	);
}

