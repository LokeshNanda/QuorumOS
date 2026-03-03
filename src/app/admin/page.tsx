"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
    >
      Sign out
    </button>
  );
}

interface Election {
  id: string;
  name: string;
  status: string;
  merkleRoot: string | null;
  closedAt: string | null;
  createdAt: string;
  _count: { voters: number; candidates: number; votes: number };
}

export default function AdminPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/election/list")
      .then((r) => r.json())
      .then(setElections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-slate-400 hover:text-slate-200 text-sm mb-2 inline-block"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-semibold text-slate-100">
              Election Control Center
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Create and manage elections
            </p>
          </div>
          <div className="flex gap-3">
            <LogoutButton />
            <Link
              href="/admin/new"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              New Election
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading...</div>
        ) : elections.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center text-slate-500">
            No elections yet. Create your first election to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {elections.map((e) => (
              <Link
                key={e.id}
                href={`/admin/${e.id}`}
                className="block rounded-lg border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 transition-colors animate-fade-in"
                aria-label={`View election: ${e.name} (${e.status})`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-slate-100">{e.name}</h2>
                    <p className="text-slate-500 text-sm mt-1">
                      {e._count.voters} voters • {e._count.candidates} candidates
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        e.status === "draft"
                          ? "bg-slate-700 text-slate-400"
                          : e.status === "open"
                            ? "bg-blue-900/50 text-blue-300"
                            : "bg-green-900/50 text-green-300"
                      }`}
                      aria-hidden
                    >
                      {e.status}
                    </span>
                    {e.status === "closed" && e.merkleRoot && (
                      <span className="text-cyan-400/80 text-xs" title="Merkle root present">
                        ✓ Integrity
                      </span>
                    )}
                    <span className="text-slate-400 text-sm">
                      {e._count.votes} votes
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
