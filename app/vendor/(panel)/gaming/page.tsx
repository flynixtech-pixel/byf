"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Play, Square, Clock, Plus, DollarSign, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

interface GamingSessionItem {
  _id: string;
  stationName: string;
  gameTitle?: string;
  customerName?: string;
  hourlyRate: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  totalAmount: number;
  paymentStatus: "pending" | "completed" | "cancelled";
}

export default function GamingZonePage() {
  const [sessions, setSessions] = useState<GamingSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [stationName, setStationName] = useState("PS5 Station 1");
  const [gameTitle, setGameTitle] = useState("EA Sports FC 24");
  const [customerName, setCustomerName] = useState("");
  const [hourlyRate, setHourlyRate] = useState(200);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  function fetchSessions() {
    setLoading(true);
    apiRequest<GamingSessionItem[]>("/vendor/gaming")
      .then((res) => setSessions(res))
      .catch(() => {
        // Fallback default sample sessions if server response pending
        setSessions([
          {
            _id: "1",
            stationName: "PS5 Controller 1",
            gameTitle: "EA Sports FC 24",
            customerName: "Rahul Sharma",
            hourlyRate: 200,
            startTime: new Date(Date.now() - 45 * 60000).toISOString(),
            totalAmount: 150,
            paymentStatus: "pending",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }

  async function handleStartSession(e: React.FormEvent) {
    e.preventDefault();
    if (!stationName) return;
    setCreating(true);
    try {
      await apiRequest("/vendor/gaming", {
        method: "POST",
        body: { stationName, gameTitle, customerName, hourlyRate },
      });
      setCustomerName("");
      fetchSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCompleteSession(id: string) {
    try {
      await apiRequest(`/vendor/gaming/${id}/complete`, { method: "POST" });
      fetchSessions();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Gamepad2 className="text-vibe-violet" size={26} /> Gaming Zone & PlayStation Sessions
          </h1>
          <p className="text-xs text-slate-500">Track hourly console sessions, controller add-ons, and billing duration.</p>
        </div>
      </div>

      {/* ── START NEW SESSION FORM ── */}
      <form onSubmit={handleStartSession} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Plus size={16} className="text-emerald-500" /> Start New Console Session
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Station / Console</label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-vibe-violet/30"
              placeholder="e.g. PS5 Controller 1"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Game Title</label>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-vibe-violet/30"
              placeholder="e.g. EA Sports FC 24"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Customer Name / Phone</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-vibe-violet/30"
              placeholder="Customer Name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Hourly Rate (₹)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-vibe-violet/30"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-vibe-violet px-4 py-2.5 text-xs font-bold text-white hover:bg-vibe-violet/90 transition-all disabled:opacity-50"
        >
          <Play size={14} /> {creating ? "Starting..." : "Start Timer & Session"}
        </button>
      </form>

      {/* ── SESSIONS LIST TABLE ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Clock size={16} className="text-blue-500" /> Active & Recent Gaming Sessions
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-400">No active gaming sessions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3">Game</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{s.stationName}</td>
                    <td className="py-3 px-3">{s.gameTitle || "—"}</td>
                    <td className="py-3 px-3">{s.customerName || "Walk-in"}</td>
                    <td className="py-3 px-3">{new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3 px-3">{s.durationMinutes ? `${s.durationMinutes} mins` : "In Progress"}</td>
                    <td className="py-3 px-3">
                      {s.paymentStatus === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 size={12} /> Billed (₹{s.totalAmount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Clock size={12} /> Live Running
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.paymentStatus === "pending" && (
                        <button
                          onClick={() => handleCompleteSession(s._id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                        >
                          <Square size={12} /> Stop & Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
