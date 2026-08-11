"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ListPlus, Pencil, Plus, Trophy, X } from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import {
  addTournamentFixture,
  checkInVendorTournamentRegistration,
  createTournament,
  listVendorTournamentRegistrations,
  listVendorTournaments,
  updateFixtureResult,
  updateTournament,
  type CreateTournamentInput,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { Tournament, TournamentRegistration, TournamentStatus } from "@/lib/api/types";

const STATUSES: TournamentStatus[] = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

const emptyDraft: CreateTournamentInput = {
  title: "",
  category: "",
  subCategory: "",
  description: "",
  city: "",
  state: "",
  address: "",
  entryFee: 0,
  prizeMoney: undefined,
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  maxTeams: undefined,
  status: "Upcoming",
};

function emptyFixtureDraft() {
  return { round: "", teamAId: "", teamBId: "", scheduledAt: "" };
}

const STATUS_TONE: Record<TournamentStatus, "info" | "success" | "neutral" | "danger"> = {
  Upcoming: "info",
  Ongoing: "success",
  Completed: "neutral",
  Cancelled: "danger",
};

export default function VendorTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<CreateTournamentInput>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [fixtureDraft, setFixtureDraft] = useState(emptyFixtureDraft());
  const [addingFixture, setAddingFixture] = useState(false);
  const [resultDrafts, setResultDrafts] = useState<Record<string, { teamAScore: string; teamBScore: string; winnerTeamId: string }>>({});

  const refresh = useCallback(() => {
    listVendorTournaments()
      .then((result) => setTournaments(result.items))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load tournaments"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleEdit(tournament: Tournament) {
    setEditingId(tournament._id);
    setDraft({
      title: tournament.title,
      category: tournament.category,
      subCategory: tournament.subCategory ?? "",
      description: tournament.description,
      city: tournament.city,
      state: tournament.state,
      address: tournament.address,
      entryFee: tournament.entryFee,
      prizeMoney: tournament.prizeMoney,
      startDate: tournament.startDate.slice(0, 10),
      endDate: tournament.endDate.slice(0, 10),
      registrationDeadline: tournament.registrationDeadline.slice(0, 10),
      maxTeams: tournament.maxTeams,
      status: tournament.status,
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function handleSubmit() {
    if (!draft.title.trim() || !draft.category.trim() || !draft.description.trim() || !draft.city.trim()) {
      setToast("Fill in the tournament name, sport, description, and city.");
      return;
    }
    if (!draft.startDate || !draft.endDate || !draft.registrationDeadline) {
      setToast("Pick a start date, end date, and registration deadline.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        ...draft,
        startDate: new Date(draft.startDate).toISOString(),
        endDate: new Date(draft.endDate).toISOString(),
        registrationDeadline: new Date(draft.registrationDeadline).toISOString(),
      };
      if (editingId) {
        await updateTournament(editingId, input);
        setToast(`"${draft.title}" updated`);
      } else {
        await createTournament(input);
        setToast(`"${draft.title}" created`);
      }
      setEditingId(null);
      setDraft(emptyDraft);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save tournament");
    } finally {
      setSaving(false);
    }
  }

  function toggleExpanded(tournament: Tournament) {
    if (expandedId === tournament._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tournament._id);
    setFixtureDraft(emptyFixtureDraft());
    setRegistrationsLoading(true);
    listVendorTournamentRegistrations({ tournamentId: tournament._id, status: "Registered" })
      .then((result) => setRegistrations(result.items))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load registrations"))
      .finally(() => setRegistrationsLoading(false));
  }

  async function handleAddFixture(tournamentId: string) {
    if (!fixtureDraft.round.trim() || !fixtureDraft.teamAId || !fixtureDraft.teamBId || !fixtureDraft.scheduledAt) {
      setToast("Fill in the round, both teams, and a date for the fixture.");
      return;
    }
    if (fixtureDraft.teamAId === fixtureDraft.teamBId) {
      setToast("A team can't play itself — pick two different teams.");
      return;
    }
    setAddingFixture(true);
    try {
      await addTournamentFixture(tournamentId, {
        round: fixtureDraft.round,
        teamAId: fixtureDraft.teamAId,
        teamBId: fixtureDraft.teamBId,
        scheduledAt: new Date(fixtureDraft.scheduledAt).toISOString(),
      });
      setFixtureDraft(emptyFixtureDraft());
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to add fixture");
    } finally {
      setAddingFixture(false);
    }
  }

  async function handleRecordResult(tournamentId: string, fixtureId: string) {
    const draftResult = resultDrafts[fixtureId];
    if (!draftResult || draftResult.teamAScore === "" || draftResult.teamBScore === "") {
      setToast("Enter both scores before recording a result.");
      return;
    }
    try {
      await updateFixtureResult(tournamentId, fixtureId, {
        teamAScore: Number(draftResult.teamAScore),
        teamBScore: Number(draftResult.teamBScore),
        winnerTeamId: draftResult.winnerTeamId || undefined,
      });
      setResultDrafts((prev) => {
        const next = { ...prev };
        delete next[fixtureId];
        return next;
      });
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to record result");
    }
  }

  async function handleCheckIn(orderId: string, tournamentId: string) {
    try {
      await checkInVendorTournamentRegistration(orderId);
      const result = await listVendorTournamentRegistrations({ tournamentId, status: "Registered" });
      setRegistrations(result.items);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to check in");
    }
  }

  const expandedTournament = tournaments.find((t) => t._id === expandedId) ?? null;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Community, Events & Coaching"
        title="Tournaments"
        description="Create tournaments, take team registrations, build fixtures, and record results — the leaderboard updates itself."
        right={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
            <Trophy size={16} /> {tournaments.length} Tournament(s)
          </span>
        }
      />

      <SectionCard
        title={editingId ? "Edit Tournament" : "Create Tournament"}
        description={editingId ? "Update details, then save." : "Fill in the tournament details."}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tournament Name" placeholder="Weekend Cricket Cup" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} />
          <Input label="Sport" placeholder="Cricket" value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} />
          <Input
            label="Format (optional)"
            placeholder="Box Cricket, T10..."
            value={draft.subCategory ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, subCategory: v }))}
          />
          <Input label="City" placeholder="Udaipur" value={draft.city} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} />
          <Input label="State" placeholder="Rajasthan" value={draft.state} onChange={(v) => setDraft((d) => ({ ...d, state: v }))} />
          <Input label="Venue Address" placeholder="Fatehsagar Sports Ground" value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} />
          <Input
            label="Entry Fee per Team (₹)"
            placeholder="1000"
            value={String(draft.entryFee || "")}
            onChange={(v) => setDraft((d) => ({ ...d, entryFee: Number(v.replace(/\D/g, "")) || 0 }))}
          />
          <Input
            label="Prize Money (optional)"
            placeholder="25000"
            value={draft.prizeMoney ? String(draft.prizeMoney) : ""}
            onChange={(v) => setDraft((d) => ({ ...d, prizeMoney: v ? Number(v.replace(/\D/g, "")) : undefined }))}
          />
          <Input
            label="Max Teams (optional)"
            placeholder="8"
            value={draft.maxTeams ? String(draft.maxTeams) : ""}
            onChange={(v) => setDraft((d) => ({ ...d, maxTeams: v ? Number(v.replace(/\D/g, "")) : undefined }))}
          />
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Status</label>
            <select
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TournamentStatus }))}
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Registration Deadline</label>
            <input
              type="date"
              value={draft.registrationDeadline}
              onChange={(e) => setDraft((d) => ({ ...d, registrationDeadline: e.target.value }))}
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Start Date</label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">End Date</label>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
            />
          </div>
          <div className="sm:col-span-2">
            <Input label="Description" placeholder="What players should know before registering" value={draft.description} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
          >
            <Plus size={16} /> {saving ? "Saving..." : editingId ? "Save Changes" : "Create Tournament"}
          </button>
          {editingId && (
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold text-ink-faint hover:bg-surface-hover disabled:opacity-60"
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Your Tournaments" description="Tap a tournament to manage registrations and fixtures.">
        <div className="divide-y divide-surface-border">
          {tournaments.map((t) => (
            <div key={t._id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink text-sm truncate">{t.title}</p>
                  <p className="text-xs text-ink-faint">
                    {t.category} · {t.city} · ₹{t.entryFee}/team
                    {t.maxTeams ? ` · ${t.registeredTeamsCount}/${t.maxTeams} teams` : ` · ${t.registeredTeamsCount} teams`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  <button
                    onClick={() => toggleExpanded(t)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-violet hover:bg-vibe-violet/10"
                    title="Manage registrations & fixtures"
                  >
                    <ListPlus size={14} />
                  </button>
                  <button
                    onClick={() => handleEdit(t)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-violet hover:bg-vibe-violet/10"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {expandedId === t._id && expandedTournament && (
                <div className="mt-4 space-y-4 rounded-lg bg-cream-200/50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">Registered Teams</p>
                    {registrationsLoading ? (
                      <p className="text-xs text-ink-faint">Loading...</p>
                    ) : registrations.length === 0 ? (
                      <p className="text-xs text-ink-faint">No teams registered yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {registrations.map((r) => (
                          <div key={r._id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink truncate">{r.teamName}</p>
                              <p className="text-xs text-ink-faint">
                                {r.captainName} · {r.players.length} player(s) · Order #{r.orderId}
                              </p>
                            </div>
                            {r.checkedIn ? (
                              <Badge tone="success">Checked in</Badge>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(r.orderId, t._id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                              >
                                <CheckCircle2 size={13} /> Check In
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">Fixtures</p>
                    <div className="flex flex-col gap-2 mb-3">
                      {expandedTournament.fixtures.length === 0 && <p className="text-xs text-ink-faint">No fixtures yet.</p>}
                      {expandedTournament.fixtures.map((f) => {
                        const teamA = registrations.find((r) => r._id === f.teamAId);
                        const teamB = registrations.find((r) => r._id === f.teamBId);
                        const rd = resultDrafts[f.id] ?? { teamAScore: "", teamBScore: "", winnerTeamId: "" };
                        return (
                          <div key={f.id} className="rounded-lg bg-white px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-ink">
                                {f.round}: {teamA?.teamName ?? "Team A"} vs {teamB?.teamName ?? "Team B"}
                              </p>
                              <Badge tone={f.status === "Completed" ? "success" : "neutral"}>{f.status}</Badge>
                            </div>
                            {f.status === "Completed" ? (
                              <p className="mt-1 text-xs text-ink-faint">
                                Score: {f.teamAScore} – {f.teamBScore}
                              </p>
                            ) : (
                              <div className="mt-2 flex flex-wrap items-end gap-2">
                                <input
                                  type="number"
                                  placeholder={`${teamA?.teamName ?? "Team A"} score`}
                                  value={rd.teamAScore}
                                  onChange={(e) => setResultDrafts((prev) => ({ ...prev, [f.id]: { ...rd, teamAScore: e.target.value } }))}
                                  className="w-32 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs outline-none focus:border-vibe-violet"
                                />
                                <input
                                  type="number"
                                  placeholder={`${teamB?.teamName ?? "Team B"} score`}
                                  value={rd.teamBScore}
                                  onChange={(e) => setResultDrafts((prev) => ({ ...prev, [f.id]: { ...rd, teamBScore: e.target.value } }))}
                                  className="w-32 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs outline-none focus:border-vibe-violet"
                                />
                                <select
                                  value={rd.winnerTeamId}
                                  onChange={(e) => setResultDrafts((prev) => ({ ...prev, [f.id]: { ...rd, winnerTeamId: e.target.value } }))}
                                  className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs outline-none focus:border-vibe-violet"
                                >
                                  <option value="">Draw</option>
                                  {teamA && <option value={teamA._id}>{teamA.teamName} won</option>}
                                  {teamB && <option value={teamB._id}>{teamB.teamName} won</option>}
                                </select>
                                <button
                                  onClick={() => handleRecordResult(t._id, f.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-violetSoft"
                                >
                                  Record Result
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <Input label="Round" placeholder="Quarterfinal" value={fixtureDraft.round} onChange={(v) => setFixtureDraft((f) => ({ ...f, round: v }))} />
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">Team A</label>
                        <select
                          value={fixtureDraft.teamAId}
                          onChange={(e) => setFixtureDraft((f) => ({ ...f, teamAId: e.target.value }))}
                          className="rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
                        >
                          <option value="">Select team</option>
                          {registrations.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.teamName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">Team B</label>
                        <select
                          value={fixtureDraft.teamBId}
                          onChange={(e) => setFixtureDraft((f) => ({ ...f, teamBId: e.target.value }))}
                          className="rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
                        >
                          <option value="">Select team</option>
                          {registrations.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.teamName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={fixtureDraft.scheduledAt}
                          onChange={(e) => setFixtureDraft((f) => ({ ...f, scheduledAt: e.target.value }))}
                          className="rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
                        />
                      </div>
                      <button
                        onClick={() => handleAddFixture(t._id)}
                        disabled={addingFixture}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-3.5 py-2 text-xs font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
                      >
                        <Plus size={14} /> Add Fixture
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && <p className="py-8 text-center text-sm text-ink-faint">Loading tournaments...</p>}
          {!loading && tournaments.length === 0 && <p className="py-8 text-center text-sm text-ink-faint">No tournaments yet.</p>}
        </div>
      </SectionCard>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
      />
    </div>
  );
}
