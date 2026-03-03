"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Election {
  id: string;
  name: string;
  status: string;
  merkleRoot: string | null;
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  candidates: { id: string; name: string }[];
  _count: { voters: number; votes: number };
}

export default function AdminElectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"voters" | "manageVoters" | "candidates" | "schedule" | null>(null);
  const [voterCsv, setVoterCsv] = useState("");
  const [replaceVoters, setReplaceVoters] = useState(false);
  const [voters, setVoters] = useState<{ id: string; flatNumber: string }[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function fetchElection() {
    fetch(`/api/election/${id}`)
      .then((r) => r.json())
      .then(setElection)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchElection();
  }, [id]);

  useEffect(() => {
    if (election?.status !== "open") return;
    const interval = setInterval(fetchElection, 30000);
    return () => clearInterval(interval);
  }, [election?.status, id]);

  useEffect(() => {
    if (election) {
      setOpensAt(election.opensAt ? election.opensAt.slice(0, 16) : "");
      setClosesAt(election.closesAt ? election.closesAt.slice(0, 16) : "");
    }
  }, [election]);

  async function handleUploadVoters(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const lines = voterCsv.trim().split("\n").filter(Boolean);
    const voters = lines.map((line) => {
      const [flat_number, email] = line.split(",").map((s) => s.trim());
      return { flat_number: flat_number || "", email: email || "" };
    });
    if (voters.some((v) => !v.flat_number || !v.email)) {
      setError("Each line must be: flat_number,email");
      return;
    }
    try {
      const res = await fetch("/api/election/upload-voters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id, voters, replace: replaceVoters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSuccess(`Uploaded ${data.totalVoters} voters`);
      setVoterCsv("");
      setAction(null);
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!candidateName.trim()) return;
    try {
      const res = await fetch("/api/election/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id, name: candidateName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setSuccess("Candidate added");
      setCandidateName("");
      setAction(null);
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleOpen() {
    setError("");
    try {
      const res = await fetch("/api/election/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/election/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId: id,
          opensAt: opensAt || null,
          closesAt: closesAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccess("Schedule updated");
      setAction(null);
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleClose() {
    setError("");
    try {
      const res = await fetch("/api/election/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  function goToAudit() {
    router.push(`/admin/${id}/audit`);
  }

  function fetchVoters() {
    fetch(`/api/election/voters?electionId=${id}`)
      .then((r) => r.json())
      .then(setVoters)
      .catch(console.error);
  }

  useEffect(() => {
    if (action === "manageVoters") fetchVoters();
  }, [action, id]);

  async function handleRemoveVoter(voterId: string) {
    setError("");
    try {
      const res = await fetch("/api/election/voters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id, voterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      setSuccess("Voter removed");
      fetchVoters();
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleEditCandidate(candidateId: string, name: string) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/election/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id, candidateId, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSuccess("Candidate updated");
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleEditElectionName(name: string) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/election/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSuccess("Election name updated");
      setElection((prev) => (prev ? { ...prev, name } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleRemoveCandidate(candidateId: string) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/election/candidates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id, candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      setSuccess("Candidate removed");
      fetchElection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading || !election) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto text-slate-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <a
          href="/admin"
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
        >
          ← Back to elections
        </a>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-100">{election.name}</h1>
          {election.status === "draft" && (
            <button
              type="button"
              onClick={() => {
                const newName = prompt("Edit election name:", election.name);
                if (newName?.trim()) handleEditElectionName(newName.trim());
              }}
              className="text-slate-400 hover:text-slate-200 text-sm"
              aria-label="Edit election name"
            >
              Edit
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <p
            className={`text-sm font-medium ${
              election.status === "draft"
                ? "text-slate-400"
                : election.status === "open"
                  ? "text-blue-400"
                  : "text-green-400"
            }`}
          >
            {election.status.toUpperCase()}
          </p>
          {(election.opensAt || election.closesAt) && (
            <span className="text-slate-500 text-xs">
              {election.opensAt && `Opens ${new Date(election.opensAt).toLocaleString()}`}
              {election.opensAt && election.closesAt && " • "}
              {election.closesAt && `Closes ${new Date(election.closesAt).toLocaleString()}`}
            </span>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800/50 p-6 space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-sm">Eligible voters</p>
              <p className="text-2xl font-semibold text-slate-100">
                {election._count.voters}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-sm">Votes cast</p>
              <p className="text-2xl font-semibold text-slate-100">
                {election._count.votes}
              </p>
            </div>
          </div>

          {election.status === "closed" && election.merkleRoot && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-slate-500 text-sm mb-1">Merkle root</p>
              <code className="text-xs text-cyan-400 font-mono break-all block">
                {election.merkleRoot}
              </code>
              {election.closedAt && (
                <p className="text-slate-500 text-xs mt-2">
                  Closed {new Date(election.closedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          {election.status === "draft" && (
            <div className="space-y-4 pt-4">
              {action === "voters" ? (
                <form onSubmit={handleUploadVoters} className="space-y-3">
                  <label className="block text-slate-400 text-sm">
                    CSV: flat_number,email (one per line)
                  </label>
                  <textarea
                    value={voterCsv}
                    onChange={(e) => setVoterCsv(e.target.value)}
                    rows={6}
                    placeholder="101,resident@example.com&#10;102,other@example.com"
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
                    aria-label="Voter CSV: flat_number,email per line"
                  />
                  {election._count.voters > 0 && (
                    <label className="flex items-center gap-2 text-slate-400 text-sm">
                      <input
                        type="checkbox"
                        checked={replaceVoters}
                        onChange={(e) => setReplaceVoters(e.target.checked)}
                        className="rounded border-slate-600"
                      />
                      Replace existing voter list
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction(null)}
                      className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : action === "manageVoters" ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">
                    Remove individual voters (draft only). To replace the entire list, use Upload voters with &quot;Replace existing&quot; checked.
                  </p>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {voters.map((v) => (
                      <li
                        key={v.id}
                        className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0"
                      >
                        <span className="text-slate-300 font-mono">Flat {v.flatNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVoter(v.id)}
                          className="px-2 py-1 rounded text-red-400 hover:bg-red-900/30 text-sm"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  {voters.length === 0 && (
                    <p className="text-slate-500 text-sm">No voters yet. Upload a CSV to add voters.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setAction(null)}
                    className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700"
                  >
                    Done
                  </button>
                </div>
              ) : action === "candidates" ? (
                <form onSubmit={handleAddCandidate} className="space-y-3">
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Candidate name"
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction(null)}
                      className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      Done
                    </button>
                  </div>
                </form>
              ) : action === "schedule" ? (
                <form onSubmit={handleSaveSchedule} className="space-y-3">
                  <p className="text-slate-400 text-sm">
                    Set optional times for auto-open and auto-close. Requires a cron job to call /api/cron/election-schedule.
                  </p>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Open at (local)</label>
                    <input
                      type="datetime-local"
                      value={opensAt}
                      onChange={(e) => setOpensAt(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Close at (local)</label>
                    <input
                      type="datetime-local"
                      value={closesAt}
                      onChange={(e) => setClosesAt(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Save schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction(null)}
                      className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setAction("voters")}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    Upload voters
                  </button>
                  <button
                    onClick={() => setAction("manageVoters")}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    Manage voters
                  </button>
                  <button
                    onClick={() => setAction("candidates")}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    Add candidate
                  </button>
                  <button
                    onClick={() => setAction("schedule")}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    Schedule
                  </button>
                </div>
              )}

              <div className="pt-4">
                <p className="text-slate-500 text-sm mb-2">Candidates</p>
                {election.candidates.length === 0 ? (
                  <p className="text-slate-600 text-sm">None added yet</p>
                ) : (
                  <ul className="space-y-2">
                    {election.candidates.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">{c.name}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newName = prompt("Edit candidate name:", c.name);
                              if (newName?.trim()) handleEditCandidate(c.id, newName.trim());
                            }}
                            className="px-2 py-1 rounded text-slate-400 hover:bg-slate-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(c.id)}
                            className="px-2 py-1 rounded text-red-400 hover:bg-red-900/30 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={handleOpen}
                disabled={
                  election._count.voters === 0 || election.candidates.length === 0
                }
                className="mt-4 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Open election
              </button>
            </div>
          )}

          {election.status === "open" && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500"
            >
              Close election
            </button>
          )}

          {election.status === "closed" && (
            <button
              onClick={goToAudit}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
            >
              View audit report
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
