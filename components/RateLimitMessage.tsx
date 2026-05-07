export function RateLimitMessage({ free }: { free: boolean }) {
  if (!free) {
    return (
      <p className="text-sm text-red-400">
        ⚠ Rate limited — quota exceeded, try again in ~1 hour.
      </p>
    );
  }

  return (
    <span className="text-sm text-red-400 flex items-center gap-1.5 flex-wrap">
      ⚠ Rate limited
      <span className="relative group inline-flex cursor-help">
        <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded-full w-4 h-4 inline-flex items-center justify-center leading-none select-none">
          ?
        </span>
        {/* Tooltip */}
        <span className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
          <strong className="text-zinc-100 font-medium block mb-1.5">
            Free tier rate limit
          </strong>
          OpenRouter's free models share a global request quota across all users
          — roughly 10 requests per minute per model. Hitting this during peak
          hours is common.
          <span className="block mt-2 text-zinc-500">
            Wait a minute and try again, or add a premium model (★) for
            dedicated higher quotas.
          </span>
        </span>
      </span>
    </span>
  );
}
