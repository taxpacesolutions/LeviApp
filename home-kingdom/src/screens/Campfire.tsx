import { useMemo, useState } from "react";
import { Icon } from "../pixel/Sprite";
import { Empty, Field, HeroAvatar, Panel, Segmented, Sheet } from "../components/ui";
import { useStore } from "../lib/store";
import { useActions } from "../lib/actions";
import { fmtDate, useT, type TKey } from "../lib/i18n";
import type { Question, QuestionCategory } from "../lib/types";

type Cat = "all" | QuestionCategory;
const CATS: Cat[] = ["all", "know", "appreciation", "dreams", "communication"];

// Calm, voluntary conversation prompts. No scores, no streaks, no pressure.
export function Campfire() {
  const t = useT();
  const { data, me, partner } = useStore();
  const actions = useActions();
  const [cat, setCat] = useState<Cat>("all");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [answering, setAnswering] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const marks = useMemo(() => new Map(data.marks.map((m) => [m.question_id, m])), [data.marks]);
  const text = (q: Question) => (t.lang === "en" && q.text_en ? q.text_en : q.text_es);
  const talked = (q: Question) => Boolean(marks.get(q.id)?.completed_at);
  const pool = data.questions.filter((q) => (cat === "all" || q.category === cat) && !talked(q));

  // A stable shuffled order so "another question" feels random but never repeats too soon.
  const order = useMemo(() => {
    const seed = new Date().toDateString();
    const h = (s: string) => [...(s + seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
    return [...pool].sort((a, b) => h(a.id) - h(b.id));
  }, [pool.map((q) => q.id).join(","), cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const explicit = currentId ? data.questions.find((q) => q.id === currentId) : undefined;
  const current = explicit ?? order.find((q) => !skipped.includes(q.id)) ?? order[0];
  const answers = current ? data.answers.filter((a) => a.question_id === current.id) : [];
  const mark = current ? marks.get(current.id) : undefined;
  const saved = data.questions.filter((q) => marks.get(q.id)?.saved && !talked(q));
  const done = data.questions.filter(talked);

  function next() {
    if (!current) return;
    setAnswering(false);
    setDraft("");
    setCurrentId(null);
    const rest = order.filter((q) => q.id !== current.id && !skipped.includes(q.id));
    setSkipped(rest.length ? [...skipped, current.id] : []);
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="panel overflow-hidden p-0">
        <div className="relative flex items-end justify-center gap-4 bg-gradient-to-b from-[#24304f] to-[#3d4a6b] px-3 pt-6 pb-3">
          <span className="absolute top-2 left-4 text-xs text-[#f6e3bd]">✦</span>
          <span className="absolute top-5 right-10 text-[10px] text-[#f6e3bd]">✦</span>
          <span className="absolute top-3 right-24 text-[8px] text-[#f6e3bd]">✦</span>
          <HeroAvatar profile={me} scale={3} />
          <span className="flicker"><Icon name="fire" size={5} /></span>
          <HeroAvatar profile={partner} scale={3} className="-scale-x-100" />
        </div>
        <div className="panel-wood rounded-none border-x-0 border-b-0 px-3 py-2">
          <h1 className="text-xl text-[#fff8e6]">{t("campfire_title")}</h1>
          <p className="text-sm text-[#f6e3bd]">{t("campfire_intro")}</p>
        </div>
      </header>

      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {CATS.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => { setCat(c); setCurrentId(null); setSkipped([]); setAnswering(false); }}>
            {t(`cat_${c}` as TKey)}
          </button>
        ))}
      </div>

      {!current ? (
        <div className="panel p-3"><Empty>{t("no_more_questions")}</Empty></div>
      ) : (
        <section className="panel-parchment p-4">
          <p className="mb-1 text-xs font-bold tracking-wide text-ink-soft uppercase">{t(`cat_${current.category}` as TKey)}</p>
          <p className="font-pixel text-xl leading-snug">{text(current)}</p>

          {answers.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {answers.map((a) => {
                const who = data.profiles.find((p) => p.id === a.profile_id);
                return (
                  <li key={a.id} className="flex gap-2 rounded bg-paper p-2">
                    <HeroAvatar profile={who} scale={2} className="flex-none" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-ink-soft"><b className="text-ink">{who?.display_name}</b> · {fmtDate(t.lang, a.created_at)}</div>
                      <p className="whitespace-pre-wrap break-words">{a.answer}</p>
                    </div>
                    {a.profile_id === me?.id && (
                      <button className="btn btn-sm btn-ghost px-1 text-ink-soft" aria-label={t("delete")}
                        onClick={() => window.confirm(t("confirm_delete")) && actions.deleteAnswer(a.id)}>🗑</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {answering ? (
            <form className="mt-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              await actions.answer(current.id, draft.trim());
              setDraft("");
              setAnswering(false);
            }}>
              <textarea className="field" autoFocus value={draft} maxLength={2000} placeholder={t("your_answer")} onChange={(e) => setDraft(e.target.value)} aria-label={t("your_answer")} />
              <div className="mt-2 flex gap-2">
                <button className="btn btn-green flex-1" disabled={!draft.trim()}>{t("save")}</button>
                <button type="button" className="btn" onClick={() => setAnswering(false)}>{t("cancel")}</button>
              </div>
            </form>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn btn-gold" onClick={() => setAnswering(true)}>✎ {t("answer")}</button>
              <button className="btn" onClick={next}>↻ {t("skip")}</button>
              <button className="btn btn-sm" aria-pressed={mark?.saved ?? false}
                onClick={() => actions.mark(current.id, { saved: !mark?.saved }, mark)}>
                {mark?.saved ? `★ ${t("saved_q")}` : `☆ ${t("save_q")}`}
              </button>
              <button className="btn btn-sm btn-green" onClick={async () => {
                await actions.mark(current.id, { completed_at: new Date().toISOString() }, mark);
                setCurrentId(null);
              }}>✓ {t("mark_talked")}</button>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-soft">🔒 {t("private_note")}</p>
        </section>
      )}

      {saved.length > 0 && (
        <Panel title={t("saved_questions")} icon="star">
          <ul className="flex flex-col gap-1">
            {saved.map((q) => (
              <li key={q.id}><button className="w-full rounded p-2 text-left hover:bg-parchment" onClick={() => { setCurrentId(q.id); setAnswering(false); window.scrollTo(0, 0); }}>★ {text(q)}</button></li>
            ))}
          </ul>
        </Panel>
      )}

      {done.length > 0 && (
        <details className="panel p-3">
          <summary className="font-pixel text-lg">✓ {t("talked_questions")} ({done.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {done.map((q) => (
              <li key={q.id} className="rounded bg-parchment p-2">
                <p className="font-semibold">{text(q)}</p>
                <p className="text-xs text-ink-soft">{t("talked")} · {fmtDate(t.lang, marks.get(q.id)?.completed_at)} · {data.answers.filter((a) => a.question_id === q.id).length} {t("answers").toLowerCase()}</p>
                <button className="btn btn-sm mt-1" onClick={async () => {
                  await actions.mark(q.id, { completed_at: null }, marks.get(q.id));
                  setCurrentId(q.id);
                  window.scrollTo(0, 0);
                }}>↺ {t("open_again")}</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button className="btn" onClick={() => setAdding(true)}>＋ {t("add_question")}</button>
      <Sheet open={adding} title={t("add_question")} onClose={() => setAdding(false)}>
        <AddQuestion onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}

function AddQuestion({ onDone }: { onDone: () => void }) {
  const t = useT();
  const actions = useActions();
  const [category, setCategory] = useState<QuestionCategory>("know");
  const [text, setText] = useState("");
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!text.trim()) return;
      await actions.addQuestion(category, text.trim());
      onDone();
    }}>
      <Segmented label=" " value={category} onChange={setCategory}
        options={(["know", "appreciation", "dreams", "communication"] as QuestionCategory[]).map((c) => ({ value: c, label: t(`cat_${c}` as TKey) }))} />
      <Field label={t("question_es")}>{(id) => <textarea id={id} className="field" value={text} maxLength={300} required onChange={(e) => setText(e.target.value)} />}</Field>
      <button className="btn btn-green w-full" disabled={!text.trim()}>{t("save")}</button>
    </form>
  );
}
