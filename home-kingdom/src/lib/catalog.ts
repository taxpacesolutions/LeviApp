import type { Lang } from "./types";

type Text = Record<Lang, string>;

export const ACHIEVEMENTS: { key: string; icon: string; title: Text; desc: Text }[] = [
  { key: "first_task", icon: "check", title: { es: "Primer paso", en: "First step" }, desc: { es: "Completa tu primera tarea", en: "Complete your first task" } },
  { key: "tasks_10", icon: "hammer", title: { es: "Manos a la obra", en: "Hands on" }, desc: { es: "10 tareas completadas", en: "10 tasks completed" } },
  { key: "tasks_25", icon: "wrench", title: { es: "Artesanía", en: "Craftwork" }, desc: { es: "25 tareas completadas", en: "25 tasks completed" } },
  { key: "tasks_50", icon: "shield", title: { es: "Imparable", en: "Unstoppable" }, desc: { es: "50 tareas completadas", en: "50 tasks completed" } },
  { key: "tasks_100", icon: "crown", title: { es: "Leyenda del hogar", en: "Home legend" }, desc: { es: "100 tareas completadas", en: "100 tasks completed" } },
  { key: "first_project", icon: "flag", title: { es: "Misión cumplida", en: "Quest complete" }, desc: { es: "Completa una misión", en: "Complete a quest" } },
  { key: "projects_3", icon: "scroll", title: { es: "Tres banderas", en: "Three flags" }, desc: { es: "3 misiones completadas", en: "3 quests completed" } },
  { key: "projects_10", icon: "castle", title: { es: "Fundadores", en: "Founders" }, desc: { es: "10 misiones completadas", en: "10 quests completed" } },
  { key: "teamwork_1", icon: "hearts", title: { es: "Trabajo en equipo", en: "Teamwork" }, desc: { es: "Completa algo juntos", en: "Finish something together" } },
  { key: "teamwork_10", icon: "hearts", title: { es: "Mejor juntos", en: "Better together" }, desc: { es: "10 logros en equipo", en: "10 team wins" } },
  { key: "level_3", icon: "star", title: { es: "En ascenso", en: "Rising" }, desc: { es: "Llega al nivel 3", en: "Reach level 3" } },
  { key: "level_5", icon: "crown", title: { es: "Maestría", en: "Mastery" }, desc: { es: "Llega al nivel 5", en: "Reach level 5" } },
  { key: "first_reward", icon: "gift", title: { es: "Un gusto merecido", en: "Well deserved" }, desc: { es: "Canjea tu primera recompensa", en: "Redeem your first reward" } },
  { key: "generous", icon: "chest", title: { es: "Corazón generoso", en: "Generous heart" }, desc: { es: "Aporta 100 de oro al tesoro", en: "Give 100 gold to the treasury" } },
  { key: "campfire_1", icon: "fire", title: { es: "Junto al fuego", en: "By the fire" }, desc: { es: "Responde una pregunta en la fogata", en: "Answer a campfire question" } },
  { key: "campfire_10", icon: "fire", title: { es: "Buenas charlas", en: "Good talks" }, desc: { es: "10 respuestas en la fogata", en: "10 campfire answers" } },
];

// Every decoration that can appear in the kingdom scene.
export const UNLOCKS: Record<string, { title: Text; source: "project" | "shop" }> = {
  workshop: { source: "project", title: { es: "Taller y oficina", en: "Workshop & office" } },
  garden: { source: "project", title: { es: "Jardín de flores", en: "Flower garden" } },
  door: { source: "project", title: { es: "Puerta nueva", en: "New door" } },
  window_boxes: { source: "project", title: { es: "Jardineras en las ventanas", en: "Window boxes" } },
  welcome_mat: { source: "project", title: { es: "Entrada acogedora", en: "Cozy entrance" } },
  banner: { source: "project", title: { es: "Estandarte del hogar", en: "Home banner" } },
  tool_rack: { source: "project", title: { es: "Banco de herramientas", en: "Tool bench" } },
  cart: { source: "project", title: { es: "Carreta", en: "Cart" } },
  barn: { source: "project", title: { es: "Granero de almacenaje", en: "Storage barn" } },
  lamps: { source: "project", title: { es: "Faroles", en: "Lamp posts" } },
  stone_path: { source: "project", title: { es: "Camino de piedra", en: "Stone path" } },
  wide_road: { source: "project", title: { es: "Camino ancho", en: "Wide road" } },
  deck: { source: "project", title: { es: "Terraza de madera", en: "Wooden deck" } },
  fence: { source: "project", title: { es: "Cerca blanca", en: "Picket fence" } },
  chest: { source: "project", title: { es: "Cofre del tesoro", en: "Treasure chest" } },
  flowerbed: { source: "shop", title: { es: "Flores para el reino", en: "Kingdom flowers" } },
  tree: { source: "shop", title: { es: "Árbol decorativo", en: "Decorative tree" } },
  bench: { source: "shop", title: { es: "Banco de jardín", en: "Garden bench" } },
  mailbox: { source: "shop", title: { es: "Buzón", en: "Mailbox" } },
  roof_blue: { source: "shop", title: { es: "Techo azul", en: "Blue roof" } },
  roof_green: { source: "shop", title: { es: "Techo verde", en: "Green roof" } },
  cat: { source: "shop", title: { es: "Gatito", en: "Kitty" } },
  dog: { source: "shop", title: { es: "Perrito", en: "Puppy" } },
  fountain: { source: "shop", title: { es: "Pequeña fuente", en: "Small fountain" } },
};

// Icons a quest or reward can use (all drawn in src/pixel/icons.ts).
export const PROJECT_ICONS = ["scroll", "garage", "patio", "door", "ruler", "floor", "broom", "hammer", "wrench", "shed",
  "bolt", "road", "deck", "house", "coins", "hearts", "star", "flag"];
export const REWARD_ICONS = ["gift", "movie", "breakfast", "clock", "treat", "sun", "heart", "food", "star", "hearts", "coins", "fire"];
