"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "select" | "auth" | "otp" | "vote" | "confirm";

interface Election {
  id: string;
  name: string;
  status: string;
}

interface Candidate {
  id: string;
  name: string;
}

function VotePageContent() {
  const searchParams = useSearchParams();
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [flatNumber, setFlatNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");

  useEffect(() => {
    fetch("/api/election/list")
      .then((r) => r.json())
      .then((list) => {
        const openList = list.filter((e: Election) => e.status === "open");
        setElections(openList);
        const idFromUrl = searchParams.get("electionId");
        if (idFromUrl && openList.some((e: Election) => e.id === idFromUrl)) {
          setSelectedElection(openList.find((e: Election) => e.id === idFromUrl));
          setStep("auth");
        }
      })
      .catch(console.error);
  }, [searchParams]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flat_number: flatNumber,
          email,
          electionId: selectedElection?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flat_number: flatNumber,
          email,
          otp,
          electionId: selectedElection?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setToken(data.voting_token);
      const candRes = await fetch(
        `/api/election/candidates?electionId=${selectedElection?.id}`
      );
      const cands = await candRes.json();
      setCandidates(cands);
      setStep("vote");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function castVote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCandidate) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          candidate_id: selectedCandidate.id,
          electionId: selectedElection?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cast vote");
      setReceipt(data.receipt || "");
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function selectElection(e: Election) {
    setSelectedElection(e);
    setStep("auth");
    setError("");
  }

  return (
    <main className="min-h-screen p-6 sm:p-8 flex items-center justify-center">
      <div className="max-w-md w-full animate-fade-in">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block transition-colors duration-150"
        >
          ← Back to home
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100 text-center mb-2">
          Cast Your Vote
        </h1>
        <p className="text-slate-500 text-sm text-center mb-8">
          Tamper-evident • Anonymous • Email OTP verified
        </p>

        {step === "select" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm text-center">
              Select an open election
            </p>
            {elections.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No open elections at the moment.
              </p>
            ) : (
              <div className="space-y-2">
                {elections.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => selectElection(e)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700/50 transition-colors text-left min-h-[44px]"
                    aria-label={`Select election: ${e.name}`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "auth" && selectedElection && (
          <form onSubmit={requestOtp} className="space-y-4 panel p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 text-xs font-medium">
                Verified via Email OTP
              </span>
            </div>
            <div>
              <label htmlFor="flatNumber" className="block text-slate-400 text-sm mb-2">
                Flat number
              </label>
            <input
              type="text"
              id="flatNumber"
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              placeholder="e.g. 101"
              className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors duration-150 min-h-[44px]"
              required
              aria-label="Flat number"
            />
            </div>
            <div>
              <label htmlFor="email" className="block text-slate-400 text-sm mb-2">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors duration-150 min-h-[44px]"
                required
                aria-label="Email address"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 transition-colors duration-150 min-h-[44px]"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4 panel p-6">
            <p className="text-slate-400 text-sm text-center">
              Enter the 6-digit code sent to your email
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-center text-2xl tracking-widest font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors duration-150 min-h-[44px]"
              aria-label="6-digit verification code"
              autoComplete="one-time-code"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 transition-colors duration-150 min-h-[44px]"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        {step === "vote" && (
          <form onSubmit={castVote} className="space-y-4 panel p-6">
            <p className="text-slate-400 text-sm text-center">
              Select your choice (one-time, anonymous)
            </p>
            <div className="space-y-2">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCandidate(c)}
                  className={`w-full px-4 py-3 rounded-lg border text-left transition-colors min-h-[44px] ${
                    selectedCandidate?.id === c.id
                      ? "border-teal-500 bg-teal-900/30 text-teal-200"
                      : "border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500"
                  }`}
                  aria-pressed={selectedCandidate?.id === c.id}
                  aria-label={`Vote for ${c.name}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !selectedCandidate}
              className="w-full py-3 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors duration-150 min-h-[44px]"
            >
              {loading ? "Recording..." : "Submit vote"}
            </button>
          </form>
        )}

        {step === "confirm" && (
          <div className="panel border-green-800/50 bg-green-900/20 p-8 text-center animate-fade-in">
            <p className="text-green-400 font-medium text-lg">Vote recorded</p>
            <p className="text-slate-300 text-sm mt-2">
              Your vote has been recorded in the tamper-evident ledger.
            </p>
            {receipt && (
              <div className="mt-4 p-3 rounded-lg bg-slate-900/80 text-left">
                <p className="text-slate-500 text-xs mb-1">Your vote receipt (save for verification)</p>
                <code className="text-teal-400 font-mono text-xs break-all block select-all">
                  {receipt}
                </code>
                <p className="text-slate-500 text-xs mt-2">
                  Use the <Link href="/verify" className="text-teal-400 hover:underline">Verify Results</Link> page to confirm this hash is in the ledger after the election closes.
                </p>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-400 text-xs">
                Verified via Email OTP
              </span>
              <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-400 text-xs">
                Vote Recorded in Tamper-Evident Ledger
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-6 sm:p-8 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </main>
    }>
      <VotePageContent />
    </Suspense>
  );
}
