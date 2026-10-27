# 🏰 Home Kingdom

**Dos héroes. Un hogar. Nuestro reino.** — *Two Heroes. One Home. Our Kingdom.*

A private app for Jessica and Mariano that turns home projects into a cozy pixel-art RPG.
Projects are **main quests**, small steps are **tasks**, and finishing them earns **gold** and **XP**.
Gold buys decorations for your little pixel village or real-life treats that the other person approves.
There's also a **Campfire** with gentle conversation questions.

No battles, no streaks, no punishments, no leaderboards. Spanish by default, English in Settings.

---

## What's inside

| Screen | What it does |
|---|---|
| 🏠 **Inicio / Home** | Your pixel house with both heroes, gold, levels, the shared treasury, what needs attention, a message board, overall progress and active quests. |
| 📜 **Misiones / Quests** | All projects and their task checklists. Tap a box to complete a task (with a small coin animation). Create, edit, pause, archive, delete, reassign; add notes and questions. |
| 👜 **Tienda / Shop** | Kingdom decorations (instant) and real-life rewards (need the other person's yes). Requests, approvals, history. Create your own rewards. |
| 🔥 **Fogata / Campfire** | One optional question at a time. Answer, skip, save, or mark "we talked about it". No scores. |
| 🏰 **Reino / Kingdom** | The village grows as you finish quests (patio → flower garden, garage → workshop, driveway → stone path…). Achievements for each hero. |

The **＋** button (bottom right) adds a task, a main quest, a team quest, or a message (thanks, help request, project idea).
⚙️ **Settings** (gear on Home) has avatar customization, language, default reward amounts, backup download and sign-out.

### Notifications (optional)
Each of you can turn them on in **⚙️ Settings → Notificaciones**. They only arrive for important things the *other* person did:
a reward waiting for your approval, your request approved or declined, a help request, a question, a thank-you, and a completed quest.
Never reminders, never pressure. **Quiet hours: nothing arrives between 11 pm and 8 am** (it's simply skipped; you'll see it in the app).
On iPhone, install the app to the home screen first (iOS 16.4+). No setup needed: the next deploy creates the notification keys by itself.

### Starting data
15 projects from your list with 5–8 realistic starter tasks each, assigned as you described.
Nothing is completed, no dates are set, and everything is editable.

### Rewards (adjustable in Settings)

| Activity | Gold | XP |
|---|---|---|
| Small task | 10 | 10 |
| Medium task | 25 | 20 |
| Large task | 50 | 40 |
| Main quest completed | 150 | 100 |
| Team quest completed | 75 each | 50 each |

Anything assigned to **Both** pays each of you once. Either of you can tick it off.
Rewards are paid **once per task, ever**: reopening keeps the gold and re-completing doesn't pay again.

Levels: 1 New Adventurer (0 XP) · 2 Apprentice (100) · 3 Builder (300) · 4 Guardian (700) · 5 Kingdom Master (1500).

Gold is virtual and has no cash value. Balances can never go below zero.

---

## How it's built (and why it's light)

```
Phone (installed web app) ──► Supabase (database + logins)
   React + Tailwind                 • Row Level Security on every table
   pixel art drawn in code          • all gold/XP logic in database functions
   ~140 KB total download           • realtime updates to both phones
```

- **React + Vite + TypeScript + Tailwind**, only 4 runtime libraries.
- **No image files for the art**: every sprite (heroes, house, shop items, icons) is a tiny grid in code drawn as SVG. That's why avatars can be recolored and the whole app is about 140 KB.
- **Installable PWA** with a service worker: opens instantly and shows your last data offline.
- **No background work**: it only talks to the database when open; changes arrive through one realtime connection.

### Security
- Every table has **Row Level Security**. A login sees data only if its **confirmed email** matches Jessica's or Mariano's hero. Anyone else sees an empty "no key to the kingdom" screen.
- Gold, XP, the treasury, approvals and achievements **can't be edited directly** from a phone. They only change through checked database functions, inside one transaction.
- A partner must approve real-life rewards; you can't approve your own. Gold is only taken at approval.
- The app only uses the public "anon/publishable" key. **No secret key is ever in the app.**
- Tested locally: outsiders blocked, balance tampering blocked, no duplicate rewards, approvals, no negative balances (`supabase/tests/`).

---

## 1. Accounts you need (all free)

| Account | Why | Cost |
|---|---|---|
| **GitHub** | Stores the code (you already have it). | Free |
| **Supabase** (supabase.com) | Database and the two logins. | Free plan is plenty. |
| **Vercel** (vercel.com) | Puts the app on the internet. | Free "Hobby" plan, personal use. |

**Possible costs:** none for normal use. Supabase's free plan **pauses a project after 7 days with no activity**; opening the app counts as activity. If it ever pauses, log in to supabase.com and press **Restore** (free). Paid plans are only needed for much bigger apps.

You will **never** need to paste a password or secret key into the code.

## 2. Configure Supabase and publish (≈ 20 minutes)

The easiest path lets Vercel create and connect the database for you:

1. **Vercel → Add New → Project →** pick this GitHub repository.
2. Set **Root Directory** to `home-kingdom` (important: this repository also holds another app). Framework: *Vite* is detected automatically. Press **Deploy**.
3. In the new Vercel project: **Storage → Supabase → Create** (or *Connect* an existing project). This fills in the database settings automatically.
4. Still in Vercel: **Settings → Environment Variables**, add:
   - `HK_JESSICA_EMAIL` = the email Jessica will log in with
   - `HK_MARIANO_EMAIL` = the email Mariano will log in with
5. **Deployments → ⋯ → Redeploy.** The first build creates all tables, security rules and the starting quests by itself.
6. In **Supabase → Authentication → URL Configuration**, set **Site URL** to your Vercel address (e.g. `https://home-kingdom-xyz.vercel.app`). This makes the confirmation and password-reset emails point to the app.

<details>
<summary>Prefer to set Supabase up by hand?</summary>

1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste and run, in order:
   1. `supabase/migrations/001_home_kingdom.sql`
   2. `supabase/seed.sql`
3. Register your two emails (change them first):
   ```sql
   select public.hk_set_hero_email('jessica', 'jessica@example.com');
   select public.hk_set_hero_email('mariano', 'mariano@example.com');
   ```
4. **Project Settings → API**: copy the *Project URL* and the *anon / publishable* key.
5. In Vercel (or Netlify / Cloudflare Pages), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with those values. Build command `npm run build`, output folder `dist`, root `home-kingdom`.
</details>

### Create your two logins
Open the app → **Primera vez aquí / First time here** → enter your email and a password → confirm the email Supabase sends.
(Or in Supabase: **Authentication → Users → Add user**, tick *Auto confirm*.)
Only the two registered emails can enter the kingdom.

**Then close the door:** Supabase → **Authentication → Sign In / Providers →** turn off *Allow new users to sign up*. Nobody else can even create a login after that.

## 3. Running it on a computer (optional, for developers)

```bash
cd home-kingdom
npm install
cp .env.example .env.local   # fill in the two values
npm run dev                  # http://localhost:5173
```

## 4. Install on your phones

- **iPhone (Safari):** open the app address → **Share** → **Add to Home Screen** → Add.
- **Android (Chrome):** open the address → menu **⋮** → **Install app** (or *Add to Home screen*).

It then opens full-screen from its own pixel-house icon. You stay signed in.

## 5. Backups

- In the app: **⚙️ Settings → Backup** → *Download everything (JSON)* or *Tasks as spreadsheet (CSV)*. Save it to your Drive/iCloud once a month.
- Supabase's free plan also keeps its own daily backups for a short time.

## 6. Updating the app later

Change the code on GitHub (or ask Claude to). Vercel rebuilds automatically within a minute. Phones pick up the new version the next time the app is opened (sometimes after a second open). Your data is never touched by updates.

## 7. Troubleshooting

| You see | Do this |
|---|---|
| "The database isn't connected yet" | The Supabase variables are missing in Vercel; add them and redeploy. |
| "This account has no key to the kingdom" | The email isn't registered (step 2.4) or not confirmed yet. Fix, then sign out and in again. |
| "Offline" banner | No internet; you're looking at the last saved data. Changes need internet. |
| App stopped loading after a quiet week | Supabase paused the free project: supabase.com → your project → **Restore**. |

---

### For developers
- `supabase/migrations/001_home_kingdom.sql` — schema, Row Level Security, column grants, reward functions.
- `supabase/seed.sql` — starting quests, shop, campfire questions (idempotent).
- `supabase/tests/` — run against a plain Postgres: `supabase_mock.sql`, then the migration, `seed.sql`, `security_test.sql`.
- `src/pixel/` — the pixel engine (`engine.ts`), heroes, icons, kingdom scene.
- `api/push.ts` — Vercel function that sends push notifications (keys live in the database, created by `scripts/migrate.mjs`).
- `src/lib/store.tsx` — data loading, realtime sync, offline cache. `src/lib/actions.ts` — every write.
- `npm run typecheck` · `npm run build`
