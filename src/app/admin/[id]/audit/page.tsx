"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Audit {
  electionId: string;
  name: string;
  status: string;
  closedAt: string | null;
  merkleRoot: string | null;
  totalEligibleVoters: number;
  totalOtpVerified: number;
  totalVotesCast: number;
  candidateTally: { id: string; name: string; votes: number }[];
  finalLedgerHash: string | null;
  generatedAt: string;
}

export default function AuditPage() {
  const params = useParams();
  const id = params.id as string;
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/election/audit?electionId=${id}`)
      .then((r) => r.json())
      .then(setAudit)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  function downloadJson() {
    if (!audit) return;
    const blob = new Blob([JSON.stringify(audit, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quorumos-audit-${audit.electionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !audit) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto text-slate-500">Loading audit...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <a
          href={`/admin/${id}`}
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
        >
          ← Back to election
        </a>
        <h1 className="text-2xl font-semibold text-slate-100">
          Audit Report – {audit.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Generated {new Date(audit.generatedAt).toLocaleString()}
        </p>

        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800/50 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-sm">Eligible voters</p>
              <p className="text-xl font-semibold text-slate-100">
                {audit.totalEligibleVoters}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-sm">OTP verified</p>
              <p className="text-xl font-semibold text-slate-100">
                {audit.totalOtpVerified}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-sm">Votes cast</p>
              <p className="text-xl font-semibold text-slate-100">
                {audit.totalVotesCast}
              </p>
            </div>
          </div>

          {audit.merkleRoot && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-slate-500 text-sm mb-1">Merkle root</p>
              <code className="text-xs text-cyan-400 font-mono break-all block">
                {audit.merkleRoot}
              </code>
            </div>
          )}

          {audit.finalLedgerHash && (
            <div>
              <p className="text-slate-500 text-sm mb-1">Final ledger hash</p>
              <code className="text-xs text-cyan-400 font-mono break-all block">
                {audit.finalLedgerHash}
              </code>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700">
            <p className="text-slate-500 text-sm mb-2">Candidate tally</p>
            <ul className="space-y-2">
              {audit.candidateTally.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between text-slate-300"
                >
                  <span>{c.name}</span>
                  <span className="font-mono">{c.votes}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={downloadJson}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
          >
            Download audit JSON
          </button>
        </div>
      </div>
    </main>
  );
}
