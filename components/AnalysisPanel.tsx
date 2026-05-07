"use client";

import { useState } from "react";
import type { ChatMessage, PromptTemplate } from "@/types/chat";
import { MODELS, MAX_SYSTEM_PROMPT_CHARS } from "@/lib/models";
import { ANALYSES, isPaid, formatUsd } from "@/lib/utils";
import { ChartIcon, ChevronDownIcon, SparkleIcon, TrashIcon } from "@/components/icons";

type Props = {
  // Analysis
  latestResponses: ChatMessage[];
  canAnalyze: boolean;
  analysisModelId: string;
  setAnalysisModelId: (id: string) => void;
  analysisPrompt: string;
  setAnalysisPrompt: (p: string) => void;
  isAnalyzing: boolean;
  isRateLimited: (modelId: string) => boolean;
  setShowAnalysisPanel: (show: boolean) => void;
  handleAnalysis: (preset: keyof typeof ANALYSES | "custom", customText?: string) => void;
  // Navigation
  view: "chat" | "analytics";
  setView: (v: "chat" | "analytics") => void;
  // Settings
  temperature: number;
  setTemperature: (t: number) => void;
  systemPrompt: string;
  setSystemPrompt: (p: string) => void;
  showTemplates: boolean;
  setShowTemplates: (s: boolean) => void;
  templates: PromptTemplate[];
  saveTemplate: () => void;
  loadTemplate: (t: PromptTemplate) => void;
  deleteTemplate: (id: string) => void;
};

