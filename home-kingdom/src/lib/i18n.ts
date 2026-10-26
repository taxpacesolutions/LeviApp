import { createContext, useContext, useMemo } from "react";
import type { Hero, Lang } from "./types";

const es = {
  tagline: "Dos héroes. Un hogar. Nuestro reino.",
  // nav
  nav_home: "Inicio", nav_quests: "Misiones", nav_shop: "Tienda", nav_campfire: "Fogata", nav_kingdom: "Reino",
  // common
  icon: "Icono", save: "Guardar", cancel: "Cancelar", close: "Cerrar", delete: "Eliminar", edit: "Editar", add: "Añadir",
  confirm_delete: "¿Seguro que quieres eliminarlo? No se puede deshacer.",
  saved: "Guardado", error: "Algo salió mal. Inténtalo otra vez.", offline: "Sin conexión. Mostrando lo último guardado.",
  loading: "Cargando el reino…", gold: "oro", xp: "XP", level: "Nivel", optional: "opcional",
  both: "Ambos", jessica: "Jessica", mariano: "Mariano", you: "tú", none: "Ninguno",
  // login
  login_title: "Entrar al reino", email: "Correo electrónico", password: "Contraseña",
  sign_in: "Entrar", sign_up: "Crear mi cuenta", have_account: "Ya tengo cuenta", no_account: "Primera vez aquí",
  forgot: "Olvidé mi contraseña", send_reset: "Enviar enlace", reset_sent: "Te enviamos un enlace a tu correo.",
  check_email: "Revisa tu correo y confirma la cuenta. Luego vuelve y entra.",
  new_password: "Nueva contraseña", set_password: "Guardar contraseña", password_hint: "Mínimo 8 caracteres.",
  bad_login: "Correo o contraseña incorrectos.",
  not_member_title: "Esta cuenta no tiene llave del reino",
  not_member_body: "Home Kingdom es privado. Solo las cuentas de Jessica y Mariano pueden entrar. Si eres una de ellas, pide que tu correo se registre en la configuración (ver README) y confirma tu correo.",
  sign_out: "Salir",
  setup_title: "Falta conectar la base de datos",
  setup_body: "Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver README) y vuelve a publicar.",
  // home
  treasury: "Tesoro compartido", contribute: "Aportar", contribute_title: "Aportar al tesoro",
  contribute_body: "El oro del tesoro es de los dos. Sirve para recompensas compartidas y para decorar el reino.",
  amount: "Cantidad", attention: "Necesita atención", nothing_attention: "Todo en calma. ¡Buen trabajo, héroes!",
  active_quests: "Misiones activas", no_active: "Ninguna misión en curso. Elige una para empezar.",
  kingdom_progress: "Progreso del hogar", tasks_done: "{n} de {total} tareas",
  add_button: "Añadir", add_what: "¿Qué quieres añadir?",
  add_project: "Misión principal", add_project_hint: "Un proyecto del hogar con su lista de tareas",
  add_task: "Tarea", add_task_hint: "Un paso pequeño dentro de una misión",
  add_coop: "Misión en equipo", add_coop_hint: "Algo para hacer juntos",
  add_message: "Mensaje", add_message_hint: "Agradecer, pedir ayuda o sugerir una idea",
  board: "Tablón de mensajes", no_messages: "Sin mensajes nuevos.",
  acknowledge: "Visto ✓", acknowledged: "Visto", show_all: "Ver todo", show_less: "Ver menos",
  pending_approval: "{name} pide: {title}", due_soon: "Vence pronto", overdue: "Vencida", high_priority: "Prioridad alta",
  help_request: "Pide ayuda",
  // quests
  quests_title: "Tablón de misiones",
  filter_active: "Activas", filter_mine: "Mías", filter_partner: "De {name}", filter_both: "En equipo",
  filter_done: "Completadas", filter_archived: "Archivadas",
  no_quests: "No hay misiones aquí.",
  status_not_started: "Sin empezar", status_in_progress: "En curso", status_paused: "En pausa", status_completed: "Completada",
  tstatus_pending: "Pendiente", tstatus_in_progress: "En curso", tstatus_completed: "Hecha",
  priority: "Prioridad", priority_low: "Baja", priority_medium: "Media", priority_high: "Alta",
  size: "Tamaño", size_small: "Pequeña", size_medium: "Mediana", size_large: "Grande",
  assigned: "Asignada a", target_date: "Fecha objetivo", due_date: "Fecha límite", budget: "Presupuesto estimado",
  title: "Nombre", description: "Descripción", notes: "Notas", reward: "Recompensa",
  project_new: "Nueva misión principal", coop_new: "Nueva misión en equipo", project_edit: "Editar misión",
  task_new: "Nueva tarea", task_edit: "Editar tarea", choose_project: "Misión",
  add_task_placeholder: "Añadir una tarea…", tasks: "Tareas", no_tasks: "Aún no hay tareas. Añade la primera.",
  pause: "Pausar", resume: "Reanudar", start: "Empezar", archive: "Archivar", unarchive: "Desarchivar",
  complete_project: "¡Completar misión!", complete_confirm: "Quedan {n} tareas sin hacer. ¿Completar la misión igualmente?",
  reopen: "Reabrir", reopen_project: "Reabrir misión", mark_in_progress: "Marcar en curso", mark_pending: "Marcar pendiente",
  rewards_once: "Las recompensas se ganan una sola vez. Reabrir una tarea no quita el oro, y volver a completarla no lo duplica.",
  unlocks: "Desbloquea", back: "Volver", coop_badge: "En equipo", coop_hint: "Cada héroe recibe la recompensa una vez. Cualquiera de los dos puede confirmarla.",
  comments: "Notas y preguntas", comment_placeholder: "Escribe una nota corta…", send: "Enviar",
  kind_note: "Nota", kind_question: "Pregunta", kind_help: "Pedir ayuda", kind_appreciation: "Agradecimiento", kind_suggestion: "Idea de proyecto",
  ask_about_task: "Preguntar sobre esta tarea", task_question_prefix: "Sobre «{title}»: ",
  make_project: "Convertir en misión",
  coop_ideas: "Ideas para empezar",
  coop_idea_1: "Organizar el garaje juntos", coop_idea_2: "Planear el próximo proyecto del hogar",
  coop_idea_3: "Limpiar y organizar el patio", coop_idea_4: "Planear una noche de cita",
  coop_idea_5: "Elegir materiales para una renovación", coop_idea_6: "Revisar el presupuesto del hogar",
  completed_on: "Completada el {date}",
  // rewards
  earned: "¡Ganaste!", earned_both: "¡Los dos ganan!", level_up: "¡{name} subió a nivel {level}!",
  new_achievement: "Nuevo logro: {title}", unlocked_toast: "¡Nuevo en el reino: {title}!",
  // shop
  shop_title: "La Tienda del Reino", shop_virtual: "Para el reino", shop_real: "Vida real", shop_requests: "Solicitudes",
  buy: "Comprar", request: "Pedir", owned: "Ya es tuyo", pay_from: "Pagar con", pay_self: "Mi oro ({n})", pay_treasury: "Tesoro ({n})",
  not_enough: "No hay oro suficiente todavía.", bought: "¡Comprado! Míralo en el Reino.",
  requested: "Pedido enviado. {name} debe aprobarlo.", redeemed: "¡Canjeado!",
  needs_ok: "Necesita el sí de la otra persona", consent_note: "Las recompensas de vida real son acuerdos amables y voluntarios. Cualquiera puede decir que no, sin explicaciones. Nada aquí obliga a nadie.",
  reward_new: "Nueva recompensa", reward_edit: "Editar recompensa", price: "Precio (oro)",
  requires_approval: "Necesita aprobación de la otra persona", hidden: "Oculta", show_in_shop: "Visible en la tienda",
  r_requested: "Pedida", r_approved: "Aprobada y canjeada", r_completed: "Cumplida", r_declined: "No esta vez", r_cancelled: "Cancelada",
  approve: "Aprobar", decline: "No esta vez", mark_done: "Marcar cumplida", cancel_request: "Cancelar pedido",
  to_approve: "Esperan tu respuesta", my_requests: "Mis pedidos", to_enjoy: "Para disfrutar", history: "Historial",
  no_requests: "No hay solicitudes por ahora.", from_treasury: "del tesoro", treasury_needs_ok: "Usar el tesoro siempre necesita el sí de los dos.",
  // campfire
  campfire_title: "La Fogata", campfire_intro: "Una pregunta para charlar, sin prisa. Respondan si quieren, cuando quieran.",
  cat_all: "Todas", cat_know: "Conocernos", cat_appreciation: "Aprecio", cat_dreams: "Sueños y metas", cat_communication: "Comunicación",
  answer: "Responder", your_answer: "Tu respuesta…", skip: "Otra pregunta", save_q: "Guardar", saved_q: "Guardada",
  mark_talked: "Ya lo hablamos", talked: "Conversación hecha", saved_questions: "Guardadas", talked_questions: "Ya conversadas",
  no_more_questions: "¡Han conversado todas las preguntas de esta categoría! Añadan las suyas.",
  add_question: "Añadir pregunta", question_es: "Pregunta", private_note: "Solo ustedes dos pueden ver estas respuestas.",
  answers: "Respuestas", open_again: "Volver a abrir",
  // kingdom
  kingdom_title: "Nuestro Reino", kingdom_intro: "El reino crece con cada misión completada.",
  decorations: "Decoraciones", locked: "Bloqueado", how_unlock: "Completa: {title}", from_shop: "En la tienda",
  show: "Mostrar", hide: "Ocultar", achievements: "Logros", no_achievements: "Los logros aparecerán al completar tareas.",
  // settings
  settings: "Ajustes", my_hero: "Mi héroe", name: "Nombre", role: "Título", language: "Idioma",
  hair: "Peinado", hair_color: "Color de pelo", skin: "Tono de piel", outfit: "Ropa", accessory: "Accesorio", hat: "Sombrero",
  economy: "Recompensas por defecto", economy_hint: "Se usan al crear tareas y misiones nuevas. Las existentes no cambian.",
  task_small: "Tarea pequeña", task_medium: "Tarea mediana", task_large: "Tarea grande", project_reward: "Misión principal", coop_reward: "Misión en equipo (cada uno)",
  kingdom_name: "Nombre del reino", backup: "Copia de seguridad", backup_hint: "Descarga todos los proyectos, tareas y datos.",
  download_json: "Descargar todo (JSON)", download_csv: "Tareas en hoja de cálculo (CSV)", version: "Versión",
  install_hint: "Instalar: en iPhone usa Compartir → «Añadir a pantalla de inicio». En Android, menú ⋮ → «Instalar app».",
  gold_note: "El oro es virtual y no tiene valor en dinero.",
  err_insufficient_gold: "No hay oro suficiente todavía.", err_insufficient_treasury: "El tesoro no tiene oro suficiente.",
  err_already_owned: "Eso ya está en el reino.", err_cannot_approve_own: "La otra persona debe aprobarlo.",
  err_already_decided: "Esta solicitud ya fue respondida.", err_not_found: "No se encontró. Quizá se eliminó.",
  err_bad_amount: "Escribe una cantidad mayor que cero.", err_offline: "Sin conexión. Inténtalo cuando vuelva internet.",
  err_not_a_member: "Esta cuenta no pertenece al reino.",
};

