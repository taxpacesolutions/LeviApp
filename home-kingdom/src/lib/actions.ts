import { useMemo } from "react";
import { supabase } from "./supabase";
import { must, useStore } from "./store";
import { useT } from "./i18n";
import type { Award, CommentKind, Project, Task, TaskStatus } from "./types";

type RpcResult = { awards?: Award[]; unlock?: string | null; status?: string };

// Every change the app can make, in one place. Gold/XP changes always go
// through database functions; plain edits go straight to the tables, where
// Row Level Security checks them.
export function useActions() {
  const { run, celebrate, partner } = useStore();
  const t = useT();

  return useMemo(() => {
    const rpc = (fn: string, args: Record<string, unknown>) => must(supabase.rpc(fn, args)) as Promise<RpcResult>;

    const setTaskStatus = async (task: Task, status: TaskStatus) => {
      const res = await run(() => rpc("hk_set_task_status", { p_task: task.id, p_status: status }),
        ["hk_tasks", "hk_projects", "hk_profiles", "hk_achievements", "hk_ledger"]);
      if (res?.awards?.length) celebrate(res.awards);
    };

    return {
      setTaskStatus,
      toggleTask: (task: Task) => setTaskStatus(task, task.status === "completed" ? "pending" : "completed"),
      async completeProject(project: Project) {
        const res = await run(() => rpc("hk_complete_project", { p_project: project.id }),
          ["hk_projects", "hk_profiles", "hk_unlocks", "hk_achievements", "hk_ledger"]);
        if (res) celebrate(res.awards ?? [], res.unlock);
      },
      setProjectStatus(project: Project, status: "not_started" | "in_progress" | "paused") {
        return run(() => rpc("hk_set_project_status", { p_project: project.id, p_status: status }), ["hk_projects"]);
      },
      async createProject(values: Partial<Project>) {
        const row = await run(() => must(supabase.from("hk_projects").insert(values).select("id").single()), ["hk_projects"]);
        return (row as { id: string } | undefined)?.id;
      },
      updateProject(id: string, values: Partial<Project>) {
        return run(() => must(supabase.from("hk_projects").update(values).eq("id", id)), ["hk_projects"], t("saved"));
      },
      deleteProject(id: string) {
        return run(() => must(supabase.from("hk_projects").delete().eq("id", id)), ["hk_projects", "hk_tasks", "hk_comments"]);
      },
      createTask(values: Partial<Task>) {
        return run(() => must(supabase.from("hk_tasks").insert(values)), ["hk_tasks"]);
      },
      updateTask(id: string, values: Partial<Task>) {
        return run(() => must(supabase.from("hk_tasks").update(values).eq("id", id)), ["hk_tasks"]);
      },
      deleteTask(id: string) {
        return run(() => must(supabase.from("hk_tasks").delete().eq("id", id)), ["hk_tasks"]);
      },
      contribute(amount: number) {
        return run(() => rpc("hk_contribute", { p_amount: amount }), ["hk_profiles", "hk_households", "hk_achievements", "hk_ledger"], t("saved"));
      },
      async buy(itemId: string, payFrom: "self" | "treasury") {
        const res = await run(() => rpc("hk_buy", { p_item: itemId, p_pay_from: payFrom }),
          ["hk_profiles", "hk_households", "hk_redemptions", "hk_unlocks", "hk_achievements", "hk_ledger"]);
        return res?.status;
      },
      decide(redemptionId: string, approve: boolean) {
        return run(() => rpc("hk_decide_redemption", { p_redemption: redemptionId, p_approve: approve }),
          ["hk_redemptions", "hk_profiles", "hk_households", "hk_achievements", "hk_ledger"], approve ? t("redeemed") : undefined);
      },
      cancelRedemption(id: string) {
        return run(() => rpc("hk_cancel_redemption", { p_redemption: id }), ["hk_redemptions"]);
      },
      completeRedemption(id: string) {
        return run(() => rpc("hk_complete_redemption", { p_redemption: id }), ["hk_redemptions"]);
      },
      saveItem(id: string | null, values: Record<string, unknown>) {
        const q = id ? supabase.from("hk_shop_items").update(values).eq("id", id) : supabase.from("hk_shop_items").insert(values);
        return run(() => must(q), ["hk_shop_items"], t("saved"));
      },
      deleteItem(id: string) {
        return run(() => must(supabase.from("hk_shop_items").delete().eq("id", id)), ["hk_shop_items"]);
      },
      comment(values: { kind: CommentKind; body: string; project_id?: string | null; task_id?: string | null }) {
        return run(() => must(supabase.from("hk_comments").insert(values)), ["hk_comments"]);
      },
      ack(id: string) {
        return run(() => rpc("hk_ack_comment", { p_comment: id }), ["hk_comments"]);
      },
      deleteComment(id: string) {
        return run(() => must(supabase.from("hk_comments").delete().eq("id", id)), ["hk_comments"]);
      },
      answer(questionId: string, answer: string) {
        return run(() => must(supabase.from("hk_campfire_answers").insert({ question_id: questionId, answer })),
          ["hk_campfire_answers", "hk_achievements"]);
      },
      deleteAnswer(id: string) {
        return run(() => must(supabase.from("hk_campfire_answers").delete().eq("id", id)), ["hk_campfire_answers"]);
      },
      mark(questionId: string, values: { saved?: boolean; completed_at?: string | null }, current?: { saved: boolean; completed_at: string | null }) {
        const row = { question_id: questionId, saved: current?.saved ?? false, completed_at: current?.completed_at ?? null, ...values };
        return run(() => must(supabase.from("hk_campfire_marks").upsert(row, { onConflict: "household_id,question_id" })),
          ["hk_campfire_marks"]);
      },
      addQuestion(category: string, text: string) {
        return run(() => must(supabase.from("hk_campfire_questions").insert({ category, text_es: text, text_en: text })),
          ["hk_campfire_questions"], t("saved"));
      },
      deleteQuestion(id: string) {
        return run(() => must(supabase.from("hk_campfire_questions").delete().eq("id", id)), ["hk_campfire_questions"]);
      },
      setUnlock(id: string, enabled: boolean) {
        return run(() => must(supabase.from("hk_unlocks").update({ enabled }).eq("id", id)), ["hk_unlocks"]);
      },
      updateProfile(id: string, values: Record<string, unknown>) {
        return run(() => must(supabase.from("hk_profiles").update(values).eq("id", id)), ["hk_profiles"]);
      },
      updateHousehold(id: string, values: Record<string, unknown>) {
        return run(() => must(supabase.from("hk_households").update(values).eq("id", id)), ["hk_households"], t("saved"));
      },
      partnerName: partner?.display_name ?? "",
    };
  }, [run, celebrate, partner, t]);
}
