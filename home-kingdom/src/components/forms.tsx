import { useState, type FormEvent } from "react";
import { Field, Segmented } from "./ui";
import { Icon } from "../pixel/Sprite";
import { useActions } from "../lib/actions";
import { useStore } from "../lib/store";
import { useT, type TKey } from "../lib/i18n";
import { DEFAULT_SETTINGS, sizeReward } from "../lib/game";
import { PROJECT_ICONS, REWARD_ICONS } from "../lib/catalog";
import type { Assignee, CommentKind, Priority, Project, ShopItem, Size, Task } from "../lib/types";
import { go } from "../lib/router";

function useAssigneeOptions() {
  const { data } = useStore();
  const t = useT();
  const name = (h: "jessica" | "mariano") => data.profiles.find((p) => p.hero === h)?.display_name ?? t(h);
  return [
    { value: "jessica" as Assignee, label: name("jessica") },
    { value: "mariano" as Assignee, label: name("mariano") },
    { value: "both" as Assignee, label: `♥ ${t("both")}` },
  ];
}

function IconPicker({ value, icons, onChange, label }: { value: string; icons: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="mb-3">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {icons.map((name) => (
          <button key={name} type="button" role="radio" aria-checked={value === name} onClick={() => onChange(name)}
            className={`tap rounded border-2 p-1 ${value === name ? "border-ink bg-gold" : "border-transparent"}`}>
            <Icon name={name} size={2} />
          </button>
        ))}
      </div>
    </div>
  );
}

function RewardInputs({ gold, xp, setGold, setXp }: { gold: number; xp: number; setGold: (n: number) => void; setXp: (n: number) => void }) {
  const t = useT();
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <Field label={<span className="inline-flex items-center gap-1"><Icon name="coin" size={2} /> {t("reward")}</span>}>
        {(id) => <input id={id} className="field" type="number" inputMode="numeric" min={0} max={1000} value={gold} onChange={(e) => setGold(Math.max(0, Math.min(1000, +e.target.value || 0)))} />}
      </Field>
      <Field label={<span className="inline-flex items-center gap-1"><Icon name="xp" size={2} /> XP</span>}>
        {(id) => <input id={id} className="field" type="number" inputMode="numeric" min={0} max={1000} value={xp} onChange={(e) => setXp(Math.max(0, Math.min(1000, +e.target.value || 0)))} />}
      </Field>
    </div>
  );
}

// ------------------------------------------------------------------ quest ---

export function ProjectForm({ project, kind = "main", initialTitle = "", onDone }: {
  project?: Project; kind?: "main" | "coop"; initialTitle?: string; onDone: (id?: string) => void;
}) {
  const t = useT();
  const { data } = useStore();
  const actions = useActions();
  const s = { ...DEFAULT_SETTINGS, ...(data.household?.settings ?? {}) };
  const k = project?.kind ?? kind;
  const [title, setTitle] = useState(project?.title ?? initialTitle);
  const [description, setDescription] = useState(project?.description ?? "");
  const [assignee, setAssignee] = useState<Assignee>(project?.assignee ?? "both");
  const [priority, setPriority] = useState<Priority>(project?.priority ?? "medium");
  const [targetDate, setTargetDate] = useState(project?.target_date ?? "");
  const [budget, setBudget] = useState(project?.budget?.toString() ?? "");
  const [gold, setGold] = useState(project?.reward_gold ?? (k === "coop" ? s.coop_gold : s.project_gold));
  const [xp, setXp] = useState(project?.reward_xp ?? (k === "coop" ? s.coop_xp : s.project_xp));
  const [icon, setIcon] = useState(project?.icon ?? (k === "coop" ? "hearts" : "scroll"));
  const [busy, setBusy] = useState(false);
  const assigneeOptions = useAssigneeOptions();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const values: Partial<Project> = {
      title: title.trim(), description: description.trim(), assignee: k === "coop" ? "both" : assignee, priority,
      target_date: targetDate || null, budget: budget === "" ? null : Math.max(0, Number(budget)),
      reward_gold: gold, reward_xp: xp, icon,
    };
    if (project) {
      await actions.updateProject(project.id, values);
      setBusy(false);
      onDone(project.id);
    } else {
      const id = await actions.createProject({ ...values, kind: k });
      setBusy(false);
      if (id) onDone(id);
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label={t("title")}>{(id) => <input id={id} className="field" value={title} maxLength={120} required onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label={<>{t("description")} <span className="font-normal text-ink-soft">({t("optional")})</span></>}>
        {(id) => <textarea id={id} className="field" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />}
      </Field>
      {k === "main" ? (
        <Segmented label={t("assigned")} value={assignee} options={assigneeOptions} onChange={setAssignee} />
      ) : (
        <p className="mb-3 text-sm text-ink-soft">{t("coop_hint")}</p>
      )}
      <Segmented label={t("priority")} value={priority} onChange={setPriority}
        options={(["low", "medium", "high"] as Priority[]).map((p) => ({ value: p, label: t(`priority_${p}` as TKey) }))} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("target_date")}>{(id) => <input id={id} className="field" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />}</Field>
        <Field label={t("budget")}>{(id) => <input id={id} className="field" type="number" inputMode="decimal" min={0} step="1" placeholder="$" value={budget} onChange={(e) => setBudget(e.target.value)} />}</Field>
      </div>
      <RewardInputs gold={gold} xp={xp} setGold={setGold} setXp={setXp} />
      <IconPicker label={t("icon")} icons={PROJECT_ICONS} value={icon} onChange={setIcon} />
      <button className="btn btn-green w-full" disabled={busy || !title.trim()}>{t("save")}</button>
    </form>
  );
}