type Dict = typeof es;

const en: Dict = {
  tagline: "Two Heroes. One Home. Our Kingdom.",
  nav_home: "Home", nav_quests: "Quests", nav_shop: "Shop", nav_campfire: "Campfire", nav_kingdom: "Kingdom",
  icon: "Icon", save: "Save", cancel: "Cancel", close: "Close", delete: "Delete", edit: "Edit", add: "Add",
  confirm_delete: "Delete this? It can't be undone.",
  saved: "Saved", error: "Something went wrong. Please try again.", offline: "Offline. Showing the last saved data.",
  loading: "Loading the kingdom…", gold: "gold", xp: "XP", level: "Level", optional: "optional",
  both: "Both", jessica: "Jessica", mariano: "Mariano", you: "you", none: "None",
  login_title: "Enter the kingdom", email: "Email", password: "Password",
  sign_in: "Sign in", sign_up: "Create my account", have_account: "I have an account", no_account: "First time here",
  forgot: "Forgot my password", send_reset: "Send link", reset_sent: "We sent a link to your email.",
  check_email: "Check your email and confirm the account. Then come back and sign in.",
  new_password: "New password", set_password: "Save password", password_hint: "At least 8 characters.",
  bad_login: "Wrong email or password.",
  not_member_title: "This account has no key to the kingdom",
  not_member_body: "Home Kingdom is private. Only Jessica's and Mariano's accounts can enter. If you are one of them, make sure your email is registered in the setup (see README) and confirmed.",
  sign_out: "Sign out",
  setup_title: "The database isn't connected yet",
  setup_body: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README) and publish again.",
  treasury: "Shared treasury", contribute: "Contribute", contribute_title: "Contribute to the treasury",
  contribute_body: "Treasury gold belongs to both of you. Use it for shared rewards and kingdom decorations.",
  amount: "Amount", attention: "Needs attention", nothing_attention: "All calm. Great work, heroes!",
  active_quests: "Active quests", no_active: "No quests in progress. Pick one to start.",
  kingdom_progress: "Home progress", tasks_done: "{n} of {total} tasks",
  add_button: "Add", add_what: "What would you like to add?",
  add_project: "Main quest", add_project_hint: "A home project with its task list",
  add_task: "Task", add_task_hint: "A small step inside a quest",
  add_coop: "Team quest", add_coop_hint: "Something to do together",
  add_message: "Message", add_message_hint: "Say thanks, ask for help or suggest an idea",
  board: "Message board", no_messages: "No new messages.",
  acknowledge: "Seen ✓", acknowledged: "Seen", show_all: "Show all", show_less: "Show less",
  pending_approval: "{name} asks: {title}", due_soon: "Due soon", overdue: "Overdue", high_priority: "High priority",
  help_request: "Asks for help",
  quests_title: "Quest board",
  filter_active: "Active", filter_mine: "Mine", filter_partner: "{name}'s", filter_both: "Team",
  filter_done: "Completed", filter_archived: "Archived",
  no_quests: "No quests here.",
  status_not_started: "Not started", status_in_progress: "In progress", status_paused: "Paused", status_completed: "Completed",
  tstatus_pending: "Pending", tstatus_in_progress: "In progress", tstatus_completed: "Done",
  priority: "Priority", priority_low: "Low", priority_medium: "Medium", priority_high: "High",
  size: "Size", size_small: "Small", size_medium: "Medium", size_large: "Large",
  assigned: "Assigned to", target_date: "Target date", due_date: "Due date", budget: "Estimated budget",
  title: "Name", description: "Description", notes: "Notes", reward: "Reward",
  project_new: "New main quest", coop_new: "New team quest", project_edit: "Edit quest",
  task_new: "New task", task_edit: "Edit task", choose_project: "Quest",
  add_task_placeholder: "Add a task…", tasks: "Tasks", no_tasks: "No tasks yet. Add the first one.",
  pause: "Pause", resume: "Resume", start: "Start", archive: "Archive", unarchive: "Unarchive",
  complete_project: "Complete quest!", complete_confirm: "{n} tasks are still open. Complete the quest anyway?",
  reopen: "Reopen", reopen_project: "Reopen quest", mark_in_progress: "Mark in progress", mark_pending: "Mark pending",
  rewards_once: "Rewards are earned once. Reopening a task keeps the gold, and completing it again doesn't pay twice.",
  unlocks: "Unlocks", back: "Back", coop_badge: "Team", coop_hint: "Each hero gets the reward once. Either of you can confirm it.",
  comments: "Notes and questions", comment_placeholder: "Write a short note…", send: "Send",
  kind_note: "Note", kind_question: "Question", kind_help: "Ask for help", kind_appreciation: "Thank you", kind_suggestion: "Project idea",
  ask_about_task: "Ask about this task", task_question_prefix: "About “{title}”: ",
  make_project: "Turn into a quest",
  coop_ideas: "Ideas to start",
  coop_idea_1: "Organize the garage together", coop_idea_2: "Plan the next home project",
  coop_idea_3: "Clean and organize the patio", coop_idea_4: "Plan a date night",
  coop_idea_5: "Choose materials for a renovation", coop_idea_6: "Review the household budget",
  completed_on: "Completed on {date}",
  earned: "You earned!", earned_both: "You both earn!", level_up: "{name} reached level {level}!",
  new_achievement: "New achievement: {title}", unlocked_toast: "New in the kingdom: {title}!",
  shop_title: "The Kingdom Shop", shop_virtual: "For the kingdom", shop_real: "Real life", shop_requests: "Requests",
  buy: "Buy", request: "Request", owned: "Already yours", pay_from: "Pay with", pay_self: "My gold ({n})", pay_treasury: "Treasury ({n})",
  not_enough: "Not enough gold yet.", bought: "Bought! See it in the Kingdom.",
  requested: "Request sent. {name} needs to approve it.", redeemed: "Redeemed!",
  needs_ok: "Needs the other person's yes", consent_note: "Real-life rewards are kind, voluntary agreements. Either of you can say no, no reasons needed. Nothing here obliges anyone.",
  reward_new: "New reward", reward_edit: "Edit reward", price: "Price (gold)",
  requires_approval: "Needs the other person's approval", hidden: "Hidden", show_in_shop: "Visible in the shop",
  r_requested: "Requested", r_approved: "Approved & redeemed", r_completed: "Enjoyed", r_declined: "Not this time", r_cancelled: "Cancelled",
  approve: "Approve", decline: "Not this time", mark_done: "Mark enjoyed", cancel_request: "Cancel request",
  to_approve: "Waiting for your answer", my_requests: "My requests", to_enjoy: "To enjoy", history: "History",
  no_requests: "No requests right now.", from_treasury: "from the treasury", treasury_needs_ok: "Using the treasury always needs both of you to agree.",
  campfire_title: "The Campfire", campfire_intro: "One question to talk about, no rush. Answer if and when you like.",
  cat_all: "All", cat_know: "Getting to know", cat_appreciation: "Appreciation", cat_dreams: "Dreams & goals", cat_communication: "Communication",
  answer: "Answer", your_answer: "Your answer…", skip: "Another question", save_q: "Save", saved_q: "Saved",
  mark_talked: "We talked about it", talked: "Conversation done", saved_questions: "Saved", talked_questions: "Already talked",
  no_more_questions: "You've talked through every question in this category! Add your own.",
  add_question: "Add a question", question_es: "Question", private_note: "Only the two of you can see these answers.",
  answers: "Answers", open_again: "Open again",
  kingdom_title: "Our Kingdom", kingdom_intro: "The kingdom grows with every completed quest.",
  decorations: "Decorations", locked: "Locked", how_unlock: "Complete: {title}", from_shop: "In the shop",
  show: "Show", hide: "Hide", achievements: "Achievements", no_achievements: "Achievements appear as you complete tasks.",
  settings: "Settings", my_hero: "My hero", name: "Name", role: "Title", language: "Language",
  hair: "Hairstyle", hair_color: "Hair color", skin: "Skin tone", outfit: "Outfit", accessory: "Accessory", hat: "Hat",
  economy: "Default rewards", economy_hint: "Used when creating new tasks and quests. Existing ones don't change.",
  task_small: "Small task", task_medium: "Medium task", task_large: "Large task", project_reward: "Main quest", coop_reward: "Team quest (each)",
  kingdom_name: "Kingdom name", backup: "Backup", backup_hint: "Download all projects, tasks and data.",
  download_json: "Download everything (JSON)", download_csv: "Tasks as spreadsheet (CSV)", version: "Version",
  install_hint: "Install: on iPhone use Share → “Add to Home Screen”. On Android, menu ⋮ → “Install app”.",
  gold_note: "Gold is virtual and has no cash value.",
  err_insufficient_gold: "Not enough gold yet.", err_insufficient_treasury: "The treasury doesn't have enough gold.",
  err_already_owned: "That's already in the kingdom.", err_cannot_approve_own: "The other person needs to approve it.",
  err_already_decided: "This request was already answered.", err_not_found: "Not found. Maybe it was deleted.",
  err_bad_amount: "Enter an amount above zero.", err_offline: "Offline. Try again when you're back online.",
  err_not_a_member: "This account doesn't belong to the kingdom.",
};

