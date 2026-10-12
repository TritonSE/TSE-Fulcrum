import { LoadingSpinner } from "@tritonse/tse-constellation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { twMerge } from "tailwind-merge";

import api from "../api";
import { useAlerts } from "../hooks/alerts";

import type { Pipeline, PipelineIdentifier, Stats } from "../api";

// Validated categorical slots (light mode). Slot 3 is below 3:1 contrast, so every chart
// card offers a table view as relief.
const SERIES_1 = "#2a78d6";
const SERIES_2 = "#eb6834";
const SERIES_3 = "#1baf7a";

const GRID_COLOR = "#e6e5e1";
const AXIS_TEXT = "#52514e";
const AXIS_TICK = { fill: AXIS_TEXT, fontSize: 12 };
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: `1px solid ${GRID_COLOR}`,
  fontSize: 13,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
};

const HISTOGRAM_BINS = 10;
const STATS_REFRESH_INTERVAL_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type TableData = {
  columns: string[];
  rows: (string | number)[][];
};

function ChartCard({
  title,
  subtitle,
  table,
  controls,
  filters,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  table: TableData;
  controls?: React.ReactNode;
  // Shown under the header, in both chart and table views
  filters?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      className={twMerge(
        "tw:bg-white tw:rounded-xl tw:border tw:border-gray-20 tw:p-5 tw:flex tw:flex-col tw:gap-3",
        className,
      )}
    >
      <div className="tw:flex tw:flex-row tw:justify-between tw:items-start tw:gap-3">
        <div>
          <h3 className="tw:!text-base tw:font-semibold tw:!m-0">{title}</h3>
          {subtitle && <p className="tw:text-sm tw:text-gray-60 tw:!m-0">{subtitle}</p>}
        </div>
        <div className="tw:flex tw:flex-row tw:items-center tw:gap-3">
          {controls}
          <button
            type="button"
            className="tw:text-sm tw:text-link tw:underline tw:whitespace-nowrap"
            onClick={() => setShowTable(!showTable)}
          >
            {showTable ? "Show chart" : "Show table"}
          </button>
        </div>
      </div>
      {filters}
      {showTable ? (
        <div className="tw:max-h-80 tw:overflow-auto">
          <table className="tw:w-full tw:text-sm">
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th
                    key={column}
                    className="tw:text-left tw:font-semibold tw:py-1 tw:pr-4 tw:border-b tw:border-gray-20"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, i) => (
                    <td
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="tw:py-1 tw:pr-4 tw:border-b tw:border-gray-20/60 tw:tabular-nums"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="tw:bg-white tw:rounded-xl tw:border tw:border-gray-20 tw:px-5 tw:py-4">
      <p className="tw:text-sm tw:text-gray-60 tw:!m-0">{label}</p>
      <p className="tw:text-3xl tw:font-semibold tw:!m-0 tw:tabular-nums">{value}</p>
    </div>
  );
}

function HorizontalBarChart({
  data,
  valueLabel,
  secondaryLabel,
}: {
  data: { label: string; value: number; secondary?: number }[];
  valueLabel: string;
  // When set, each row's `secondary` value is stacked after `value` as a second series.
  secondaryLabel?: string;
}) {
  const stacked = secondaryLabel !== undefined;
  // Size the chart to its rows so long category lists don't get squished.
  const height = Math.max(120, data.length * 32 + 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={180}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} />
        {stacked && <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: AXIS_TEXT }} />}
        <Bar
          dataKey="value"
          name={valueLabel}
          stackId="a"
          fill={SERIES_1}
          radius={stacked ? undefined : [0, 4, 4, 0]}
          maxBarSize={20}
          label={stacked ? undefined : { position: "right", fill: AXIS_TEXT, fontSize: 12 }}
          stroke={stacked ? "#fff" : undefined}
          strokeWidth={stacked ? 2 : undefined}
        />
        {stacked && (
          <Bar
            dataKey="secondary"
            name={secondaryLabel}
            stackId="a"
            fill={SERIES_2}
            maxBarSize={20}
            stroke="#fff"
            strokeWidth={2}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

type Granularity = "day" | "hour";

// Bucket keys are wall-clock times in the server's timezone ("yyyy-MM-dd" or "yyyy-MM-ddTHH"),
// which are treated as UTC here so stepping and formatting don't shift them.
const GRANULARITIES: Record<Granularity, { stepMs: number; keyLength: number; suffix: string }> = {
  day: { stepMs: DAY_MS, keyLength: 10, suffix: "T00:00:00Z" },
  hour: { stepMs: HOUR_MS, keyLength: 13, suffix: ":00:00Z" },
};

// Count applications per bucket for applicants who applied to any of the selected roles,
// filling in missing buckets between the first and last application with zero counts.
// Buckets must be sorted by key.
function countBuckets(
  buckets: { key: string; roles: PipelineIdentifier[]; count: number }[],
  selectedRoles: Set<PipelineIdentifier>,
  granularity: Granularity,
) {
  if (buckets.length === 0) {
    return [];
  }
  const { stepMs, keyLength, suffix } = GRANULARITIES[granularity];
  const counts = new Map<string, number>();
  for (const { key, roles, count } of buckets) {
    if (roles.some((role) => selectedRoles.has(role))) {
      counts.set(key, (counts.get(key) ?? 0) + count);
    }
  }
  const result: { key: string; count: number; total: number }[] = [];
  const start = Date.parse(`${buckets[0].key}${suffix}`);
  const end = Date.parse(`${buckets[buckets.length - 1].key}${suffix}`);
  let total = 0;
  for (let t = start; t <= end; t += stepMs) {
    const key = new Date(t).toISOString().slice(0, keyLength);
    const count = counts.get(key) ?? 0;
    total += count;
    result.push({ key, count, total });
  }
  return result;
}

const formatBucket = (key: string, granularity: Granularity) =>
  new Date(`${key}${GRANULARITIES[granularity].suffix}`).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: granularity === "hour" ? "numeric" : undefined,
    timeZone: "UTC",
  });

const formatNumber = (n: number) => Number(n.toFixed(1)).toString();

function binScores(scores: number[], maxScore: number | null) {
  if (scores.length === 0) {
    return [];
  }
  const top = maxScore ?? Math.max(...scores, 1);
  const width = top / HISTOGRAM_BINS;
  const counts = Array.from({ length: HISTOGRAM_BINS }, () => 0);
  for (const score of scores) {
    // Scores at (or above) the top go in the last bin.
    counts[Math.min(HISTOGRAM_BINS - 1, Math.max(0, Math.floor(score / width)))]++;
  }
  return counts.map((count, i) => ({
    range: `${formatNumber(i * width)}–${formatNumber((i + 1) * width)}`,
    count,
  }));
}

function ScoreHistogram({ stage }: { stage: Stats["scoresByStage"][number] & { label: string } }) {
  const bins = binScores(stage.scores, stage.maxScore);
  const mean =
    stage.scores.length > 0 ? stage.scores.reduce((a, b) => a + b, 0) / stage.scores.length : null;

  return (
    <ChartCard
      title={stage.label}
      subtitle={`${stage.scores.length} applicants${mean === null ? "" : ` · mean ${formatNumber(mean)}`}${
        stage.maxScore === null ? "" : ` · max ${formatNumber(stage.maxScore)}`
      }`}
      table={{ columns: ["Score", "Applicants"], rows: bins.map((b) => [b.range, b.count]) }}
    >
      {bins.length === 0 ? (
        <p className="tw:text-sm tw:text-gray-60 tw:!m-0">No reviews yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ top: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="range"
              tick={{ ...AXIS_TICK, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} />
            <Bar dataKey="count" name="Applicants" fill={SERIES_1} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function FunnelChart({
  pipelineName,
  funnel,
}: {
  pipelineName: string;
  funnel: Stats["funnel"][number];
}) {
  const data = funnel.stages.map((stage) => ({
    ...stage,
    stageName: stage.stageName.startsWith(`${pipelineName} `)
      ? stage.stageName.slice(pipelineName.length + 1)
      : stage.stageName,
  }));

  return (
    <ChartCard
      title={pipelineName}
      subtitle={`${funnel.stages[0]?.reached ?? 0} applied · ${funnel.accepted} accepted`}
      table={{
        columns: ["Stage", "Reached", "Passed", "Rejected", "Pending"],
        rows: data.map((s) => [s.stageName, s.reached, s.passed, s.rejected, s.pending]),
      }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="stageName" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: AXIS_TEXT }} />
          {/* The white stroke leaves a 2px gap between stacked segments. */}
          <Bar
            dataKey="passed"
            name="Passed"
            stackId="a"
            fill={SERIES_1}
            stroke="#fff"
            strokeWidth={2}
          />
          <Bar
            dataKey="rejected"
            name="Rejected"
            stackId="a"
            fill={SERIES_2}
            stroke="#fff"
            strokeWidth={2}
          />
          <Bar
            dataKey="pending"
            name="Pending"
            stackId="a"
            fill={SERIES_3}
            stroke="#fff"
            strokeWidth={2}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function DashboardView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [cumulative, setCumulative] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [splitByTransfer, setSplitByTransfer] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<PipelineIdentifier>>(() => new Set());
  const { alerts, addAlert } = useAlerts();

  useEffect(() => {
    api
      .getAllPipelines()
      .then((newPipelines) => {
        setPipelines(newPipelines);
        setSelectedRoles(new Set(newPipelines.map((p) => p.identifier)));
      })
      .catch(addAlert);
  }, []);

  useEffect(() => {
    setStats(null);
    // Set on cleanup so a response for a previous year can't overwrite the current one
    let cancelled = false;
    let loaded = false;

    const load = () => {
      api
        .getStats(year)
        .then((newStats) => {
          if (!cancelled) {
            loaded = true;
            setStats(newStats);
          }
        })
        .catch((e) => {
          // Only report failures of the initial load; a failed refresh keeps the stats
          // already on screen and is retried on the next interval.
          if (!cancelled && !loaded) {
            addAlert(e);
          }
        });
    };
    load();

    const interval = setInterval(() => {
      // Don't poll from background tabs
      if (document.visibilityState === "visible") {
        load();
      }
    }, STATS_REFRESH_INTERVAL_MS);
    // Catch up right away when the tab is shown again
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [year]);

  const pipelineNames = useMemo(
    () => Object.fromEntries(pipelines.map((p) => [p.identifier, p.name])),
    [pipelines],
  );
  const nameOf = (identifier: PipelineIdentifier) => pipelineNames[identifier] ?? identifier;

  // Snapshots taken before applicationsByHour existed can only be shown by day
  const hasHourly = stats?.applicationsByHour !== undefined;
  const activeGranularity: Granularity = hasHourly ? granularity : "day";
  const buckets = useMemo(
    () =>
      countBuckets(
        activeGranularity === "hour"
          ? (stats?.applicationsByHour ?? []).map(({ hour, ...rest }) => ({ key: hour, ...rest }))
          : (stats?.applicationsByDay ?? []).map(({ date, ...rest }) => ({ key: date, ...rest })),
        selectedRoles,
        activeGranularity,
      ),
    [stats, selectedRoles, activeGranularity],
  );
  const filteredTotal = buckets.length > 0 ? buckets[buckets.length - 1].total : 0;
  const segmentedControl = <T extends string>(
    options: { value: T; label: string }[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <div className="tw:flex tw:flex-row tw:rounded-md tw:border tw:border-gray-20 tw:text-sm tw:overflow-hidden">
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={twMerge(
            "tw:px-3 tw:py-1 tw:whitespace-nowrap",
            selected === value && "tw:bg-teal-primary tw:text-cream-primary",
          )}
          onClick={() => onSelect(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const toggleRole = (role: PipelineIdentifier) => {
    const next = new Set(selectedRoles);
    if (next.has(role)) {
      next.delete(role);
    } else {
      next.add(role);
    }
    setSelectedRoles(next);
  };

  const yearOptions = Array.from(new Set([year, ...(stats?.availableYears ?? [])])).sort(
    (a, b) => b - a,
  );

  const roleCombos = (stats?.byRoleCombo ?? []).map(({ roles, count }) => ({
    label: roles.map(nameOf).join(" + "),
    value: count,
  }));
  const hearAbout = (stats?.hearAbout ?? []).map(({ source, count }) => ({
    label: source,
    value: count,
  }));
  const yearCount = (stats?.byYear ?? [])
    .map(({ gradeLevel, count, transferCount }) => ({
      label: gradeLevel,
      total: count,
      // Snapshots taken before transferCount existed don't have it
      transfer: transferCount ?? 0,
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  return (
    <>
      {alerts}
      <div className="tw:flex tw:flex-row tw:justify-between tw:items-center tw:mb-8">
        <h2 className="tw:!m-0">Dashboard</h2>
        <label className="tw:flex tw:flex-row tw:items-center tw:gap-2 tw:text-sm">
          Year
          <select
            className="tw:border tw:border-gray-20 tw:rounded-md tw:px-2 tw:py-1 tw:bg-white"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {stats === null ? (
        <div className="tw:flex tw:justify-center tw:py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="tw:flex tw:flex-col tw:gap-8">
          <div className="tw:grid tw:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] tw:gap-4">
            <StatTile label="Total applicants" value={stats.totalApplicants} />
            {stats.byPipeline.map(({ pipelineIdentifier, count }) => (
              <StatTile key={pipelineIdentifier} label={nameOf(pipelineIdentifier)} value={count} />
            ))}
          </div>

          <div className="tw:grid tw:grid-cols-1 tw:xl:grid-cols-3 tw:gap-4">
            <ChartCard
              title="Applicants by role combination"
              subtitle="Each applicant is counted once, under the exact set of roles they applied to"
              table={{
                columns: ["Roles", "Applicants"],
                rows: roleCombos.map((r) => [r.label, r.value]),
              }}
            >
              <HorizontalBarChart data={roleCombos} valueLabel="Applicants" />
            </ChartCard>

            <ChartCard
              title="How applicants heard about TSE"
              subtitle="Applicants can pick more than one source"
              table={{
                columns: ["Source", "Applicants"],
                rows: hearAbout.map((r) => [r.label, r.value]),
              }}
            >
              <HorizontalBarChart data={hearAbout} valueLabel="Applicants" />
            </ChartCard>
            <ChartCard
              title="Applicants by Year"
              subtitle="Applicants can pick more than one source"
              table={
                splitByTransfer
                  ? {
                      columns: ["Year", "Non-transfer", "Transfer", "Total"],
                      rows: yearCount.map((r) => [
                        r.label,
                        r.total - r.transfer,
                        r.transfer,
                        r.total,
                      ]),
                    }
                  : {
                      columns: ["Year", "Applicants"],
                      rows: yearCount.map((r) => [r.label, r.total]),
                    }
              }
              controls={
                <label className="tw:flex tw:flex-row tw:items-center tw:gap-1.5 tw:text-sm tw:whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={splitByTransfer}
                    onChange={(e) => setSplitByTransfer(e.target.checked)}
                  />
                  Split by transfer
                </label>
              }
            >
              {splitByTransfer ? (
                <HorizontalBarChart
                  data={yearCount.map((r) => ({
                    label: r.label,
                    value: r.total - r.transfer,
                    secondary: r.transfer,
                  }))}
                  valueLabel="Non-transfer"
                  secondaryLabel="Transfer"
                />
              ) : (
                <HorizontalBarChart
                  data={yearCount.map((r) => ({ label: r.label, value: r.total }))}
                  valueLabel="Applicants"
                />
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Applications over time"
            subtitle={`${cumulative ? "Running total" : `Applications per ${activeGranularity}`} · ${filteredTotal} applicants who applied to any selected role`}
            table={{
              columns: [
                activeGranularity === "hour" ? "Hour" : "Date",
                "Applications",
                "Running total",
              ],
              rows: buckets.map((b) => [
                activeGranularity === "hour" ? `${b.key.replace("T", " ")}:00` : b.key,
                b.count,
                b.total,
              ]),
            }}
            filters={
              <div className="tw:flex tw:flex-row tw:flex-wrap tw:gap-2">
                {pipelines.map((pipeline) => {
                  const selected = selectedRoles.has(pipeline.identifier);
                  return (
                    <button
                      key={pipeline.identifier}
                      type="button"
                      aria-pressed={selected}
                      className={twMerge(
                        "tw:text-sm tw:px-3 tw:py-1 tw:rounded-full tw:border",
                        selected
                          ? "tw:bg-teal-primary tw:border-teal-primary tw:text-cream-primary"
                          : "tw:border-gray-20 tw:text-gray-60",
                      )}
                      onClick={() => toggleRole(pipeline.identifier)}
                    >
                      {pipeline.name}
                    </button>
                  );
                })}
              </div>
            }
            controls={
              <>
                {hasHourly &&
                  segmentedControl<Granularity>(
                    [
                      { value: "day", label: "By day" },
                      { value: "hour", label: "By hour" },
                    ],
                    activeGranularity,
                    setGranularity,
                  )}
                {segmentedControl(
                  [
                    { value: "count", label: `Per ${activeGranularity}` },
                    { value: "total", label: "Cumulative" },
                  ],
                  cumulative ? "total" : "count",
                  (value) => setCumulative(value === "total"),
                )}
              </>
            }
          >
            {buckets.length === 0 ? (
              <p className="tw:text-sm tw:text-gray-60 tw:!m-0">No applications yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={buckets} margin={{ top: 8, right: 16 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="key"
                    tickFormatter={(key: string) => formatBucket(key, activeGranularity)}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={40}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => formatBucket(String(label), activeGranularity)}
                    cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
                  />
                  <Line
                    dataKey={cumulative ? "total" : "count"}
                    name={cumulative ? "Running total" : "Applications"}
                    stroke={SERIES_1}
                    strokeWidth={2}
                    // Hourly data has too many points for per-point dots to be readable
                    dot={activeGranularity === "day"}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <section className="tw:flex tw:flex-col tw:gap-4">
            <h3 className="tw:!text-lg tw:font-semibold tw:!m-0">Advancement by pipeline</h3>
            <div className="tw:grid tw:grid-cols-1 tw:xl:grid-cols-2 tw:gap-4">
              {stats.funnel.map((funnel) => (
                <FunnelChart
                  key={funnel.pipelineIdentifier}
                  pipelineName={nameOf(funnel.pipelineIdentifier)}
                  funnel={funnel}
                />
              ))}
            </div>
          </section>

          <section className="tw:flex tw:flex-col tw:gap-4">
            <h3 className="tw:!text-lg tw:font-semibold tw:!m-0">Score distribution by stage</h3>
            <p className="tw:text-sm tw:text-gray-60 tw:!m-0">
              Average weighted score per applicant, using the same formula as the stage tables.
              Applicants with no completed reviews count as 0.
            </p>
            <div className="tw:grid tw:grid-cols-1 tw:lg:grid-cols-2 tw:2xl:grid-cols-3 tw:gap-4">
              {stats.scoresByStage.map((stage) => (
                <ScoreHistogram key={stage.stageId} stage={{ ...stage, label: stage.stageName }} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
