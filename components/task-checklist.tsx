"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ShoppingCart } from "lucide-react";

// -------------------------------------------------------
// Task definitions
// -------------------------------------------------------

type Frequency =
  | "daily"
  | "weekly3"
  | "weekly1"
  | "tue_fri"
  | "1st_3rd_5th"
  | "as_needed";

interface Task {
  id: string;
  label: string;
  frequency: Frequency;
  category: string;
  amazonUrl?: string;
}

const ALL_TASKS: Task[] = [
  // 清掃
  { id: "vacuum", label: "床掃除機", frequency: "daily", category: "清掃" },
  { id: "floor_sweep", label: "床の掃き掃除", frequency: "weekly3", category: "清掃" },
  { id: "door_glass", label: "入口の扉（ガラス）清掃", frequency: "weekly1", category: "清掃" },
  { id: "washroom", label: "洗面所掃除", frequency: "daily", category: "清掃" },
  { id: "toilet", label: "トイレ掃除", frequency: "daily", category: "清掃" },
  // 来客用補充
  {
    id: "water",
    label: "水",
    frequency: "as_needed",
    category: "来客用補充",
    amazonUrl: "https://amzn.asia/d/05BuomfN",
  },
  {
    id: "tea",
    label: "お茶",
    frequency: "as_needed",
    category: "来客用補充",
    amazonUrl: "https://amzn.asia/d/05zPgFN5",
  },
  {
    id: "coffee_black",
    label: "コーヒーブラック",
    frequency: "as_needed",
    category: "来客用補充",
    amazonUrl: "https://amzn.asia/d/0gMdB1oW",
  },
  {
    id: "coffee_milk",
    label: "コーヒーミルク",
    frequency: "as_needed",
    category: "来客用補充",
    amazonUrl: "https://amzn.asia/d/0dLydHHR",
  },
  {
    id: "pepsi",
    label: "ペプシコーラ",
    frequency: "as_needed",
    category: "来客用補充",
    amazonUrl: "https://amzn.asia/d/01WO5x19",
  },
  {
    id: "guest_snack",
    label: "来客用お菓子",
    frequency: "as_needed",
    category: "来客用補充",
    amazonUrl: "https://amzn.asia/d/0emIgpV2",
  },
  // 備品補充
  {
    id: "trash_small",
    label: "ゴミ袋（小）",
    frequency: "as_needed",
    category: "備品補充",
    amazonUrl: "https://amzn.asia/d/0idTsjt7",
  },
  {
    id: "trash_maebashi",
    label: "ゴミ袋（前橋指定袋）",
    frequency: "as_needed",
    category: "備品補充",
    // no Amazon link
  },
  {
    id: "toilet_paper",
    label: "トイレットペーパー",
    frequency: "as_needed",
    category: "備品補充",
    amazonUrl: "https://amzn.asia/d/0cHNqKI8",
  },
  {
    id: "cleaning_tools",
    label: "各種掃除用具",
    frequency: "as_needed",
    category: "備品補充",
    // no Amazon link
  },
  // ゴミ捨て
  { id: "garbage_collect", label: "ゴミ回収 & 出し", frequency: "tue_fri", category: "ゴミ捨て" },
  { id: "recyclable", label: "資源ゴミ（第1・3・5週）", frequency: "1st_3rd_5th", category: "ゴミ捨て" },
  // 観葉植物
  { id: "plant_water", label: "水やり", frequency: "as_needed", category: "観葉植物" },
  { id: "plant_sun", label: "日に当てる", frequency: "as_needed", category: "観葉植物" },
  // ポストチェック
  { id: "post_check", label: "ポストチェック", frequency: "daily", category: "ポストチェック" },
];

const CATEGORY_ORDER = [
  "清掃",
  "来客用補充",
  "備品補充",
  "ゴミ捨て",
  "観葉植物",
  "ポストチェック",
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  清掃: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  ),
  来客用補充: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path fillRule="evenodd" d="M6 3a1 1 0 011-1h.01a1 1 0 010 2H7a1 1 0 01-1-1zm2 3a1 1 0 00-2 0v1a2 2 0 00-2 2v1a2 2 0 00-2 2v.683a3.7 3.7 0 011.055.485 1.704 1.704 0 001.89 0 3.704 3.704 0 014.11 0 1.704 1.704 0 001.89 0 3.704 3.704 0 014.11 0 1.704 1.704 0 001.89 0A3.7 3.7 0 0118 12.683V12a2 2 0 00-2-2V9a2 2 0 00-2-2V6a1 1 0 10-2 0v1h-1V6a1 1 0 00-1-1H8V6zm-1 6a2 2 0 012-2h2a2 2 0 010 4H9a2 2 0 01-2-2zm7 2a1 1 0 100-2 1 1 0 000 2zM5 12a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
    </svg>
  ),
  備品補充: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
      <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  ゴミ捨て: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  観葉植物: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  ),
  ポストチェック: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  ),
};