export type TKey = keyof Dict;
const dicts: Record<Lang, Dict> = { es, en };

export function hasKey(key: string): key is TKey {
  return key in es;
}

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>) {
  let s: string = dicts[lang][key] ?? dicts.es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export const LangContext = createContext<Lang>("es");
export function useT() {
  const lang = useContext(LangContext);
  return useMemo(
    () => Object.assign((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), { lang }),
    [lang],
  );
}

// Level titles (Spanish uses the hero's grammatical gender).
const LEVEL_TITLES: Record<Lang, Record<Hero, string[]>> = {
  es: {
    jessica: ["Aventurera Novata", "Aprendiz", "Constructora", "Guardiana", "Maestra del Reino"],
    mariano: ["Aventurero Novato", "Aprendiz", "Constructor", "Guardián", "Maestro del Reino"],
  },
  en: {
    jessica: ["New Adventurer", "Apprentice", "Builder", "Guardian", "Kingdom Master"],
    mariano: ["New Adventurer", "Apprentice", "Builder", "Guardian", "Kingdom Master"],
  },
};
export function levelTitle(lang: Lang, hero: Hero, level: number) {
  return LEVEL_TITLES[lang][hero][Math.min(Math.max(level, 1), 5) - 1];
}

export function fmtDate(lang: Lang, iso: string | null | undefined) {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString(lang === "es" ? "es" : "en", { day: "numeric", month: "short" });
}

export function fmtMoney(lang: Lang, n: number | null | undefined) {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat(lang === "es" ? "es" : "en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