// ------------------------------------------------------------------- task ---

export function TaskForm({ task, projectId, onDone }: { task?: Task; projectId?: string; onDone: () => void }) {
  const t = useT();
  const { data } = useStore();
  const actions = useActions();
  const openProjects = data.projects.filter((p) => !p.archived && p.status !== "completed");
  const [project, setProject] = useState(task?.project_id ?? projectId ?? openProjects[0]?.id ?? "");
  const parent = data.projects.find((p) => p.id === project);
  const [title, setTitle] = useState(task?.title ?? "");
  const [assignee, setAssignee] = useState<Assignee>(task?.assignee ?? parent?.assignee ?? "both");
  const [size, setSize] = useState<Size>(task?.size ?? "small");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [gold, setGold] = useState(task?.reward_gold ?? sizeReward(data.household?.settings, "small").gold);
  const [xp, setXp] = useState(task?.reward_xp ?? sizeReward(data.household?.settings, "small").xp);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const assigneeOptions = useAssigneeOptions();

  function pickSize(s: Size) {
    setSize(s);
    const r = sizeReward(data.household?.settings, s);
    setGold(r.gold);
    setXp(r.xp);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !project) return;
    setBusy(true);
    const values = { title: title.trim(), assignee, size, due_date: dueDate || null, notes: notes.trim(), reward_gold: gold, reward_xp: xp };
    if (task) await actions.updateTask(task.id, values);
    else {
      const sort = Math.max(0, ...data.tasks.filter((x) => x.project_id === project).map((x) => x.sort)) + 1;
      await actions.createTask({ ...values, project_id: project, sort });
    }
    setBusy(false);
    onDone();
  }

  async function ask() {
    if (!task || !question.trim()) return;
    await actions.comment({ kind: "question", body: question.trim(), task_id: task.id });
    setQuestion("");
    onDone();
  }

  return (
    <div>
      <form onSubmit={submit}>
        {!task && !projectId && (
          <Field label={t("choose_project")}>
            {(id) => (
              <select id={id} className="field" value={project} onChange={(e) => {
                setProject(e.target.value);
                const p = data.projects.find((x) => x.id === e.target.value);
                if (p) setAssignee(p.assignee);
              }}>
                {openProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label={t("title")}>{(id) => <input id={id} className="field" value={title} maxLength={160} required onChange={(e) => setTitle(e.target.value)} />}</Field>
        <Segmented label={t("assigned")} value={assignee} options={assigneeOptions} onChange={setAssignee} />
        <Segmented label={t("size")} value={size} onChange={pickSize}
          options={(["small", "medium", "large"] as Size[]).map((s) => ({ value: s, label: t(`size_${s}` as TKey) }))} />
        <Field label={t("due_date")}>{(id) => <input id={id} className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}</Field>
        <Field label={<>{t("notes")} <span className="font-normal text-ink-soft">({t("optional")})</span></>}>
          {(id) => <textarea id={id} className="field" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
        <RewardInputs gold={gold} xp={xp} setGold={setGold} setXp={setXp} />
        {assignee === "both" && <p className="-mt-2 mb-3 text-sm text-ink-soft">{t("coop_hint")}</p>}
        <button className="btn btn-green w-full" disabled={busy || !title.trim() || !project}>{t("save")}</button>
      </form>

      {task && (
        <div className="mt-5 border-t-2 border-dashed border-ink/30 pt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {task.status !== "in_progress" && task.status !== "completed" && (
              <button className="btn btn-sm btn-blue" onClick={() => actions.setTaskStatus(task, "in_progress").then(onDone)}>{t("mark_in_progress")}</button>
            )}
            {task.status !== "pending" && (
              <button className="btn btn-sm" onClick={() => actions.setTaskStatus(task, "pending").then(onDone)}>
                {task.status === "completed" ? t("reopen") : t("mark_pending")}
              </button>
            )}
            <button className="btn btn-sm btn-red ml-auto" onClick={async () => {
              if (window.confirm(t("confirm_delete"))) { await actions.deleteTask(task.id); onDone(); }
            }}>{t("delete")}</button>
          </div>
          <Field label={t("ask_about_task")}>
            {(id) => (
              <div className="flex gap-2">
                <input id={id} className="field" value={question} maxLength={900} placeholder={t("comment_placeholder")} onChange={(e) => setQuestion(e.target.value)} />
                <button type="button" className="btn btn-blue" disabled={!question.trim()} onClick={ask}>{t("send")}</button>
              </div>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- message ---

export function MessageForm({ projectId, onDone, initialKind = "appreciation" }: { projectId?: string; onDone: () => void; initialKind?: CommentKind }) {
  const t = useT();
  const actions = useActions();
  const [kind, setKind] = useState<CommentKind>(initialKind);
  const [body, setBody] = useState("");
  const kinds: CommentKind[] = projectId ? ["note", "question", "help"] : ["appreciation", "help", "suggestion", "question"];
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!body.trim()) return;
      await actions.comment({ kind, body: body.trim(), project_id: projectId ?? null });
      setBody("");
      onDone();
    }}>
      <Segmented label=" " value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: t(`kind_${k}` as TKey) }))} />
      <Field label={t("comment_placeholder")}>{(id) => <textarea id={id} className="field" value={body} maxLength={1000} required onChange={(e) => setBody(e.target.value)} />}</Field>
      <button className="btn btn-green w-full" disabled={!body.trim()}>{t("send")}</button>
    </form>
  );
}

// ----------------------------------------------------------------- reward ---

export function RewardForm({ item, onDone }: { item?: ShopItem; onDone: () => void }) {
  const t = useT();
  const actions = useActions();
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price ?? 50);
  const [icon, setIcon] = useState(item?.icon ?? "gift");
  const [approval, setApproval] = useState(item?.requires_approval ?? true);
  const [active, setActive] = useState(item?.active ?? true);
  const virtual = item?.category === "virtual";
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const values: Record<string, unknown> = virtual
        ? { price, active }
        : { title: title.trim(), description: description.trim(), price, icon, requires_approval: approval, active };
      if (!item) values.category = "real";
      await actions.saveItem(item?.id ?? null, values);
      onDone();
    }}>
      {!virtual && (
        <>
          <Field label={t("title")}>{(id) => <input id={id} className="field" value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label={<>{t("description")} <span className="font-normal text-ink-soft">({t("optional")})</span></>}>
            {(id) => <textarea id={id} className="field" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />}
          </Field>
        </>
      )}
      <Field label={t("price")}>{(id) => <input id={id} className="field" type="number" inputMode="numeric" min={1} max={100000} value={price} onChange={(e) => setPrice(Math.max(1, +e.target.value || 1))} />}</Field>
      {!virtual && (
        <>
          <IconPicker label={t("icon")} icons={REWARD_ICONS} value={icon} onChange={setIcon} />
          <label className="mb-3 flex items-center gap-3 font-semibold">
            <input type="checkbox" className="h-6 w-6 accent-[#5e9e57]" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
            {t("requires_approval")}
          </label>
        </>
      )}
      <label className="mb-4 flex items-center gap-3 font-semibold">
        <input type="checkbox" className="h-6 w-6 accent-[#5e9e57]" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {t("show_in_shop")}
      </label>
      <button className="btn btn-green w-full" disabled={!virtual && !title.trim()}>{t("save")}</button>
      {item && !virtual && (
        <button type="button" className="btn btn-red mt-3 w-full" onClick={async () => {
          if (window.confirm(t("confirm_delete"))) { await actions.deleteItem(item.id); onDone(); }
        }}>{t("delete")}</button>
      )}
    </form>
  );
}

