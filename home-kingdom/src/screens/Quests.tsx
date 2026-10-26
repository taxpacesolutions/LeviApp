import { useState, type FormEvent } from "react";
import { Icon, Sprite } from "../pixel/Sprite";
import { unlockPreview } from "../pixel/scene";
import { MessageCard, PriorityBadge, ProjectCard, StatusBadge } from "../components/cards";
import { MessageForm, ProjectForm, TaskForm, type AddMode } from "../components/forms";
import { AssigneeBadge, Empty, Gold, Panel, ProgressBar, Sheet, Xp } from "../components/ui";
import { useStore } from "../lib/store";
import { useActions } from "../lib/actions";
import { fmtDate, fmtMoney, useT, type TKey } from "../lib/i18n";
import { daysUntil, progressOf, sizeReward } from "../lib/game";
import { UNLOCKS } from "../lib/catalog";
import { go } from "../lib/router";
import type { Project, Task } from "../lib/types";

type Filter = "active" | "mine" | "partner" | "both" | "done" | "archived";
const STATUS_ORDER = { in_progress: 0, not_started: 1, paused: 2, completed: 3 };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function Quests({ param, setAdd }: { param: string | null; setAdd: (m: AddMode, title?: string) => void }) {
  const { data } = useStore();
  const project = param ? data.projects.find((p) => p.id === param) : undefined;
  if (param && project) return <QuestDetail project={project} />;
  return <QuestList setAdd={setAdd} />;
}

