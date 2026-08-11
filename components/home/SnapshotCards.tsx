import { ArrowRight, Building2, CreditCard, PartyPopper, Star, Users } from "lucide-react";

export function UpcomingBookingCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Upcoming Booking</p>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-brand-500 text-white">
          <span className="text-[10px] font-bold uppercase">May</span>
          <span className="text-sm font-extrabold leading-none">27</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Cricket Arena</p>
          <p className="text-xs text-slate-500">Wed, 27 May · 7:00 PM – 9:00 PM</p>
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> 2 Courts
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> 10 Players
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-center">
        {[
          { label: "HRS", value: "24" },
          { label: "MIN", value: "05" },
          { label: "SEC", value: "36" },
        ].map((t) => (
          <div key={t.label} className="flex-1 rounded-lg bg-slate-50 py-2">
            <p className="text-sm font-extrabold text-slate-900">{t.value}</p>
            <p className="text-[10px] font-semibold text-slate-400">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WalletCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">My Wallet</p>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 p-4 text-white">
        <div>
          <p className="text-xs text-brand-100">Wallet Balance</p>
          <p className="text-2xl font-extrabold">₹1,250.00</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-brand-100">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden /> 250 Reward Points
          </p>
        </div>
        <span aria-hidden>
          <CreditCard className="h-8 w-8" />
        </span>
      </div>
    </div>
  );
}

export function FitnessSnapshotCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Your Activity</p>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
        {[
          { label: "Matches", value: "42" },
          { label: "Hours Played", value: "96" },
          { label: "Sports", value: "4" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-slate-50 py-3">
            <p className="text-lg font-extrabold text-slate-900">{m.value}</p>
            <p className="text-[10px] font-semibold text-slate-400">{m.label}</p>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        <PartyPopper className="h-4 w-4 shrink-0" /> 3 matches away from your 50th match milestone
      </p>
    </div>
  );
}
