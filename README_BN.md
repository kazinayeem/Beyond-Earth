# Beyond-Earth — লোকাল সেটআপ গাইড (বাংলা)

এই গাইডে নতুন ফিচারগুলো (২০টি ক্রু রোল, ২–৪ সদস্যের স্কোয়াড, স্কোয়াড মিশন রুম, লাইভ আবহাওয়া ও NASA API, ভাসমান স্কোয়াড চ্যাট) চালু করার ধাপ আছে।

## ১. কী কী লাগবে

| জিনিস | কোথায় পাবেন |
|---|---|
| Node.js 20+ (প্রস্তাবিত 22) | https://nodejs.org |
| Supabase প্রজেক্ট (বিনামূল্যে) | https://supabase.com → New project |
| NASA API Key (বিনামূল্যে) | https://api.nasa.gov |

## ২. প্রজেক্ট চালু করা

```bash
npm install
cp .env.local.example .env.local      # Windows: copy .env.local.example .env.local
```

`.env.local` ফাইলে এই মানগুলো বসান:

```
NEXT_PUBLIC_SUPABASE_URL=https://আপনার-প্রজেক্ট-রেফ.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NASA_API_KEY=আপনার-নাসা-কী
```

- Supabase URL ও publishable key: Dashboard → **Project Settings → API**।
- `NASA_API_KEY` শুধু সার্ভারে ব্যবহার হয় (`NEXT_PUBLIC_` লাগানো নেই, তাই ব্রাউজারে যায় না)। কী না দিলে অ্যাপ NASA-র সীমিত `DEMO_KEY` ব্যবহার করবে।
- **নিরাপত্তা:** চ্যাটে/পাবলিক জায়গায় কী শেয়ার করা হলে সেটি নাসা পোর্টালে নতুন করে তৈরি (regenerate) করে নিন, এবং কখনো `.env.local` গিট-এ কমিট করবেন না (`.gitignore`-এ আগে থেকেই আছে)।

## ৩. ডাটাবেস মাইগ্রেশন (একবার)

নতুন ফিচারের সব টেবিল/ফাংশন একটি ফাইলে আছে: `supabase/migrations/20261113120000_squad_game.sql`। এটি আগের `20261108…` ও `20261111…` মাইগ্রেশনের **পরে** চালাতে হবে। একাধিকবার চালালেও সমস্যা নেই।

**পদ্ধতি ক (সহজ):** Supabase Dashboard → **SQL Editor** → ফাইলের পুরো লেখা পেস্ট করে **Run**।

**পদ্ধতি খ (CLI):** `.env.local`-এ `SUPABASE_DB_PASSWORD=...` দিন (Dashboard → Project Settings → Database), তারপর:

```bash
npm run db:migrate
```

### Realtime চালু করা
মাইগ্রেশন নিজেই `squad_games` ও `squad_messages` টেবিল Realtime পাবলিকেশনে যোগ করে। যদি লাইভ আপডেট না আসে: Dashboard → **Database → Replication/Publications → supabase_realtime** এ ওই দুটি টেবিল টিক দিন। (না এলেও গেম ৩ সেকেন্ড পরপর পোলিং করে চলবে।)

### Auth
Dashboard → **Authentication → URL Configuration**: Site URL = `http://localhost:3000` (ডেপ্লয় করলে আপনার Vercel ডোমেইনও Redirect URLs-এ যোগ করুন)।

## ৪. চালানো

```bash
npm run dev
```

http://localhost:3000 খুলুন। স্কোয়াড টেস্ট করতে কমপক্ষে ২টি অ্যাকাউন্ট লাগবে — একটি সাধারণ ব্রাউজারে, আরেকটি ইনকগনিটো/অন্য ব্রাউজারে সাইন-আপ করুন।

## ৫. কীভাবে খেলবেন (স্কোয়াড)

1. `/squad` → স্কোয়াড বানান, অন্য প্লেয়ারকে ইনভাইট করুন (সর্বোচ্চ ৪ জন, সর্বনিম্ন ২ জন)। ইনভাইটের রোল-লিস্ট ও স্কোয়াড পেজের রোল-লিস্ট এখন একই।
2. লিডার **Crew planner** থেকে রোল ভাগ করবেন (এক সদস্যকে একাধিক রোল দেওয়া যায়; **Auto-assign best combination** বাটন সেরা সমন্বয় বাছাই করে)। প্রতিটি রোলের পাশে **(i)** বাটনে বিস্তারিত বর্ণনা ও **Close** বাটন।
3. লিডার "Squad mission rooms" থেকে মিশন খুললে সবাই `/squad/<squadid>/<missionid>` এ ঢুকবে।
4. প্রতিটি সিদ্ধান্ত নির্দিষ্ট রোলের:
   - **Mission Director** → বাজেট বাড়ানো/কমানো; **Mission Commander** → প্ল্যান অনুমোদন, লঞ্চ অনুমোদন, অ্যাবর্ট
   - **Mission Planner** → ট্রাজেক্টরি; **Aerospace Engineer** → রকেট বাছাই ও বিল্ড চূড়ান্ত
   - মডিউল: Mechanical (স্ট্রাকচার), Electrical (পাওয়ার), Propulsion, Thermal, Communication, Navigation, Science Officer (ক্যামেরা), Research Scientist (ইনস্ট্রুমেন্ট), Planetary Scientist (NASA ইনস্ট্রুমেন্ট)
   - **Flight Director** → আবহাওয়া দেখে GO/NO-GO, সিমুলেশন চালায়; **Risk Manager** → খারাপ আবহাওয়ায় waiver; **Flight Controller** → LAUNCH বাটন
   - ফ্লাইটে ইভেন্ট/অপ্স: Risk Manager, Navigation, Communication, Electrical, Planetary Scientist, Mechanical, Data Scientist, Robotics, Software, Project Manager ইত্যাদি