// --------------------------------------------------------------- treasury ---

export function ContributeForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const { me } = useStore();
  const actions = useActions();
  const max = me?.gold ?? 0;
  const [amount, setAmount] = useState(Math.min(10, max));
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (amount <= 0 || amount > max) return;
      await actions.contribute(amount);
      onDone();
    }}>
      <p className="mb-3">{t("contribute_body")}</p>
      <Field label={`${t("amount")} (max ${max})`}>
        {(id) => <input id={id} className="field" type="number" inputMode="numeric" min={1} max={max} value={amount} onChange={(e) => setAmount(Math.max(0, Math.min(max, +e.target.value || 0)))} />}
      </Field>
      <div className="mb-4 flex flex-wrap gap-2">
        {[10, 25, 50, 100].filter((n) => n <= max).map((n) => <button key={n} type="button" className="chip" onClick={() => setAmount(n)}>{n}</button>)}
      </div>
      <button className="btn btn-gold w-full" disabled={amount <= 0 || amount > max}>{t("contribute")}</button>
    </form>
  );
}

// --------------------------------------------------------------- add menu ---

export type AddMode = null | "menu" | "project" | "coop" | "task" | "message";

export function AddMenu({ onPick }: { onPick: (m: AddMode, title?: string) => void }) {
  const t = useT();
  const items: { mode: AddMode; icon: string; title: TKey; hint: TKey }[] = [
    { mode: "task", icon: "check", title: "add_task", hint: "add_task_hint" },
    { mode: "project", icon: "scroll", title: "add_project", hint: "add_project_hint" },
    { mode: "coop", icon: "hearts", title: "add_coop", hint: "add_coop_hint" },
    { mode: "message", icon: "chat", title: "add_message", hint: "add_message_hint" },
  ];
  return (
    <div className="grid gap-2">
      {items.map((i) => (
        <button key={i.mode} className="panel tap flex items-center gap-3 p-3 text-left" onClick={() => onPick(i.mode)}>
          <Icon name={i.icon} size={3} />
          <span><span className="font-pixel block text-lg">{t(i.title)}</span><span className="text-sm text-ink-soft">{t(i.hint)}</span></span>
        </button>
      ))}
      <div className="mt-2">
        <span className="label">{t("coop_ideas")}</span>
        <div className="flex flex-wrap gap-2">
          {(["coop_idea_1", "coop_idea_2", "coop_idea_3", "coop_idea_4", "coop_idea_5", "coop_idea_6"] as TKey[]).map((k) => (
            <button key={k} className="chip" onClick={() => onPick("coop", t(k))}>♥ {t(k)}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AddFlow({ mode, initialTitle, setMode }: { mode: AddMode; initialTitle?: string; setMode: (m: AddMode, title?: string) => void }) {
  const close = () => setMode(null);
  if (mode === "menu") return <AddMenu onPick={setMode} />;
  if (mode === "project" || mode === "coop")
    return <ProjectForm kind={mode === "coop" ? "coop" : "main"} initialTitle={initialTitle} onDone={(id) => { close(); if (id) go("quests", id); }} />;
  if (mode === "task") return <TaskForm onDone={close} />;
  if (mode === "message") return <MessageForm onDone={close} />;
  return null;
}
