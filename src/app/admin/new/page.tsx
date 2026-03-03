"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewElectionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/election/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      router.push(`/admin/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-xl mx-auto">
        <a
          href="/admin"
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
        >
          ← Back to elections
        </a>
        <h1 className="text-2xl font-semibold text-slate-100 mb-6">
          Create Election
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="electionName" className="block text-slate-400 text-sm mb-2">
              Election name
            </label>
            <input
              id="electionName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Society AGM 2025"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
              aria-label="Election name"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating..." : "Create Election"}
          </button>
        </form>
      </div>
    </main>
  );
}
