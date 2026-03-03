"use client";

import { useEffect, useState } from "react";

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

export default function VotePage() {
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

  useEffect(() => {
    fetch("/api/election/list")
      .then((r) => r.json())
      .then((list) => setElections(list.filter((e: Election) => e.status === "open")))
      .catch(console.error);
  }, []);

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
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-slate-100 text-center mb-8">
          Cast Your Vote
        </h1>

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
                    onClick={() => selectElection(e)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700/50 transition-colors text-left"
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "auth" && selectedElection && (
          <form onSubmit={requestOtp} className="space-y-4">
            <p className="text-slate-400 text-sm text-center">
              Verify via Email OTP
            </p>
            <div>
              <label className="block text-slate-400 text-sm mb-2">
                Flat number
              </label>
              <input
                type="text"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                placeholder="e.g. 101"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-slate-400 text-sm text-center">
              Enter the 6-digit code sent to your email
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-center text-2xl tracking-widest font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        {step === "vote" && (
          <form onSubmit={castVote} className="space-y-4">
            <p className="text-slate-400 text-sm text-center">
              Select your choice (one-time, anonymous)
            </p>
            <div className="space-y-2">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCandidate(c)}
                  className={`w-full px-4 py-3 rounded-lg border text-left transition-colors ${
                    selectedCandidate?.id === c.id
                      ? "border-cyan-500 bg-cyan-900/30 text-cyan-200"
                      : "border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !selectedCandidate}
              className="w-full py-3 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
            >
              {loading ? "Recording..." : "Submit vote"}
            </button>
          </form>
        )}

        {step === "confirm" && (
          <div className="rounded-lg border border-green-800 bg-green-900/20 p-8 text-center">
            <p className="text-green-400 font-medium">Vote recorded</p>
            <p className="text-slate-400 text-sm mt-2">
              Your vote has been recorded in the tamper-evident ledger.
            </p>
            <p className="text-slate-500 text-xs mt-4">
              Verified via Email OTP • Identity-vote separation
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