5. এক রোলের কাজ অন্য রোল করতে পারে না — সার্ভার (ডাটাবেস) যাচাই করে। কোনো রোল কারও কাছে না থাকলে সেটি লিডারের কাছে থাকে।
6. ডান-নিচের **স্কোয়াড আইকন** চ্যাট খোলে; **–** বাটনে মিনিমাইজ। বার্তা Supabase-এ সেভ থাকে।

একক (solo) খেলা আগের মতোই; শুধু লঞ্চের সময় আবহাওয়া প্যানেল ও ঝুঁকি যোগ হয়েছে।

## ৬. আবহাওয়া ও NASA ডেটা কীভাবে কাজ করে

- লঞ্চ স্ক্রিনে **Weather** বাটনে ক্লিক করলে বাতাস, দমকা হাওয়া, বৃষ্টি, মেঘ, বজ্রপাত, তাপমাত্রা — NASA লঞ্চ-কমিট মানদণ্ডের মতো সীমার সাথে মিলিয়ে **GO / MARGINAL / NO-GO** দেখায় এবং "এখন লঞ্চ করলে ক্ষতির সম্ভাবনা %"।
- রিয়েল-টাইম উৎস: Open-Meteo (কেপ ক্যানাভেরাল/ভ্যান্ডেনবার্গ) + NASA POWER (তুলনার জন্য; NASA POWER কয়েক দিন পিছিয়ে থাকে, তাই লাইভ মানের মূল উৎস Open-Meteo)। সূর্যের আবহাওয়া: NASA DONKI (ফ্লেয়ার/CME/জিও-ম্যাগনেটিক ঝড়) → ফ্লাইটের ঝুঁকি বাড়ায়। গ্রহাণু মিশনে NASA NeoWs।
- প্র্যাকটিসের জন্য ড্রপডাউনে Clear / Windy / Rain / Thunderstorm সিনারিও আছে (Squad-এ শুধু Flight Director বদলাতে পারে)।
- NO-GO আবহাওয়ায় লঞ্চ করলে (স্কোয়াডে Risk Manager waiver দিলে) ক্ষতির সম্ভাবনা বেশি; রকেট ফেটে গেলে বিস্ফোরণ অ্যানিমেশন, ধ্বংসের কারণসহ ডিব্রিফ, মিশন ব্যর্থ।
- বৃষ্টি, মেঘ, কুয়াশা, বাতাস ও বজ্রের অ্যানিমেশন লঞ্চ প্যাডে দেখা যায়।

## ৭. ডেপ্লয় (Vercel)

Vercel → Project → Settings → Environment Variables এ তিনটি ভ্যারিয়েবল (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NASA_API_KEY`) দিয়ে Redeploy করুন।

## ৮. টেস্ট

```bash
npm run lint
npm run build
npm test          # ডাটাবেস স্যুট (PGlite) সহ
```

> **দ্রষ্টব্য:** এই কোড স্যান্ডবক্সে npm ও নেটওয়ার্ক ছাড়া তৈরি হয়েছে, তাই `npm run build`/`lint` ও NASA/Open-Meteo কল লোকালি একবার চালিয়ে দেখে নেওয়া দরকার। মাইগ্রেশন SQL আসল PostgreSQL 16-এ পরীক্ষা করা হয়েছে (৪র্থ সদস্য, ৫মজন বাতিল, রোল-গেটিং, আবহাওয়া NO-GO waiver, লঞ্চ ব্যর্থতা, চ্যাট, রিওয়ার্ড ক্লেইম)।

## ৯. সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| `Multiplayer isn't set up` / function not found | নতুন মাইগ্রেশন চালানো হয়নি (ধাপ ৩) |
| চ্যাট বাবল দেখা যায় না | লগইন করা ও স্কোয়াডে থাকা লাগবে |
| আবহাওয়ায় "offline" | সার্ভার থেকে Open-Meteo/NASA অ্যাক্সেস নেই; সিনারিও ড্রপডাউন থেকে Training বাছুন |
| Flight Director অফলাইন হলে ফ্লাইট থেমে যায় | সিমুলেশন Flight Director-এর ব্রাউজারে চলে; তাকে ফিরতে বলুন বা লিডার Crew planner থেকে ওই রোল অন্যকে দিন |