function QuestList({ setAdd }: { setAdd: (m: AddMode, title?: string) => void }) {
  const t = useT();
  const { data, me, partner } = useStore();
  const [filter, setFilter] = useState<Filter>(() => (sessionStorage.getItem("hk-quest-filter") as Filter) || "active");
  const pick = (f: Filter) => { setFilter(f); try { sessionStorage.setItem("hk-quest-filter", f); } catch { /* ignore */ } };

  const open = (p: Project) => !p.archived && p.status !== "completed";
  const list = data.projects.filter((p) => {
    switch (filter) {
      case "active": return open(p);
      case "mine": return open(p) && p.assignee === me?.hero;
      case "partner": return open(p) && p.assignee === partner?.hero;
      case "both": return open(p) && (p.assignee === "both" || p.kind === "coop");
      case "done": return !p.archived && p.status === "completed";
      case "archived": return p.archived;
    }
  }).sort((a, b) => filter === "done"
    ? (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
    : STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.sort - b.sort);

  const filters: { f: Filter; label: string }[] = [
    { f: "active", label: t("filter_active") },
    { f: "mine", label: t("filter_mine") },
    { f: "partner", label: t("filter_partner", { name: partner?.display_name ?? "" }) },
    { f: "both", label: `♥ ${t("filter_both")}` },
    { f: "done", label: t("filter_done") },
    { f: "archived", label: t("filter_archived") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <header className="panel-wood flex items-center gap-2 px-3 py-2">
        <Icon name="scroll" size={3} />
        <h1 className="flex-1 text-xl text-[#fff8e6]">{t("quests_title")}</h1>
      </header>
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {filters.map(({ f, label }) => (
          <button key={f} className="chip" aria-pressed={filter === f} onClick={() => pick(f)}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-green btn-sm" onClick={() => setAdd("project")}>＋ {t("add_project")}</button>
        <button className="btn btn-sm bg-[#f3b7c4]" onClick={() => setAdd("coop")}>♥ {t("add_coop")}</button>
      </div>
      {list.length === 0 ? <div className="panel p-3"><Empty>{t("no_quests")}</Empty></div> : (
        <div className="flex flex-col gap-2">{list.map((p) => <ProjectCard key={p.id} project={p} />)}</div>
      )}
    </div>
  );
}

function QuestDetail({ project }: { project: Project }) {
  const t = useT();
  const { data } = useStore();
  const actions = useActions();
  const [editing, setEditing] = useState(false);
  const [taskSheet, setTaskSheet] = useState<Task | "new" | null>(null);
  const [quick, setQuick] = useState("");
  const tasks = data.tasks.filter((x) => x.project_id === project.id);
  const done = tasks.filter((x) => x.status === "completed").length;
  const comments = data.comments.filter((c) => c.project_id === project.id);
  const unlock = project.unlock_key && UNLOCKS[project.unlock_key];
  const completed = project.status === "completed";

  async function quickAdd(e: FormEvent) {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setQuick("");
    const r = sizeReward(data.household?.settings, "small");
    const sort = Math.max(0, ...tasks.map((x) => x.sort)) + 1;
    await actions.createTask({ project_id: project.id, title, assignee: project.assignee, size: "small", reward_gold: r.gold, reward_xp: r.xp, sort });
  }

  function complete() {
    const left = tasks.length - done;
    if (left > 0 && !window.confirm(t("complete_confirm", { n: left }))) return;
    actions.completeProject(project);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button className="btn btn-sm" onClick={() => go("quests")}>‹ {t("back")}</button>
        <div className="flex-1" />
        <button className="btn btn-sm" onClick={() => setEditing(true)}>✎ {t("edit")}</button>
      </div>

      <Panel>
        <div className="flex items-start gap-3">
          <div className="rounded border-2 border-ink bg-parchment p-1"><Icon name={project.icon} size={4} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight">{project.title}</h1>
            <div className="mt-1 flex flex-wrap gap-1">
              <AssigneeBadge assignee={project.assignee} />
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
              {project.kind === "coop" && <span className="badge bg-[#f3b7c4]">♥ {t("coop_badge")}</span>}
            </div>
          </div>
        </div>
        {project.description && <p className="mt-2 whitespace-pre-wrap">{project.description}</p>}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {project.target_date && (<><dt className="text-ink-soft">{t("target_date")}</dt>
            <dd className={`font-semibold ${!completed && daysUntil(project.target_date) < 0 ? "text-berry" : ""}`}>{fmtDate(t.lang, project.target_date)}</dd></>)}
          {project.budget !== null && (<><dt className="text-ink-soft">{t("budget")}</dt><dd className="font-semibold">{fmtMoney(t.lang, project.budget)}</dd></>)}
          <dt className="text-ink-soft">{t("reward")}</dt>
          <dd className="flex items-center gap-2"><Gold n={project.reward_gold} /> <Xp n={project.reward_xp} />{project.assignee === "both" && <span className="text-ink-soft">×2</span>}</dd>
          {completed && project.completed_at && (<><dt className="text-ink-soft">✓</dt><dd>{t("completed_on", { date: fmtDate(t.lang, project.completed_at) })}</dd></>)}
        </dl>
        {unlock && (
          <div className="mt-2 flex items-center gap-2 rounded border-2 border-dashed border-ink/40 bg-parchment p-2 text-sm">
            <Sprite grid={unlockPreview(project.unlock_key!)} scale={2} />
            <span>{t("unlocks")}: <b>{unlock.title[t.lang]}</b></span>
          </div>
        )}
        {tasks.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1"><ProgressBar value={progressOf(tasks)} label={project.title} /></div>
            <span className="font-bold tabular-nums">{Math.round(progressOf(tasks) * 100)}%</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {project.status === "not_started" && <button className="btn btn-sm btn-blue" onClick={() => actions.setProjectStatus(project, "in_progress")}>▶ {t("start")}</button>}
          {project.status === "in_progress" && <button className="btn btn-sm" onClick={() => actions.setProjectStatus(project, "paused")}>❚❚ {t("pause")}</button>}
          {project.status === "paused" && <button className="btn btn-sm btn-blue" onClick={() => actions.setProjectStatus(project, "in_progress")}>▶ {t("resume")}</button>}
          {completed && <button className="btn btn-sm" onClick={() => actions.setProjectStatus(project, "in_progress")}>↺ {t("reopen_project")}</button>}
        </div>
        {!completed && (
          <button className={`btn mt-3 w-full ${tasks.length && done === tasks.length ? "btn-gold text-lg" : ""}`} onClick={complete}>
            🏆 {t("complete_project")}
          </button>
        )}
      </Panel>

      <Panel title={`${t("tasks")} (${done}/${tasks.length})`} icon="check">
        {tasks.length === 0 && <Empty>{t("no_tasks")}</Empty>}
        <ul className="flex flex-col gap-2">
          {tasks.map((x) => <TaskRow key={x.id} task={x} onOpen={() => setTaskSheet(x)} />)}
        </ul>
        <form onSubmit={quickAdd} className="mt-3 flex gap-2">
          <input className="field" value={quick} maxLength={160} onChange={(e) => setQuick(e.target.value)} placeholder={t("add_task_placeholder")} aria-label={t("add_task_placeholder")} />
          <button className="btn btn-green" disabled={!quick.trim()} aria-label={t("add")}>＋</button>
        </form>
        <button className="btn btn-sm btn-ghost mt-1 w-full underline" onClick={() => setTaskSheet("new")}>{t("task_new")}…</button>
        <p className="mt-2 text-xs text-ink-soft">{t("rewards_once")}</p>
      </Panel>

      <Panel title={t("comments")} icon="chat">
        <div className="flex flex-col gap-2">
          {comments.map((c) => <MessageCard key={c.id} c={c} compact />)}
        </div>
        <div className="mt-3"><MessageForm projectId={project.id} initialKind="note" onDone={() => {}} /></div>
      </Panel>

      <Panel tone="parchment">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm" onClick={() => actions.updateProject(project.id, { archived: !project.archived })}>
            🗄 {project.archived ? t("unarchive") : t("archive")}
          </button>
          <button className="btn btn-sm btn-red ml-auto" onClick={async () => {
            if (window.confirm(t("confirm_delete"))) { await actions.deleteProject(project.id); go("quests"); }
          }}>{t("delete")}</button>
        </div>
      </Panel>

      <Sheet open={editing} title={t("project_edit")} onClose={() => setEditing(false)}>
        <ProjectForm project={project} onDone={() => setEditing(false)} />
      </Sheet>
      <Sheet open={taskSheet !== null} title={taskSheet === "new" ? t("task_new") : t("task_edit")} onClose={() => setTaskSheet(null)}>
        {taskSheet && <TaskForm key={taskSheet === "new" ? "new" : taskSheet.id} task={taskSheet === "new" ? undefined : taskSheet} projectId={project.id} onDone={() => setTaskSheet(null)} />}
      </Sheet>
    </div>
  );
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const t = useT();
  const { data } = useStore();
  const actions = useActions();
  const [busy, setBusy] = useState(false);
  const done = task.status === "completed";
  const by = done && task.completed_by ? data.profiles.find((p) => p.id === task.completed_by)?.display_name : null;
  const overdue = !done && task.due_date && daysUntil(task.due_date) < 0;
  return (
    <li className={`flex items-center gap-2 rounded border-2 border-ink/25 p-2 ${done ? "bg-[#eef6e6]" : "bg-paper"}`}>
      <button role="checkbox" aria-checked={done} aria-label={task.title} className="check tap" disabled={busy}
        onClick={async () => { setBusy(true); await actions.toggleTask(task); setBusy(false); }}>
        {done && <Icon name="check" size={2} />}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <span className={`block leading-snug ${done ? "text-ink-soft line-through" : "font-semibold"}`}>{task.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
          <AssigneeBadge assignee={task.assignee} />
          {task.status === "in_progress" && <span className="badge bg-[#bfe3a8]">{t("tstatus_in_progress")}</span>}
          <span className="badge bg-paper">{t(`size_${task.size}` as TKey)}</span>
          {task.due_date && !done && <span className={`badge ${overdue ? "bg-[#f5b7a8]" : "bg-paper"}`}>📅 {fmtDate(t.lang, task.due_date)}</span>}
          {task.notes && <span title={task.notes}>📝</span>}
          {by && <span className="text-ink-soft">✓ {by}</span>}
        </span>
      </button>
      <span className="flex flex-col items-end text-xs">
        <Gold n={task.reward_gold} size={1} /><Xp n={task.reward_xp} size={1} />
      </span>
    </li>
  );
}
