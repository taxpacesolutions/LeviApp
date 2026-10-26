# 💰 Levi Reward Bucks

> This repository also contains **Home Kingdom**, a separate app in [`home-kingdom/`](home-kingdom/README.md).

A private family reward app that teaches earning, saving, spending and goals.
It feels like a modern kids' banking app: big numbers, goals with progress bars, a Reward Store, badges and streaks.

- **Levi Mode** (default): balance, savings, goals, Reward Store, badges, streaks, history. Levi can only *ask*. He can't add or remove Bucks.
- **Parent Mode** (PIN-protected): add, deduct and move Bucks, approve requests, rewards, goals, badges, Savings Bonus, corrections and settings.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage)**.

---

## Easiest setup (no code, about 30 minutes, free)

1. **GitHub**: the code lives in your private repository.
2. **Vercel**: sign up with "Continue with GitHub", then *Add New → Project*, pick the repository and press **Deploy**.
   (The first build fails because it has no database yet; that's expected.)
3. **Supabase from Vercel**: in the Vercel project open **Storage** (or *Integrations*) → **Supabase** → *Create* / *Connect*.
   This creates the free database and fills in all the keys automatically.
4. **Redeploy**: in Vercel → *Deployments* → ⋯ → **Redeploy**. The first build creates the tables and Levi's sample data by itself.
5. **Open the app**: the first screen asks you to **create the family login** (email + password). That's the only account; Levi doesn't need one.
6. **On Levi's tablet**: open the address, sign in once, then *Share → Add to Home Screen*. It gets its own icon and opens full screen.
7. Enter Parent Mode with PIN **1234** and change it.

A daily automatic check (`/api/keepalive`, Vercel Cron) stops the free database from pausing when the app is only used once a week.

## Quick start (developers)

```bash
npm install
cp .env.example .env.local      # then fill it in (see "Connect Supabase")
npm run dev                     # http://localhost:3000
```

1. Sign in with the Supabase user you created.
2. You land in **Levi Mode**. Tap **Parent** (top right) and enter PIN **1234**.
3. You'll get a yellow banner asking you to change the PIN. Do that first (Settings → Parent PIN).

---

## Connect Supabase

1. **Create a project** at <https://supabase.com> (free tier is fine).
2. **Run the database files** in the SQL Editor (Dashboard → SQL Editor → New query), in this order:
   1. `supabase/migrations/20261006000001_schema.sql`: tables, views, accounting functions, security
   2. `supabase/migrations/20261006000002_storage.sql`: storage bucket for reward/goal pictures
   3. `supabase/seed.sql`: Levi, sample rewards, LEGO goal, badges, history, PIN `1234`

   *Using the Supabase CLI instead?* `supabase link --project-ref <ref>` then `supabase db push` and run `seed.sql` in the SQL Editor (or `supabase db reset` locally, which runs the seed automatically).
3. **Create your login**: just open the app. While no parent account exists, the sign-in page offers **Create the family login**.
   (Or: Dashboard → Authentication → Users → **Add user**.) The first account is linked to the seeded parent profile ("Mom").
4. **Turn off public sign-ups**: Authentication → Sign In / Providers → disable *Allow new users to sign up*.
   The app has no sign-up page, but this closes the door completely.
5. **Copy keys** (Project Settings → API) into `.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / secret key (**server only**) |
| `PARENT_SESSION_SECRET` | optional: random 32+ character string (`openssl rand -base64 48`); derived from the service key if unset |
| `ALLOWED_EMAILS` | optional, comma-separated allow-list (recommended) |

6. `npm run dev`. If anything is missing, the app shows a **/setup** page listing what's wrong.

### Deploying (Vercel or any Node host)
Add the same environment variables in your host's settings and deploy. `npm run build && npm start` also works on any Node 20.9+ server.

---

## How it works

### Architecture

```
Browser ──► Next.js (Server Components + Server Actions) ──► Supabase Postgres
              │  checks Supabase Auth session (every request)            │ RLS on, no public policies
              │  checks signed Parent-PIN cookie (every parent action)   │ all money logic in SQL functions
              └─ service-role key never leaves the server                └ ledger is append-only
```

- The **browser never talks to the database.** All reads and writes run on the server. RLS is enabled on every table with no policies, and `anon`/`authenticated` have no privileges, so the public anon key can't read anything.
- Every ID sent from the browser is checked to belong to the signed-in family before it's used.

### Security
| Layer | What it does |
|---|---|
| Supabase Auth | Family sign-in (email + password). `src/proxy.ts` redirects signed-out visitors to `/login`. Every page and action re-checks. |
| Parent PIN | Stored as a **bcrypt hash** (`pgcrypto`), checked inside Postgres. 5 wrong tries → locked for 5 minutes. |
| Parent session | After a correct PIN: an httpOnly, HMAC-signed cookie bound to the user and family. It expires after inactivity (default 30 min, configurable). The **Lock** button clears it. |
| Server Actions | Every Parent action calls `parentActionContext()` on the server. Kid Mode can only *create requests*. |
| Kid bundle | Admin components are passed in only by parent pages, so Kid Mode doesn't ship parent controls. |

### Accounting rules (in `schema.sql`)
- **No editable balance.** Balances are `SUM()`s over `transactions` (`account_balances` view). Each row has an `available_delta` and a `savings_delta`, so one row can describe a transfer between buckets.
- **One door for money:** `post_transaction()` locks the child's account row, refuses anything that would make **Available** or **Savings** negative, and refuses taking Savings that are set aside for goals.
- **Append-only ledger:** a trigger blocks `UPDATE`/`DELETE` on `transactions`. Mistakes are fixed with:
  - **Reverse**: adds a `reversal` row that cancels the original. The original is shown crossed out.
  - **Edit**: reverse plus a corrected entry, with the reason recorded.
  - **Adjust**: "set balances to X / Y" posts an `adjustment` row.
- Every row records date, type, amount, category, description, note and **who added it**. History shows a running balance after each entry.
- Transaction types: `earn`, `spend`, `transfer_to_savings`, `transfer_from_savings`, `bonus`, `adjustment`, `reversal`.

### Savings and goals
- **Savings** is a separate bucket. It can't be spent in the Reward Store.
- **Goals are pockets inside Savings.** Adding to a goal either moves Bucks from Available → Savings, or sets aside Bucks already in Savings. Savings shows "X for goals · Y free".
- Reaching 100% marks the goal **Completed** and celebrates 🎉. **Mark as bought** spends the goal's Bucks from Savings.
- Goal statuses: Active, Paused, Completed.
- Levi can ask to move Bucks to savings (optionally for a goal). A parent approves it.

### Savings Bonus (optional, off by default)
Settings → Savings Bonus: percent (like interest) or a flat amount, a minimum balance, weekly or monthly.
Once per period it pays into Savings, based on the **lowest** savings balance during the last full period (you have to *keep* it saved). No cron job is needed. It's checked automatically whenever the app opens and can never pay twice for the same period (`savings_bonus_awards` is unique per period). There's also a "Check now" button.

### Game layer: levels, pet, missions, sounds
- **Levels and XP.** XP = Bucks earned + Bucks put into savings + mission XP. It's computed from the ledger (`child_xp()`), so reversals lower it automatically. 10 named levels (Penny Rookie → Money Master), then "Money Legend" every 300 XP. Level-ups get a celebration.
- **Savings pet.** A dino that grows with the Bucks Levi has ever saved: 🥚 Egg → 🦎 Hatchling (20) → 🦕 Little Dino (60) → 🦖 Big Dino (150) → 🐉 Mighty Dragon (300). It never shrinks and is never sad. When nothing was saved for a week it is just "waiting for a savings snack". Levi can name it and pat it.
- **Weekly missions.** These are challenges such as "Read on 3 days" or "Save 10 Bucks". They reset every Monday in the family's timezone and are checked after every transaction. When one is done it pays its bonus once (a `bonus` row, reversible like any other) plus XP. Parents manage them in **Settings → Weekly missions**.
- **Sounds and animations.** Sounds are synthesized in the browser, with no audio files, and Levi has an on/off switch. Celebrations have coin rain or confetti, and balances count up. Motion is reduced when the device asks for it.
- Database: `supabase/migrations/20261026000001_gamification.sql`. `npm run build` applies new migration files automatically (tracked in `public._migrations`).

### Requests and approvals
- **Redeem Reward** creates a request ("Ask Mom"). Bucks only come out when a parent **approves**.
- Requests can't be made without enough Available Bucks, counting other pending requests.

### Achievements, streaks and celebrations
- Badge rules: total earned, savings balance, number of times in a category, streak length, rewards redeemed, goals completed, or **given by a parent**. Parents can create, edit, give and remove badges.
- Streaks are counted per category (configurable) in the family's timezone. Missing a day shows "Start a new streak today!", never anything negative.
- Goal reached, new badge, streak milestones (3, 5, 7, 10, 14 … days) and Savings Bonus queue up a small celebration that Levi sees next time he opens the app.

### More kids later
Nothing is tied to Levi. Every balance, goal, badge, streak and request is keyed to a child profile.
Add a child in **Settings → Kids**. A child switcher then appears in both modes. Rewards can be shared or per-child (`rewards.child_id`).
Add another parent in **Settings → Parents** (and create their Supabase user).

---

## Project structure

```
supabase/
  migrations/…_schema.sql     tables, views, accounting + PIN functions, RLS lockdown
  migrations/…_storage.sql    public bucket for pictures
  seed.sql                    sample family (Levi, rewards, LEGO goal, badges, history)
src/
  proxy.ts                    auth session refresh + redirect to /login (Next 16 "proxy" = middleware)
  actions/                    Server Actions: auth.ts, kid.ts (requests only), parent.ts (PIN-guarded)
  lib/
    context.ts                who's signed in, which family/child, parent-session checks
    data.ts                   read queries
    action-utils.ts           action wrappers, validation, ownership checks, uploads
    parent-session.ts         signed httpOnly Parent Mode cookie
    supabase/                 server-only clients (service role + auth cookies)
    categories.ts format.ts types.ts env.ts
  components/
    ui/                       Sheet, ActionForm, Toast, fields, ProgressBar, styles
    kid/                      RewardTile, SaveRequestButton, Celebrations, …
    parent/                   QuickActions, forms, TxnRowActions, settings-forms, …
    BalanceHero GoalCard TxnList BadgeGrid Streaks WeeklySummary BottomNav …
  app/
    login/ setup/
    kid/        Home · goals · store · badges · history
    parent/unlock/              PIN pad
    parent/(app)/               Dashboard · transactions · rewards · goals · approvals · settings · achievements
```

## Sample data (seed.sql)
- **Levi**: Available **20**, Savings **40** (= **10 free + 30 in the LEGO Set goal**).
  Goal Bucks live inside Savings. With the 30 already saved toward LEGO, Savings has to be at least 30, so the seed keeps 10 *free* savings plus the 30 in LEGO.
- History: Starting balance, +5 Reading, +5 Finished schoolwork, +10 Helped family, −5 Small reward, 30 saved for LEGO.
- Goal: LEGO Set, 30 of 100.
- Rewards: Choose Dessert 10 · Movie Night 15 · Extra Game Time 20 · Choose Dinner 25 · Small Toy 50 · Special Outing 75 · $5 Spending Money 100.
- 11 badges. "First 10 Bucks" and "Saved 25 Bucks" start unlocked, so you'll see a celebration on first open.
- Parent PIN **1234** (change it!).

## Scripts
| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | type-check |

## Resetting everything
Balances can be reset any time from **Transactions → Adjust**, which keeps the history.
To wipe *all* data during testing, run this in the SQL Editor, then re-run `seed.sql`:
```sql
alter table transactions disable trigger transactions_are_append_only;
delete from families;
alter table transactions enable trigger transactions_are_append_only;
```
