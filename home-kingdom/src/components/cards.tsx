import { Icon } from "../pixel/Sprite";
import { AssigneeBadge, Gold, HeroAvatar, ProgressBar, Xp } from "./ui";
import { useStore } from "../lib/store";
import { useActions } from "../lib/actions";
import { fmtDate, levelTitle, useT, type TKey } from "../lib/i18n";
import { daysUntil, levelOf, progressOf } from "../lib/game";
import { go } from "../lib/router";
import type { Comment, Profile, Project } from "../lib/types";

const STATUS_BG: Record<string, string> = {
  not_started: "#efe0bb", in_progress: "#bfe3a8", paused: "#d8d2c4", completed: "#f2c14e",
};

export function StatusBadge({ status }: { status: Project["status"] }) {
  const t = useT();
  return <span className="badge" style={{ background: STATUS_BG[status] }}>{t(`status_${status}` as TKey)}</span>;
}

export function PriorityBadge({ priority }: { priority: Project["priority"] }) {
  const t = useT();
  if (priority === "medium") return null;
  return (
    <span className="badge" style={{ background: priority === "high" ? "#f5b7a8" : "#e3eef9" }}>
      {priority === "high" ? "▲ " : "▽ "}{t(`priority_${priority}` as TKey)}
    </span>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const t = useT();
  const { data } = useStore();
  const tasks = data.tasks.filter((x) => x.project_id === project.id);
  const done = tasks.filter((x) => x.status === "completed").length;
  const pct = progressOf(tasks);
  return (
    <button className="panel tap block w-full p-3 text-left" onClick={() => go("quests", project.id)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded border-2 border-ink bg-parchment p-1"><Icon name={project.icon} size={3} /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-snug">{project.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <AssigneeBadge assignee={project.assignee} />
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
            {project.kind === "coop" && <span className="badge bg-[#f3b7c4]">♥ {t("coop_badge")}</span>}
            {project.target_date && project.status !== "completed" && (
              <span className={`badge ${daysUntil(project.target_date) < 0 ? "bg-[#f5b7a8]" : "bg-paper"}`}>📅 {fmtDate(t.lang, project.target_date)}</span>
            )}
          </div>
        </div>
      </div>
      {tasks.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={pct} label={project.title} /></div>
          <span className="text-sm font-bold tabular-nums">{done}/{tasks.length}</span>
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-sm">
        <Gold n={project.reward_gold} /> <Xp n={project.reward_xp} />
        {project.kind === "coop" || project.assignee === "both" ? <span className="text-ink-soft">×2</span> : null}
      </div>
    </button>
  );
}

export function HeroCard({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const t = useT();
  const lv = levelOf(profile.xp);
  return (
    <div className="panel flex flex-col items-center p-2 text-center">
      <HeroAvatar profile={profile} scale={3} className="bob" />
      <div className="font-pixel mt-1 text-lg leading-none">{profile.display_name}{isMe && <span className="text-sm text-ink-soft"> ({t("you")})</span>}</div>
      <div className="text-xs text-ink-soft">{profile.role_title}</div>
      <div className="mt-1 text-sm font-semibold">{t("level")} {lv.level} · {levelTitle(t.lang, profile.hero, lv.level)}</div>
      <div className="mt-1 w-full"><ProgressBar value={lv.progress} kind="xp" label="XP" /></div>
      <div className="mt-0.5 text-xs text-ink-soft tabular-nums">{lv.next ? `${profile.xp} / ${lv.next} XP` : `${profile.xp} XP`}</div>
      <div className="mt-1 flex items-center gap-2"><Gold n={profile.gold} size={2} className="text-lg" /></div>
      <div className="text-xs text-ink-soft">✓ {profile.tasks_completed}</div>
    </div>
  );
}

const KIND_ICON: Record<string, string> = { note: "scroll", question: "help", help: "hammer", appreciation: "heart", suggestion: "idea" };

export function MessageCard({ c, compact = false, onMakeProject }: { c: Comment; compact?: boolean; onMakeProject?: (title: string) => void }) {
  const t = useT();
  const { data, me } = useStore();
  const actions = useActions();
  const author = data.profiles.find((p) => p.id === c.author);
  const project = c.project_id ? data.projects.find((p) => p.id === c.project_id) : undefined;
  const task = c.task_id ? data.tasks.find((x) => x.id === c.task_id) : undefined;
  const mine = c.author === me?.id;
  return (
    <div className={`flex gap-2 rounded border-2 border-ink/20 bg-paper p-2 ${!mine && !c.acknowledged_at ? "border-ink/60 bg-[#fff6d9]" : ""}`}>
      <HeroAvatar profile={author} scale={2} className="flex-none" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
          <Icon name={KIND_ICON[c.kind] ?? "chat"} size={1} />
          <b className="text-ink">{author?.display_name}</b> · {t(`kind_${c.kind}` as TKey)} · {fmtDate(t.lang, c.created_at)}
        </div>
        {!compact && (project || task) && (
          <button className="text-left text-xs font-semibold text-water underline" onClick={() => project && go("quests", project.id)}>
            {task ? task.title : project?.title}
          </button>
        )}
        <p className="break-words whitespace-pre-wrap">{c.body}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {!mine && !c.acknowledged_at && <button className="btn btn-sm btn-green" onClick={() => actions.ack(c.id)}>{t("acknowledge")}</button>}
          {c.acknowledged_at && <span className="text-xs text-ink-soft">✓ {t("acknowledged")}</span>}
          {c.kind === "suggestion" && onMakeProject && (
            <button className="btn btn-sm btn-blue" onClick={() => onMakeProject(c.body.slice(0, 120))}>{t("make_project")}</button>
          )}
          {mine && (
            <button className="btn btn-sm btn-ghost ml-auto text-ink-soft" aria-label={t("delete")} onClick={() => {
              if (window.confirm(t("confirm_delete"))) actions.deleteComment(c.id);
            }}>🗑</button>
          )}
        </div>
      </div>
    </div>
  );
}