const FREQUENCY_BADGE: Record<Frequency, { label: string; color: string }> = {
  daily:         { label: "毎日",       color: "bg-primary/20 text-primary border border-primary/25" },
  weekly3:       { label: "週3回",      color: "bg-accent/15 text-accent border border-accent/25" },
  weekly1:       { label: "週1回",      color: "bg-accent/15 text-accent border border-accent/25" },
  tue_fri:       { label: "火・金",     color: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25" },
  "1st_3rd_5th": { label: "第1・3・5週", color: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25" },
  as_needed:     { label: "必要時",     color: "bg-muted text-muted-foreground border border-border" },
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function isTodayTask(task: Task, date: Date | null): boolean {
  if (!date) return false;
  const day = date.getDay(); // 0=Sun, 1=Mon, ... 2=Tue, 5=Fri
  const dayOfMonth = date.getDate();
  const week = Math.ceil(dayOfMonth / 7);

  switch (task.frequency) {
    case "daily":
      return true;
    case "weekly3":
      // Mon, Wed, Fri
      return [1, 3, 5].includes(day);
    case "weekly1":
      // Monday
      return day === 1;
    case "tue_fri":
      return day === 2 || day === 5;
    case "1st_3rd_5th":
      return (week === 1 || week === 3 || week === 5) && day === 2;
    case "as_needed":
      return true;
  }
}

function getTodayDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------

interface TaskChecklistProps {
  todayKey: string;
  date: Date;
  onAllDone?: (done: boolean) => void;
}

export function TaskChecklist({ todayKey, date, onAllDone }: TaskChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const todayTasks = useMemo(
    () => ALL_TASKS.filter((t) => isTodayTask(t, date)),
    [date]
  );

  const categorized = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of todayTasks) {
      if (!map[task.category]) map[task.category] = [];
      map[task.category].push(task);
    }
    return map;
  }, [todayTasks]);

  // Auto-expand only if there are incomplete tasks in the category (otherwise stay closed)
  useEffect(() => {
    const expanded: Record<string, boolean> = {};
    CATEGORY_ORDER.forEach((cat) => {
      if (categorized[cat]) {
        // Default closed; can be opened by user click or later auto-opened if needed
        expanded[cat] = false;
      }
    });
    setExpandedCategories(expanded);
  }, [categorized]);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const totalCount = todayTasks.length;
  const doneCount = todayTasks.filter((t) => checked[t.id]).length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const isAllDone = totalCount > 0 && doneCount === totalCount;

  useEffect(() => {
    onAllDone?.(isAllDone);
  }, [isAllDone, onAllDone]);

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <div className="bg-card border border-border rounded-lg px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">本日の進捗</span>
          <span className="font-bold text-primary">{doneCount} / {totalCount} 完了</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Task categories - accordion */}
      {CATEGORY_ORDER.filter((cat) => categorized[cat]?.length).map((category) => {
        const isExpanded = expandedCategories[category];
        const categoryTasks = categorized[category];
        const completedCount = categoryTasks.filter((t) => checked[t.id]).length;
        const isAllComplete = completedCount === categoryTasks.length;
        return (
          <div key={category} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Accordion Header - clickable */}
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className={`w-full flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border hover:bg-muted/60 transition-colors ${isExpanded ? "border-b-primary/30" : ""}`}
              aria-expanded={isExpanded}
            >
              {/* Expand/collapse icon */}
              <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>

              {/* Category icon and name */}
              <span className="text-primary">{CATEGORY_ICONS[category]}</span>
              <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">{category}</h3>

              {/* Progress indicator */}
              <span className={`ml-auto text-xs font-medium ${isAllComplete ? "text-green-500" : "text-muted-foreground"}`}>
                {completedCount}/{categoryTasks.length}
              </span>
            </button>

            {/* Accordion Content - conditional render */}
            {isExpanded && (
              <ul className="divide-y divide-border">
                {categoryTasks.map((task) => {
                  const isChecked = !!checked[task.id];
                  const badge = FREQUENCY_BADGE[task.frequency];
                  return (
                    <li key={task.id} className={`flex items-center ${isChecked ? "bg-primary/5" : ""}`}>
                      <button type="button" onClick={() => toggle(task.id)}
                        className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
                        aria-pressed={isChecked}>
                        <div className={`flex-none w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked ? "bg-primary border-primary" : "border-border bg-background"
                        }`}>
                          {isChecked && (
                            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5 text-primary-foreground">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className={`flex-1 text-xs font-medium transition-all ${
                          isChecked ? "line-through text-muted-foreground" : "text-foreground"
                        }`}>{task.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>{badge.label}</span>
                      </button>
                      {task.amazonUrl && (
                        <a href={task.amazonUrl} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-none flex items-center gap-1 mx-2 px-2 py-1 rounded bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#FF9900] transition-colors text-xs font-semibold border border-[#FF9900]/25"
                          aria-label={`${task.label}をAmazonで購入`}>
                          <ShoppingCart className="w-3 h-3" />
                          <span>購入</span>
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { getTodayDateKey };
