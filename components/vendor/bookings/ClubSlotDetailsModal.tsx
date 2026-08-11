"use client";

import React from "react";
import { X, Calendar, Clock, DollarSign, Layers, Ban, Scissors, Trash2, UserCheck } from "lucide-react";

interface ClubSlotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubSlot: {
    startTime: string;
    endTime: string;
    label: string;
    price: number;
    blocked?: boolean;
    clubId?: string;
    slotIds?: string[];
    durationMinutes?: number;
  } | null;
  selectedDate: string;
  onOfflineBooking: () => void;
  onBlockSlot: () => void;
  onEditPrice: () => void;
  onSplitClub: () => void;
  onDeleteClub: () => void;
}

function to12h(t: string) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}

function t24m(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmtDur(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} mins`;
  if (m === 0) return `${h} ${h === 1 ? "Hour" : "Hours"}`;
  return `${h}h ${m}m`;
}

export function ClubSlotDetailsModal({
  isOpen,
  onClose,
  clubSlot,
  selectedDate,
  onOfflineBooking,
  onBlockSlot,
  onEditPrice,
  onSplitClub,
  onDeleteClub,
}: ClubSlotDetailsModalProps) {
  if (!isOpen || !clubSlot) return null;

  const startMins = t24m(clubSlot.startTime);
  const endMins = t24m(clubSlot.endTime);
  const totalMins = clubSlot.durationMinutes || Math.max(60, endMins - startMins);

  // Generate 1-hour underlying segments for visual display
  const segments: { startTime: string; endTime: string }[] = [];
  let curr = startMins;
  while (curr + 60 <= endMins) {
    const sH = Math.floor(curr / 60) % 24;
    const sM = curr % 60;
    const eH = Math.floor((curr + 60) / 60) % 24;
    const eM = (curr + 60) % 60;

    const sStr = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`;
    const eStr = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;
    segments.push({ startTime: sStr, endTime: eStr });
    curr += 60;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-vibe-navy via-slate-900 to-slate-800 p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              🏷️ Club Slot Information
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white font-mono">
            {to12h(clubSlot.startTime)} – {to12h(clubSlot.endTime)}
          </h2>
          <p className="text-xs font-semibold text-emerald-200 mt-1">
            {selectedDate} · {fmtDur(totalMins)}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Price</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">₹{clubSlot.price.toLocaleString()}</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Current Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-extrabold text-emerald-700">
                  {clubSlot.blocked ? "Blocked" : "Available"}
                </p>
              </div>
            </div>
          </div>

          {/* Underlying Segments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Underlying Segments</p>
              <span className="text-[10px] font-bold text-slate-400">{segments.length} Hourly Blocks</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {segments.map((seg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 px-3.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {to12h(seg.startTime)} – {to12h(seg.endTime)}
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 uppercase">
                    Available
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onOfflineBooking}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 px-4 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition"
            >
              <UserCheck size={16} /> Create Offline Booking
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onBlockSlot}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                <Ban size={14} /> {clubSlot.blocked ? "Unblock Slot" : "Block Slot"}
              </button>

              <button
                type="button"
                onClick={onEditPrice}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <DollarSign size={14} /> Edit Price
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSplitClub}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 py-2.5 px-3 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
              >
                <Scissors size={14} /> Split Club
              </button>

              <button
                type="button"
                onClick={onDeleteClub}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <Trash2 size={14} /> Delete Club
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
