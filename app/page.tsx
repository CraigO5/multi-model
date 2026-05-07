import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-zinc-800/80 flex items-center justify-center p-1.5 ring-1 ring-zinc-700/50">
            <img
              src="/logo.png"
              alt="Multi-Model"
              className="w-full h-full object-contain"
              style={{ filter: "invert(1) brightness(0.9) opacity(0.9)" }}
            />
          </div>
          <span className="text-white font-semibold tracking-tight text-lg">
            Multi-Model
          </span>
        </div>
        <Link
          href="/chat"
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          Launch app →
        </Link>
      </header>


      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl sm:text-6xl font-light tracking-tight text-white max-w-2xl leading-tight">
          Ask every AI at once.
        </h1>
        <p className="mt-6 text-zinc-400 text-lg sm:text-xl max-w-xl leading-relaxed">
          Compare responses from multiple models side by side. Pick the best. Stay in control.
        </p>
        <Link
          href="/chat"
          className="mt-10 inline-flex items-center px-6 py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-zinc-100 transition-colors"
        >
          Start comparing →
        </Link>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-left">
          {/* Card: Blind Mode */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="mb-4 text-zinc-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">Blind Mode</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Hide model names and pick your favorite response. Reveal who said what only after you've chosen.
            </p>
          </div>

          {/* Card: Split View */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="mb-4 text-zinc-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">Split View</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Give each model its own thread. Drag to reorder, merge back at any time.
            </p>
          </div>

          {/* Card: AI Analysis */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="mb-4 text-zinc-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" />
                <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75Z" />
                <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5Z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">AI Analysis</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Run synthesis, fact-checks, and critiques across all responses with one click.
            </p>
          </div>
        </div>

        {/* Model strip */}
        <p className="mt-16 text-zinc-600 text-xs tracking-widest uppercase">
          Works with GPT · Claude · Gemini · DeepSeek · Llama · and more
        </p>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-zinc-700 text-xs">
          Built by{" "}
          <a
            href="https://craigo.live"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            craig
          </a>
        </p>
      </footer>
    </div>
  );
}