export function AnalysisPanel({
  latestResponses,
  canAnalyze,
  analysisModelId,
  setAnalysisModelId,
  analysisPrompt,
  setAnalysisPrompt,
  isAnalyzing,
  isRateLimited,
  setShowAnalysisPanel,
  handleAnalysis,
  view,
  setView,
  temperature,
  setTemperature,
  systemPrompt,
  setSystemPrompt,
  showTemplates,
  setShowTemplates,
  templates,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
}: Props) {
  const [showRunAnalysis, setShowRunAnalysis] = useState(true);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  return (
    <aside className="
      fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto
      md:relative md:inset-auto md:max-h-none md:overflow-y-auto
      md:w-72 md:shrink-0
      border-t border-zinc-800/50 md:border-t-0 md:border-l md:border-zinc-800/50
      flex flex-col bg-zinc-900 animate-panel-in
    ">
      {/* Mobile drag handle */}
      <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
        <div className="w-8 h-1 bg-zinc-700 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-amber-400"><SparkleIcon /></span>
          <h2 className="text-sm font-semibold text-zinc-200">Studio</h2>
        </div>
        <button
          onClick={() => setShowAnalysisPanel(false)}
          title="Hide panel"
          className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-sm leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">

        {/* Analytics */}
        <button
          onClick={() => setView(view === "analytics" ? "chat" : "analytics")}
          className={`w-full flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer font-medium ${
            view === "analytics"
              ? "bg-indigo-600/25 text-indigo-300"
              : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          }`}
        >
          <ChartIcon />
          Analytics
        </button>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span className="uppercase tracking-wider font-medium">Temperature</span>
            <span className="tabular-nums text-zinc-400">{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-zinc-700">
            <span>focused</span>
            <span>balanced</span>
            <span>creative</span>
          </div>
        </div>

        {/* System prompt */}
        <div>
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
          >
            <span>System prompt</span>
            <span className={`transition-transform duration-200 ${showSystemPrompt ? "rotate-180" : ""}`}>
              <ChevronDownIcon />
            </span>
          </button>
          {showSystemPrompt && (
            <div className="mt-2 space-y-1.5">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value.slice(0, MAX_SYSTEM_PROMPT_CHARS))}
                placeholder="You are a helpful assistant..."
                rows={4}
                className="w-full bg-zinc-800/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none transition-all duration-200"
              />
              <div className="flex items-center justify-between">
                <p className={`text-xs tabular-nums ${systemPrompt.length >= MAX_SYSTEM_PROMPT_CHARS ? "text-red-400" : "text-zinc-700"}`}>
                  {systemPrompt.length}/{MAX_SYSTEM_PROMPT_CHARS}
                </p>
                <button
                  onClick={saveTemplate}
                  disabled={!systemPrompt.trim()}
                  className="text-xs text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Save as template
                </button>
              </div>
              {templates.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Templates ({templates.length}) {showTemplates ? "▾" : "▸"}
                  </button>
                  {showTemplates && (
                    <div className="mt-1.5 space-y-0.5 rounded-xl p-1 bg-zinc-800/50">
                      {templates.map((t) => (
                        <div
                          key={t.id}
                          className="group flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-zinc-700/50 transition-colors"
                        >
                          <button
                            onClick={() => loadTemplate(t)}
                            className="text-xs text-zinc-400 hover:text-zinc-200 truncate flex-1 text-left cursor-pointer"
                          >
                            {t.name}
                          </button>
                          <button
                            onClick={() => deleteTemplate(t.id)}
                            title="Delete template"
                            className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-800/60" />

        {/* Run Analysis — collapsible */}
        <div>
          <button
            onClick={() => setShowRunAnalysis(!showRunAnalysis)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors mb-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500/70"><SparkleIcon /></span>
              <span>Run Analysis</span>
            </div>
            <span className={`transition-transform duration-200 ${showRunAnalysis ? "rotate-180" : ""}`}>
              <ChevronDownIcon />
            </span>
          </button>

          {showRunAnalysis && (
            <div className="space-y-3">
              {/* Status */}
              <p className="text-xs text-zinc-600 leading-relaxed">
                {latestResponses.length === 0
                  ? "Send a message first."
                  : `${latestResponses.length} response${latestResponses.length === 1 ? "" : "s"} ready.`}
              </p>

              {/* Model picker */}
              <div>
                <p className="text-xs font-medium text-zinc-600 mb-1.5">Model</p>
                <select
                  value={analysisModelId}
                  onChange={(e) => setAnalysisModelId(e.target.value)}
                  disabled={isAnalyzing}
                  className="bg-zinc-800/70 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none cursor-pointer w-full transition-all duration-200"
                >
                  <optgroup label="★ Premium">
                    {MODELS.filter((m) => isPaid(m.id)).map((m) => (
                      <option key={m.id} value={m.id} disabled={isRateLimited(m.id)}>
                        {m.name}{isRateLimited(m.id) ? " (rate limited)" : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Free">
                    {MODELS.filter((m) => !isPaid(m.id)).map((m) => (
                      <option key={m.id} value={m.id} disabled={isRateLimited(m.id)}>
                        {m.name}{isRateLimited(m.id) ? " (rate limited)" : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {(() => {
                  const m = MODELS.find((x) => x.id === analysisModelId);
                  if (!m) return null;
                  return (
                    <p className="text-xs text-zinc-600 mt-1 font-mono">
                      {formatUsd(m.pricing.prompt)} in · {formatUsd(m.pricing.completion)} out / 1M
                    </p>
                  );
                })()}
              </div>

              {/* Preset buttons */}
              <div className="space-y-1">
                {Object.entries(ANALYSES).map(([key, a]) => {
                  const needsSystem = key === "adherence";
                  const disabled = !canAnalyze || (needsSystem && !systemPrompt.trim());
                  return (
                    <button
                      key={key}
                      onClick={() => handleAnalysis(key as keyof typeof ANALYSES)}
                      disabled={disabled}
                      title={needsSystem && !systemPrompt.trim() ? "Set a system prompt first" : undefined}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${
                        disabled
                          ? "opacity-30 cursor-not-allowed"
                          : "bg-zinc-800/40 hover:bg-amber-950/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-amber-200 transition-colors">
                          {a.name}
                        </span>
                        {key === "synthesize" && (
                          <span className="text-[9px] text-amber-500 font-bold">★</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5 group-hover:text-zinc-500">{a.blurb}</p>
                    </button>
                  );
                })}
              </div>

              {/* Custom */}
              <div>
                <textarea
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                  placeholder="Ask anything about the responses..."
                  rows={3}
                  disabled={isAnalyzing}
                  className="bg-zinc-800/60 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none transition-all duration-200 w-full"
                />
                <button
                  onClick={() => handleAnalysis("custom", analysisPrompt)}
                  disabled={!canAnalyze || !analysisPrompt.trim()}
                  className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl bg-zinc-800/40 hover:bg-amber-950/30 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-zinc-300 font-medium"
                >
                  {isAnalyzing ? "Running..." : "Run custom"}
                </button>
              </div>

              {isAnalyzing && (
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                  <span className="text-xs text-zinc-500 ml-1">Analyzing...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
