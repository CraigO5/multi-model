"use client";

import type { Chat } from "@/types/chat";
import { MODELS } from "@/lib/models";
import {
  CHART_COLORS,
  formatLatency,
  formatUsd,
} from "@/lib/utils";

type AnalyticRow = {
  id: string;
  name: string;
  icon?: string;
  paid: boolean;
  responses: number;
  errors: number;
  successRate: number;
  avgLatencyMs: number;
  avgCost: number;
  avgTokens: number;
  totalCost: number;
  totalTokens: number;
};

type Totals = {
  responses: number;
  errors: number;
  cost: number;
  tokens: number;
};

type Props = {
  chats: Chat[];
  analytics: AnalyticRow[];
  analyticsTotals: Totals;
  bestSpeed: string | undefined;
  cheapest: string | undefined;
  mostUsed: string | undefined;
  chartSeries: Record<string, number[]>;
  chartMaxIdx: number;
  chartMaxVal: number;
  chartMetric: "tokens" | "cost" | "latency";
  setChartMetric: (m: "tokens" | "cost" | "latency") => void;
};

export function AnalyticsView({
  chats,
  analytics,
  analyticsTotals,
  bestSpeed,
  cheapest,
  mostUsed,
  chartSeries,
  chartMaxIdx,
  chartMaxVal,
  chartMetric,
  setChartMetric,
}: Props) {
  const formatMetric = (v: number) => {
    if (chartMetric === "cost") return formatUsd(v);
    if (chartMetric === "latency") return formatLatency(v);
    return v.toLocaleString();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-10 animate-msg-in">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-xl font-light tracking-tight text-zinc-100">
              Analytics
            </h1>
            <p className="text-[11px] text-zinc-600 mt-1">
              Across {chats.length} chat{chats.length === 1 ? "" : "s"} ·{" "}
              {analyticsTotals.responses} responses ·{" "}
              {analyticsTotals.tokens.toLocaleString()} tokens ·{" "}
              {formatUsd(analyticsTotals.cost)}
            </p>
          </div>
        </div>

        {analytics.length === 0 ? (
          <p className="text-zinc-600 text-sm">
            No data yet. Send some messages to see model stats.
          </p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Fastest
                </p>
                <p className="text-sm text-zinc-200 mt-1 truncate">
                  {analytics.find((s) => s.id === bestSpeed)?.name ?? "—"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {bestSpeed
                    ? formatLatency(
                        analytics.find((s) => s.id === bestSpeed)
                          ?.avgLatencyMs ?? 0,
                      )
                    : ""}
                </p>
              </div>
              <div className="border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Cheapest avg
                </p>
                <p className="text-sm text-zinc-200 mt-1 truncate">
                  {analytics.find((s) => s.id === cheapest)?.name ?? "—"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {cheapest
                    ? `${formatUsd(analytics.find((s) => s.id === cheapest)?.avgCost ?? 0)} / msg`
                    : ""}
                </p>
              </div>
              <div className="border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Most used
                </p>
                <p className="text-sm text-zinc-200 mt-1 truncate">
                  {analytics.find((s) => s.id === mostUsed)?.name ?? "—"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {mostUsed
                    ? `${analytics.find((s) => s.id === mostUsed)?.responses} responses`
                    : ""}
                </p>
              </div>
            </div>

            {/* Per-message chart */}
            {Object.keys(chartSeries).length > 0 && (
              <div className="border border-zinc-800 rounded-xl p-4 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Per-message timeline
                  </h2>
                  <div className="flex gap-1 text-[10px] bg-zinc-900 rounded-lg p-0.5">
                    {(["tokens", "cost", "latency"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setChartMetric(m)}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer capitalize ${
                          chartMetric === m
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const W = 800;
                  const H = 240;
                  const PAD = { top: 16, right: 16, bottom: 28, left: 56 };
                  const innerW = W - PAD.left - PAD.right;
                  const innerH = H - PAD.top - PAD.bottom;
                  const x = (i: number) =>
                    PAD.left +
                    (chartMaxIdx > 1
                      ? (i / (chartMaxIdx - 1)) * innerW
                      : innerW / 2);
                  const y = (v: number) =>
                    PAD.top + innerH - (v / chartMaxVal) * innerH;
                  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
                  return (
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      className="w-full h-auto"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {gridSteps.map((p) => {
                        const yPos = PAD.top + innerH * p;
                        const val = chartMaxVal * (1 - p);
                        return (
                          <g key={p}>
                            <line
                              x1={PAD.left}
                              y1={yPos}
                              x2={W - PAD.right}
                              y2={yPos}
                              stroke="#27272a"
                              strokeDasharray="2,3"
                            />
                            <text
                              x={PAD.left - 8}
                              y={yPos + 3}
                              textAnchor="end"
                              fontSize="10"
                              fill="#52525b"
                            >
                              {formatMetric(val)}
                            </text>
                          </g>
                        );
                      })}

                      <text
                        x={(W - PAD.right + PAD.left) / 2}
                        y={H - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#52525b"
                      >
                        response #
                      </text>

                      {Object.entries(chartSeries).map(
                        ([modelId, values], i) => {
                          const color = CHART_COLORS[i % CHART_COLORS.length];
                          if (values.length === 0) return null;
                          const points = values
                            .map((v, idx) => `${x(idx)},${y(v)}`)
                            .join(" ");
                          return (
                            <g key={modelId}>
                              <polyline
                                points={points}
                                stroke={color}
                                fill="none"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                              />
                              {values.map((v, idx) => (
                                <circle
                                  key={idx}
                                  cx={x(idx)}
                                  cy={y(v)}
                                  r="2.5"
                                  fill={color}
                                >
                                  <title>
                                    {MODELS.find((m) => m.id === modelId)
                                      ?.name ?? modelId}{" "}
                                    · #{idx + 1}: {formatMetric(v)}
                                  </title>
                                </circle>
                              ))}
                            </g>
                          );
                        },
                      )}
                    </svg>
                  );
                })()}

                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-3 border-t border-zinc-800">
                  {Object.keys(chartSeries).map((modelId, i) => {
                    const meta = MODELS.find((m) => m.id === modelId);
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <div
                        key={modelId}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-400"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <span className="truncate">
                          {meta?.name ?? modelId}
                        </span>
                        <span className="text-zinc-600">
                          ({chartSeries[modelId].length})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-model table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-600 bg-zinc-900/50">
                    <th className="text-left px-4 py-2.5 font-medium">
                      Model
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium">
                      Responses
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium">
                      Avg latency
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium">
                      Avg tokens
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium">
                      Avg cost
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium">
                      Total cost
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium">
                      Success
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((s, i) => {
                    const successColor =
                      s.successRate >= 95
                        ? "text-zinc-400"
                        : s.successRate >= 80
                          ? "text-yellow-500"
                          : "text-red-400";
                    return (
                      <tr
                        key={s.id}
                        className={`border-t border-zinc-800 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/30"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.icon && (
                              <img
                                src={s.icon}
                                alt={s.name}
                                className="w-4 h-4 rounded-sm shrink-0"
                              />
                            )}
                            {s.paid && (
                              <span className="text-amber-500 text-[10px]">
                                ★
                              </span>
                            )}
                            <span
                              className={
                                s.paid ? "text-amber-200" : "text-zinc-200"
                              }
                            >
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                          {s.responses}
                        </td>
                        <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                          {s.avgLatencyMs > 0
                            ? formatLatency(s.avgLatencyMs)
                            : "—"}
                        </td>
                        <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                          {s.avgTokens > 0
                            ? Math.round(s.avgTokens).toLocaleString()
                            : "—"}
                        </td>
                        <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                          {s.avgCost > 0 ? formatUsd(s.avgCost) : "—"}
                        </td>
                        <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                          {s.totalCost > 0 ? formatUsd(s.totalCost) : "—"}
                        </td>
                        <td
                          className={`text-right px-4 py-3 tabular-nums ${successColor}`}
                        >
                          {Math.round(s.successRate)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-zinc-700 mt-4">
              Latency includes network roundtrip. Daily budget shown in
              credits (1 credit = $0.0001).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
