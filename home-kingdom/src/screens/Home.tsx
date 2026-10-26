import { useState } from "react";
import { Icon } from "../pixel/Sprite";
import { KingdomView } from "../components/KingdomView";
import { HeroCard, MessageCard, ProjectCard } from "../components/cards";
import { ContributeForm, type AddMode } from "../components/forms";
import { Empty, Gold, Panel, ProgressBar, Sheet } from "../components/ui";
import { useStore } from "../lib/store";
import { fmtDate, useT } from "../lib/i18n";
import { daysUntil, involves } from "../lib/game";
import { go } from "../lib/router";

export function Home({ setAdd, openSettings }: { setAdd: (m: AddMode, title?: string) => void; openSettings: () => void }) {
  const t = useT();
  const { data, me, partner } = useStore();
  const [contribute, setContribute] = useState(false);
  const [allMessages, setAllMessages] = useState(false);

  const live = data.projects.filter((p) => !p.archived);
  const liveIds = new Set(live.map((p) => p.id));
  const tasks = data.tasks.filter((x) => liveIds.has(x.project_id));
  const doneCount = tasks.filter((x) => x.status === "completed").length;
  const active = live.filter((p) => p.status === "in_progress");
  const heroes = [me, partner].filter(Boolean) as NonNullable<typeof me>[];

  // What needs attention: approvals for me, then tasks due soon, then high-priority quests waiting.
  type Item = { key: string; icon: string; text: string; sub: string; onClick: () => void; tone: string };
  const items: Item[] = [];
  for (const r of data.redemptions)
    if (r.status === "requested" && r.requested_by !== me?.id) {
      const who = data.profiles.find((p) => p.id === r.requested_by)?.display_name ?? "";
      items.push({ key: r.id, icon: "gift", text: t("pending_approval", { name: who, title: r.title }), sub: t("nav_shop"), onClick: () => go("shop", "requests"), tone: "#fde7b0" });
    }
  const dueTasks = tasks
    .filter((x) => x.status !== "completed" && x.due_date && daysUntil(x.due_date) <= 3)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  for (const x of dueTasks) {
    const overdue = daysUntil(x.due_date!) < 0;
    items.push({
      key: x.id, icon: "clock", text: x.title,
      sub: `${overdue ? t("overdue") : t("due_soon")} · ${fmtDate(t.lang, x.due_date)}${me && involves(x.assignee, me.hero) ? "" : ` · ${x.assignee === "both" ? t("both") : partner?.display_name ?? ""}`}`,
      onClick: () => go("quests", x.project_id), tone: overdue ? "#f9d3c9" : "#fff1c9",
    });
  }
  for (const p of live)
    if (p.priority === "high" && p.status !== "completed" && p.status !== "paused" && items.length < 6)
      items.push({ key: p.id, icon: p.icon, text: p.title, sub: t("high_priority"), onClick: () => go("quests", p.id), tone: "#fbe3dc" });

  const messages = data.comments.filter((c) => (!c.project_id || c.kind === "question" || c.kind === "help") && (allMessages || (!c.acknowledged_at && c.author !== me?.id)));

  return (
    <div className="flex flex-col gap-3">
      <header className="panel-wood flex items-center gap-2 px-3 py-2">
        <Icon name="castle" size={3} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-none text-[#fff8e6]">{data.household?.name ?? "Home Kingdom"}</h1>
          <p className="text-xs text-[#f6e3bd]">{t("tagline")}</p>
        </div>
        <button className="btn btn-sm" onClick={openSettings} aria-label={t("settings")}><Icon name="gear" size={2} /></button>
      </header>

      <div className="panel overflow-hidden p-0">
        <button className="block w-full" onClick={() => go("kingdom")} aria-label={t("nav_kingdom")}>
          <KingdomView heroes />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {heroes.map((p) => <HeroCard key={p.id} profile={p} isMe={p.id === me?.id} />)}
      </div>

      <Panel tone="parchment">
        <div className="flex items-center gap-3">
          <Icon name="chest" size={3} />
          <div className="flex-1">
            <div className="font-pixel text-base leading-none">{t("treasury")}</div>
            <Gold n={data.household?.treasury_gold ?? 0} className="text-xl" />
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => setContribute(true)} disabled={!me?.gold}>{t("contribute")}</button>
        </div>
      </Panel>

      <Panel title={t("attention")} icon="flag">
        {items.length === 0 ? <Empty>{t("nothing_attention")}</Empty> : (
          <ul className="flex flex-col gap-2">
            {items.slice(0, 6).map((i) => (
              <li key={i.key}>
                <button onClick={i.onClick} className="tap flex w-full items-center gap-2 rounded border-2 border-ink/30 p-2 text-left" style={{ background: i.tone }}>
                  <Icon name={i.icon} size={2} />
                  <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{i.text}</span><span className="text-xs text-ink-soft">{i.sub}</span></span>
                  <span aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("board")} icon="chat" right={
        <button className="btn btn-sm btn-ghost underline" onClick={() => setAllMessages((v) => !v)}>{allMessages ? t("show_less") : t("show_all")}</button>
      }>
        {messages.length === 0 ? <Empty>{t("no_messages")}</Empty> : (
          <div className="flex flex-col gap-2">
            {messages.slice(0, allMessages ? 30 : 5).map((c) => <MessageCard key={c.id} c={c} onMakeProject={(title) => setAdd("project", title)} />)}
          </div>
        )}
        <button className="btn btn-sm btn-blue mt-3 w-full" onClick={() => setAdd("message")}>✉ {t("add_message")}</button>
      </Panel>

      <Panel title={t("kingdom_progress")} icon="castle">
        <ProgressBar value={tasks.length ? doneCount / tasks.length : 0} kind="gold" label={t("kingdom_progress")} />
        <p className="mt-1 text-sm text-ink-soft">{t("tasks_done", { n: doneCount, total: tasks.length })}</p>
      </Panel>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg"><Icon name="scroll" size={2} /> {t("active_quests")}</h2>
        {active.length === 0 ? (
          <div className="panel p-3"><Empty>{t("no_active")}</Empty>
            <button className="btn btn-sm w-full" onClick={() => go("quests")}>{t("nav_quests")} ›</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">{active.slice(0, 4).map((p) => <ProjectCard key={p.id} project={p} />)}</div>
        )}
      </section>

      <button className="btn btn-gold w-full text-lg" onClick={() => setAdd("menu")}>＋ {t("add_button")}</button>

      <Sheet open={contribute} title={t("contribute_title")} onClose={() => setContribute(false)}>
        <ContributeForm onDone={() => setContribute(false)} />
      </Sheet>
    </div>
  );
}
