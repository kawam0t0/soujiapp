"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DEFAULT_MEMBERS } from "@/components/rotation-wheel";
import { TaskChecklist, getTodayDateKey } from "@/components/task-checklist";
import { WaterDropBadge } from "@/components/water-drop-badge";
import {
  Menu, X, UserPlus, Trash2, ChevronLeft, ChevronRight,
  Users, Pencil, Check, RefreshCw, Loader2
} from "lucide-react";

const EPOCH = new Date("2026-03-15");

function getDayOffset(date: Date): number {
  const ms = date.getTime() - EPOCH.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDutyMemberForDate(date: Date, members: string[], overrides: Record<string, string>): string {
  const key = toISODate(date);
  if (overrides[key]) return overrides[key];
  const total = members.length;
  if (total === 0) return "-";
  const raw = getDayOffset(date);
  const offset = ((raw % total) + total) % total;
  return members[offset % total];
}

type Tab = "tasks" | "rotation";

interface StaffMember {
  name: string;
  email: string;
}

// Drag payload: which date
interface DragPayload {
  dateKey: string;
  name: string;
}

export default function CleaningApp() {
  const [today] = useState<Date>(() => new Date());
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [members, setMembers] = useState<string[]>([...DEFAULT_MEMBERS]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [allTasksDone, setAllTasksDone] = useState(false);
  // Per-date overrides: dateKey -> memberName
  const [rotationOverrides, setRotationOverrides] = useState<Record<string, string>>({});
  // Drop target highlight
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragPayloadRef = useRef<DragPayload | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Fetch staff from Google Sheets on mount
  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "スタッフ取得に失敗しました");
      const list: StaffMember[] = data.staff ?? [];
      setStaffList(list);
      if (list.length > 0) {
        setMembers(list.map((s) => s.name));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setStaffError(msg);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Auto-update viewDate when date changes (Japan timezone)
  useEffect(() => {
    const checkDateChange = () => {
      const now = new Date();
      const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const currentViewDate = new Date(viewDate.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      
      if (jstDate.toDateString() !== currentViewDate.toDateString()) {
        setViewDate(jstDate);
      }
    };

    // Check every minute
    const interval = setInterval(checkDateChange, 60000);
    checkDateChange(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [viewDate]);

  const total = members.length;
  const dutyMember = getDutyMemberForDate(viewDate, members, rotationOverrides);
  const restMembers = members.filter((m) => m !== dutyMember);
  const todayKey = getTodayDateKey(viewDate);
  const isToday = viewDate.toDateString() === today.toDateString();

  // Tomorrow's duty
  const tomorrow = addDays(viewDate, 1);
  const tomorrowMember = getDutyMemberForDate(tomorrow, members, rotationOverrides);

  const dutyStaff = staffList.find((s) => s.name === dutyMember);

  // Drag handlers for rotation table
  function handleBadgeDragStart(dateKey: string, name: string) {
    dragPayloadRef.current = { dateKey, name };
  }

  function handleBadgeDrop(toDateKey: string) {
    const from = dragPayloadRef.current;
    if (!from || from.dateKey === toDateKey) return;

    const fromName = getDutyMemberForDate(new Date(from.dateKey), members, rotationOverrides);
    const toName = getDutyMemberForDate(new Date(toDateKey), members, rotationOverrides);

    setRotationOverrides((prev) => ({
      ...prev,
      [from.dateKey]: toName,
      [toDateKey]: fromName,
    }));
    setDropTarget(null);
    dragPayloadRef.current = null;
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => { if (memberPanelOpen) addInputRef.current?.focus(); }, [memberPanelOpen]);
  useEffect(() => { if (editingIndex !== null) editInputRef.current?.focus(); }, [editingIndex]);

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name || members.includes(name)) return;
    setMembers((prev) => [...prev, name]);
    setNewMemberName("");
  }

  function handleRemoveMember(name: string) {
    setMembers((prev) => prev.filter((m) => m !== name));
  }

  function handleStartEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(members[index]);
  }

  function handleConfirmEdit() {
    if (editingIndex === null) return;
    const name = editingValue.trim();
    if (name && !members.some((m, i) => m === name && i !== editingIndex)) {
      setMembers((prev) => prev.map((m, i) => (i === editingIndex ? name : m)));
    }
    setEditingIndex(null);
    setEditingValue("");
  }

  return (
    <main className="h-dvh flex flex-col bg-background font-sans overflow-hidden">

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border" style={{ background: "linear-gradient(135deg, #0f1c2e 0%, #1e3a6e 60%, #162a4e 100%)" }}>
        <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border-2 border-primary/40 bg-primary/10 shadow-lg flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none" style={{ color: "#4da6c8" }}>
                Clean Ambassador
              </h1>
              <p className="text-xs font-extrabold tracking-widest uppercase" style={{ color: "#E05A3A" }}>
                Have a clean day!!!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchStaff} disabled={staffLoading}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-muted/40 hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground border border-border/50"
              aria-label="スタッフ情報を更新" title="スプレッドシートから再取得">
              {staffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            {!isToday && (
              <button type="button" onClick={() => setViewDate(today)}
                className="text-xs bg-primary/15 hover:bg-primary/25 text-primary px-3 py-1.5 rounded-md font-medium transition-colors border border-primary/30">
                今日に戻る
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-muted/40 hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground border border-border/50"
                aria-label="メニューを開く" aria-expanded={menuOpen}>
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-lg shadow-2xl py-1 z-40">
                  <button type="button" onClick={() => { setMenuOpen(false); setMemberPanelOpen(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    <Users className="w-4 h-4 text-primary" />
                    メンバー管理
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {staffError && (
          <div className="bg-destructive/10 border-t border-destructive/30 px-4 py-2 text-xs text-destructive flex items-center justify-between">
            <span>スタッフ取得エラー: {staffError}</span>
            <button type="button" onClick={fetchStaff} className="underline hover:no-underline ml-2">再試行</button>
          </div>
        )}
      </header>

      {/* Member management panel */}
      {memberPanelOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMemberPanelOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm h-full bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold text-base text-foreground">メンバー管理</h2>
              <button type="button" onClick={() => setMemberPanelOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground" aria-label="閉じる">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">メンバーを追加</p>
                <div className="flex gap-2">
                  <input ref={addInputRef} type="text" value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    placeholder="名前を入力..." maxLength={8}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={handleAddMember} disabled={!newMemberName.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <UserPlus className="w-4 h-4" />追加
                  </button>
                </div>
                {members.includes(newMemberName.trim()) && newMemberName.trim() && (
                  <p className="text-xs text-destructive">その名前はすでに登録されています。</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">現在のメンバー（{members.length}名）</p>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">メンバーがいません</p>
                ) : (
                  <ul className="space-y-1.5">
                    {members.map((name, i) => (
                      <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border">
                        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center text-primary font-bold text-xs flex-none">{name.slice(0, 1)}</div>
                        {editingIndex === i ? (
                          <input ref={editInputRef} type="text" value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleConfirmEdit(); if (e.key === "Escape") setEditingIndex(null); }}
                            maxLength={8}
                            className="flex-1 px-2 py-0.5 text-sm rounded border border-primary bg-background text-foreground focus:outline-none" />
                        ) : (
                          <span className="flex-1 text-sm font-medium text-foreground">{name}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex-none">#{i + 1}</span>
                        {editingIndex === i ? (
                          <button type="button" onClick={handleConfirmEdit}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/15 text-primary transition-colors" aria-label="確定">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleStartEdit(i)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label={`${name}を編集`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => handleRemoveMember(name)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors" aria-label={`${name}を削除`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2.5 leading-relaxed border border-border">
                スプレッドシートのスタッフ情報は起動時に自動取得されます。右上の更新ボタンで再取得できます。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Congratulations overlay — shown when all tasks are done */}
      {allTasksDone && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none select-none bg-black/30 backdrop-blur-sm">
          <div className="text-center px-4">
            <p
              className="font-black tracking-tight leading-none drop-shadow-2xl"
              style={{
                color: "#FFD700",
                textShadow: "0 0 80px rgba(255,215,0,0.9), 0 0 30px rgba(255,215,0,0.6)",
                fontSize: "clamp(3rem, 12vw, 10rem)",
              }}
            >
              Congratulations!!
            </p>
            <p className="font-bold mt-4" style={{ color: "#ffffff", fontSize: "clamp(1rem, 3vw, 2rem)" }}>
              本日のタスクが全て完了しました！
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-screen-xl mx-auto px-3 py-2 flex flex-col gap-2">
          {/* Date navigation */}
          <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 flex-shrink-0">
            <button type="button" onClick={() => setViewDate((d) => addDays(d, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="前の日">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">{formatDate(viewDate)}</p>
              {isToday && (
                <span className="inline-block text-xs bg-primary/15 text-primary px-2 py-0.5 rounded font-medium border border-primary/20">本日</span>
              )}
            </div>
            <button type="button" onClick={() => setViewDate((d) => addDays(d, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="次の日">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Two-column layout — fills remaining height */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* LEFT — Duty display (2 cols) */}
            <div className="md:col-span-2 flex flex-col gap-3 overflow-y-auto min-h-0">
              {total > 0 ? (
                <>
                  {/* Today's duty card */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden flex-shrink-0">
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                      <div className="w-1.5 h-4 rounded-full bg-destructive"></div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {isToday ? "本日の当番" : "当日の当番"}
                      </span>
                    </div>

                    {/* Duty member — water drop, size adapts to available space */}
                    <div className="flex items-center justify-center py-4 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <WaterDropBadge name={dutyMember} size="lg" variant="duty" />
                        {dutyStaff?.email && (
                          <span className="text-xs text-muted-foreground truncate max-w-[14rem]">{dutyStaff.email}</span>
                        )}
                      </div>
                    </div>

                    {/* Rest members */}
                    <div className="border-t border-border bg-muted/30 flex items-center gap-2 py-2 px-3 flex-wrap">
                      <span className="text-xs text-muted-foreground font-medium">お休み：</span>
                      {restMembers.map((name) => (
                        <span key={name} className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tomorrow's duty card */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden flex-shrink-0">
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                      <div className="w-1.5 h-4 rounded-full bg-primary"></div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">明日の当番</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {tomorrow.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 py-3 px-4">
                      <span
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-bold text-white"
                        style={{ background: "#22c55e" }}
                      >
                        {tomorrowMember}
                      </span>
                      <span className="text-xs text-muted-foreground">が担当します</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                  {staffLoading ? "スタッフ情報を取得中..." : "メンバーがいません。メニューからメンバーを追加してください。"}
                </div>
              )}
            </div>

            {/* RIGHT — tabs (1 col, scrollable) */}
            <div className="md:col-span-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex bg-muted rounded-md p-0.5 mb-2 gap-0.5 flex-shrink-0">
                {(["tasks", "rotation"] as Tab[]).map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold transition-colors ${activeTab === tab
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                      }`}>
                    {tab === "tasks" ? "本日のタスク" : "ローテーション"}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === "tasks" && (
                  <TaskChecklist todayKey={todayKey} date={viewDate} onAllDone={setAllTasksDone} />
                )}

                {activeTab === "rotation" && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 rounded-full bg-accent"></div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">今後7日間</span>
                      </div>
                      {Object.keys(rotationOverrides).length > 0 && (
                        <button type="button" onClick={() => setRotationOverrides({})}
                          className="text-xs text-muted-foreground hover:text-foreground underline">
                          リセット
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/20 border-b border-border">
                      バッジをドラッグして当番を入れ替えられます
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">日付</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">当番</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Array.from({ length: 7 }).map((_, i) => {
                          const d = addDays(viewDate, i);
                          const dateKey = toISODate(d);
                          const member = getDutyMemberForDate(d, members, rotationOverrides);
                          const isThisToday = d.toDateString() === today.toDateString();
                          const isDropHere = dropTarget === dateKey;
                          return (
                            <tr key={dateKey}
                              className={isThisToday ? "bg-primary/10" : "hover:bg-muted/20"}
                              onDragOver={(e) => { e.preventDefault(); setDropTarget(dateKey); }}
                              onDragLeave={() => setDropTarget(null)}
                              onDrop={(e) => { e.preventDefault(); handleBadgeDrop(dateKey); }}>
                              <td className="px-3 py-2 align-middle">
                                <span className={`text-xs font-medium ${isThisToday ? "text-primary" : "text-foreground"}`}>
                                  {d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                                </span>
                                {isThisToday && (
                                  <span className="ml-1 text-xs bg-primary/20 text-primary px-1 py-0.5 rounded border border-primary/20">今日</span>
                                )}
                                {rotationOverrides[dateKey] && (
                                  <span className="ml-1 text-xs" style={{ color: "#E05A3A" }}>*</span>
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = "move";
                                    handleBadgeDragStart(dateKey, member);
                                  }}
                                  className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold text-white select-none cursor-grab active:cursor-grabbing transition-all"
                                  style={{
                                    background: isDropHere ? "#16a34a" : "#22c55e",
                                    boxShadow: isDropHere ? "0 0 0 2px #4ade80" : "none",
                                    transform: isDropHere ? "scale(1.1)" : "scale(1)",
                                    minWidth: "2.5rem",
                                  }}
                                >
                                  {member}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
