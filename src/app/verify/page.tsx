"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Election {
  id: string;
  name: string;
  status: string;
  closedAt: string | null;
}

export default function VerifyPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [manualId, setManualId] = useState("");
  const [showManual, setShowManual] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/election/list?status=closed")
      .then((r) => r.json())
      .then((list) => {
        setElections(list);
        if (list.length === 0) setShowManual(true);
      })
      .catch(console.error);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = showManual ? manualId.trim() : selectedId;
    if (id) router.push(`/verify/${id}`);
  }

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
        >
          ← Back to home
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">
          Verify Election Results
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Select a closed election or enter an election ID to view the public
          audit report and verify integrity. No login required.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!showManual ? (
            <>
              <div>
                <label htmlFor="electionSelect" className="block text-slate-400 text-sm mb-2">
                  Select election
                </label>
                <select
                  id="electionSelect"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  aria-label="Select closed election to verify"
                >
                  <option value="">
                    {elections.length === 0 ? "No closed elections" : "Choose an election..."}
                  </option>
                  {elections.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.closedAt
                        ? ` (closed ${new Date(e.closedAt).toLocaleDateString()})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              {elections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowManual(true)}
                  className="text-slate-400 hover:text-slate-200 text-sm"
                >
                  Or enter election ID manually
                </button>
              )}
            </>
          ) : (
            <>
              <div>
                <label htmlFor="electionId" className="block text-slate-400 text-sm mb-2">
                  Election ID
                </label>
                <input
                  id="electionId"
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. clxx..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                  aria-label="Election ID"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Back to election list
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={!selectedId && !manualId.trim()}
            className="w-full px-4 py-3 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            View audit report
          </button>
        </form>
      </div>
    </main>
  );
}
