"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyPage() {
  const [electionId, setElectionId] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = electionId.trim();
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
          Enter an election ID to view the public audit report and verify
          integrity. No login required.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="electionId" className="sr-only">
              Election ID
            </label>
            <input
              id="electionId"
              type="text"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              placeholder="Election ID (e.g. clxx...)"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-3 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 transition-colors"
          >
            View audit report
          </button>
        </form>
      </div>
    </main>
  );
}
