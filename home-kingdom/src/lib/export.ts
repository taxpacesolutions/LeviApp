import type { Data } from "./store";

function download(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

// Everything the app shows, as one JSON file (easy to keep in a drive or email).
export function exportJson(data: Data) {
  const backup = { app: "Home Kingdom", exported_at: new Date().toISOString(), ...data };
  download(`home-kingdom-${stamp()}.json`, "application/json", JSON.stringify(backup, null, 2));
}

// Projects and tasks as a spreadsheet (opens in Excel, Numbers, Google Sheets).
export function exportCsv(data: Data) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["project", "project_status", "project_assignee", "priority", "target_date", "budget",
    "task", "task_status", "task_assignee", "size", "due_date", "gold", "xp", "notes", "completed_at"];
  const lines = [header.join(",")];
  for (const p of data.projects) {
    const tasks = data.tasks.filter((t) => t.project_id === p.id);
    const base = [p.title, p.status, p.assignee, p.priority, p.target_date, p.budget];
    if (!tasks.length) lines.push([...base, "", "", "", "", "", "", "", "", ""].map(esc).join(","));
    for (const t of tasks)
      lines.push([...base, t.title, t.status, t.assignee, t.size, t.due_date, t.reward_gold, t.reward_xp, t.notes, t.completed_at].map(esc).join(","));
  }
  download(`home-kingdom-tasks-${stamp()}.csv`, "text/csv;charset=utf-8", "﻿" + lines.join("\n"));
}
