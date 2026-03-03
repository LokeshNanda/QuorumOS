import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-4xl font-semibold text-slate-100 tracking-tight">
          QuorumOS
        </h1>
        <p className="text-slate-400 text-lg">
          Privacy-first digital election infrastructure for housing societies
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/admin"
            className="px-6 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-colors duration-150 min-h-[44px]"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/vote"
            className="px-6 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors duration-150 min-h-[44px]"
          >
            Cast Vote
          </Link>
          <Link
            href="/verify"
            className="px-6 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-colors duration-150 min-h-[44px]"
          >
            Verify Results
          </Link>
        </div>
        <p className="text-slate-500 text-sm">
          Tamper-evident ledger • Email OTP • Identity-vote separation
        </p>
      </div>
    </main>
  );
}
