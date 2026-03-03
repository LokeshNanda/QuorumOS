"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type VerifyResult = {
  verified: boolean;
  merkleRoot: string | null;
  proof?: { hash: string; position: string }[];
  message?: string;
};

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

export default function PublicVerifyPage() {
  const params = useParams();
  const id = params.electionId as string;
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteHash, setVoteHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch(`/api/election/audit?electionId=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Election not found");
        return r.json();
      })
      .then(setAudit)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVerifyHash(e: React.FormEvent) {
    e.preventDefault();
    const hash = voteHash.trim().toLowerCase();
    if (!hash || hash.length !== 64 || !/^[a-f0-9]+$/.test(hash)) {
      setVerifyResult({ verified: false, merkleRoot: null, message: "Enter a valid 64-character hex hash" });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/election/verify-vote?electionId=${id}&voteHash=${hash}`);
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({ verified: false, merkleRoot: null, message: "Verification failed" });
    } finally {
      setVerifying(false);
    }
  }

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

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto text-slate-500">Loading audit...</div>
      </main>
    );
  }

  if (error || !audit) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/verify"
            className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
          >
            ← Back to verify
          </Link>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
            <p className="text-red-400 mb-4">{error || "Election not found"}</p>
            <Link
              href="/verify"
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              Try another election ID
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/verify"
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
        >
          ← Back to verify
        </Link>
        <div className="mb-2 px-3 py-1 rounded bg-cyan-900/30 text-cyan-300 text-xs font-medium inline-block">
          Public audit – no login required
        </div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Audit Report – {audit.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Generated {new Date(audit.generatedAt).toLocaleString()}
        </p>

        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800/50 p-6 space-y-6 animate-fade-in">
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

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadJson}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
            >
              Download audit JSON
            </button>
            <a
              href={`/api/election/audit/pdf?electionId=${id}`}
              download
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
            >
              Download PDF
            </a>
          </div>

          {audit.status === "closed" && audit.merkleRoot && (
            <div className="pt-6 border-t border-slate-700">
              <p className="text-slate-500 text-sm mb-2 font-medium">Hash verification tool</p>
              <p className="text-slate-500 text-xs mb-3">
                Paste a vote hash (from the audit JSON) to verify it is included in the Merkle tree
              </p>
              <form onSubmit={handleVerifyHash} className="space-y-3">
                <input
                  type="text"
                  value={voteHash}
                  onChange={(e) => setVoteHash(e.target.value)}
                  placeholder="64-character hex hash (e.g. a1b2c3...)"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[44px]"
                  aria-label="Vote hash for verification"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Verify hash"}
                </button>
              </form>
              {verifyResult && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  verifyResult.verified ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                }`}>
                  {verifyResult.verified ? (
                    <p>Verified: This vote hash is included in the Merkle tree.</p>
                  ) : (
                    <p>{verifyResult.message || "Vote hash not found in ledger."}</p>
                  )}
                  {verifyResult.proof && verifyResult.proof.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-slate-400">View Merkle proof</summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-32">
                        {JSON.stringify(verifyResult.proof, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
