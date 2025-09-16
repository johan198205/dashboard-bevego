import { getSessionsKpi } from "@/lib/resolver";

type Props = {
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	dataSource: "ga4" | "bq";
	className?: string;
};

export default async function SessionsTotalCard({
	startDate,
	endDate,
	dataSource,
	className,
}: Props) {
	const { total_sessions, source_label } = await getSessionsKpi({
		startDate,
		endDate,
		dataSource,
	});

	return (
		<div className={className}>
			<div className="rounded-[10px] border border-[#E8E8E8] bg-white p-5 dark:border-dark-3 dark:bg-dark-2">
				<div className="mb-1 text-body-sm font-medium text-dark dark:text-dark-6">
					Sessions
				</div>
				<div className="text-2xl font-semibold text-dark dark:text-white">
					{Intl.NumberFormat("sv-SE").format(total_sessions)}
				</div>
				<div className="mt-1 text-xs text-dark-4 dark:text-dark-6">
					Källa: {source_label}
				</div>
			</div>
		</div>
	);
}

