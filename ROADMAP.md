# ZOMBIE TD — Roadmap

Tower Defense zombie post-apocalyptic. Pixel art. HTML5 Canvas.
Stack: Go (backend) + MariaDB (progress) + vanilla JS/Canvas (frontend).
Port: **30513**. Repo: `zombie-td` (GitHub Rennvol).

Aturan main: tiap fase = commit + git tag `fase<N>` + verifikasi end-to-end (curl/DB/browser) sebelum klaim selesai. Rollback-first.

---

## Fase 0 — Skeleton Server + Repo
**Selesai kalau:**
- `go build` jalan, server listen di :30513
- `GET /api/health` → `{"ok":true}`
- static `index.html` keserve (belum ada game, cuma placeholder hitam + teks judul)
- iptables buka 30513, dungeon 30512 ditutup

Deliverable:
- `main.go` — HTTP server, router minimal, `go:embed static`
- `.env` + `.env.example` (DB DSN), `.gitignore`
- `static/index.html` — layar hitam, judul "ZOMBIE TD", teks kecil "server online"

---

## Fase 1 — Login + Progress Tersimpan
**Selesai kalau:**
- `POST /api/register` (username, password) → bikin user, bcrypt hash
- `POST /api/login` → token session 30 hari (header `Authorization`)
- `GET /api/me` → profil + state player (gold, stage terbuka, upgrade, hero)
- Register ganda → 409. Login salah → 401.
- DB: tabel `users` (id, username, pass_hash, created) + tabel `players` (id, user_id, data JSON: gold, stages, towers, upgrades, heroes, last_claim)

Deliverable:
- `auth.go` — register/login/middleware token
- `db.go` — koneksi MariaDB, migrasi awal (CREATE TABLE IF NOT EXISTS)
- `game.go` — load/save player state
- `static/index.html` — layar login/register (desain Hallmark, atmospheric dark)

---

## Fase 2 — Mesin Game: Canvas + Path + Zombie Jalan
**Selesai kalau:**
- Canvas render: background post-apocalyptic pixel art (kanvas procedural, bukan gambar eksternal)
- Path zombie didefinisikan per stage (array of waypoint)
- Zombie (pixel art procedural) jalan ngikutin path, animasi jalan 2-frame
- Kamera/layout responsif (canvas 960x540 skala, centering)
- In-game: gold counter tampil, tombol "start wave" bisa diklik

Deliverable:
- `static/js/engine.js` — game loop (requestAnimationFrame), state machine (menu → playing → win → lose)
- `static/js/pixels.js` — fungsi gambar pixel art procedural (zombie, tanah, aspal, pagar, bangkai)
- `static/js/path.js` — definisi waypoint tiap stage
- `static/js/wave.js` — data wave (jumlah zombie, interval, HP)

---

## Fase 3 — Tower Dasar + Menembak
**Selesai kalau:**
- 3 tower awal bisa ditempatkan di slot (grid) kalau cukup gold:
  - **Rifle** (murah, rate cepat, damage kecil, single target)
  - **Shotgun** (AoE cone pendek, rate lambat)
  - **Sniper** (range panjang, damage gede, rate super lambat)
- Zombie kena tembak → HP turun → mati → +gold per kill
- Tower punya range circle pas ditempatkan (feedback visual)
- Peluru tampil (tracer), audio click ringan via WebAudio

Deliverable:
- `static/js/towers.js` — definisi tower (cost, damage, rate, range, warna/proc pixel)
- `static/js/bullets.js` — proyektil + collision
- Level balance: gold awal per stage, cost tower, reward kill — semua di `config.go` server + mirror JS (server validate)

---

## Fase 4 — Wave + Stage Progression
**Selesai kalau:**
- Wave berlapis: tiap stage punya N wave, tiap wave makin banyak & HP makin gede
- **Win**: semua wave kelar + minimal 1 zombie nyampe finish → stage clear, bonus gold, unlock stage berikutnya (server-side, persisted)
- **Lose**: lives habis (biasanya 20, zombie lolos kurangi lives)
- Hasil stage: gold + bintang (1-3 berdasar lives sisa) → tercatat di DB
- Peta stage: minimal 5 stage dengan path beda & kesulitan naik

Deliverable:
- `static/js/stage.js` — definisi 5 stage (path, wave list, lives, gold awal, reward)
- Server endpoint: `POST /api/stage/complete` (validasi server: cek player benar-benar menang, award gold, unlock next)
- `static/js/states.js` — layar hasil (win/lose) + tombol next stage / retry

---

## Fase 5 — Meta Progression: Gold, Upgrade, Redeem Code
**Selesai kalau:**
- **Gold shop antar stage**: upgrade permanen per tower (damage +X%, rate +X%, range +X%) — biaya naik tiap level
- **Redeem code**: `POST /api/redeem` (kode → +gold / unlock hero / item). Kode sekali pakai. Admin generate via CLI `./ztd code add GOLD 1000000`.
- Gold persisten di DB, tampil di layar menu utama
- Upgrade mulai berlaku di semua stage

Deliverable:
- `redeem.go` — tabel `codes` (code, type, value, used_by, used_at), endpoint redeem
- `upgrade.go` — endpoint `POST /api/upgrade` (tower_id, stat) — validasi gold
- `cmd/gencode/main.go` — CLI generate kode (mirip pola dungeon-party)
- `static/js/menu.js` — layar menu: pilih stage, lihat upgrade, masukkan kode

---

## Fase 6 — Tower Baru + Efek Unik
**Selesai kalau:**
- Tower tambahan, unlock per stage progress:
  - **Flamethrower** (AoE terus-menerus, damage per detik, range pendek) — unlock stage 2
  - **Tesla** (serangan rantai 3 zombie, stun kecil) — unlock stage 3
  - **Mortar** (jangkauan jauh, splash AoE besar, rate lambat) — unlock stage 4
  - **Railgun** (pierce semua zombie satu garis, damage gede) — unlock stage 5
- Efek visual tiap tower beda (api, listrik, ledakan, laser)
- Balance pass: tiap tower punya niche jelas, biaya imbang

Deliverable:
- `static/js/towers2.js` — tower baru + proyektil khusus
- `static/js/fx.js` — particle: api, listrik, ledakan, asap
- Stage unlock gate server-side (stage 4 tower gak bisa dipakai di stage 1)

---

## Fase 7 — Hero / Survivor Unlock
**Selesai kalau:**
- Hero = survivor yang bisa lo tempatkan di slot khusus, nembak otomatis atau kasih buff ke tower sekitar:
  - **Ranger** (nembak cepat, damage kecil) — unlock stage 2
  - **Engineer** (buff +20% damage semua tower di radius) — unlock stage 3
  - **Medic** (repair/boost lives + buff regen tower) — unlock stage 4
  - **Tank** (blockade: zombie diserang, punya HP sendiri) — unlock stage 5
- Tiap hero: slot 1 di stage (pilih sebelum start), level bisa di-upgrade pake gold
- Hero punya pixel art beda + animasi

Deliverable:
- `static/js/heroes.js` — definisi hero + behavior
- Server: `POST /api/hero/select`, `POST /api/hero/upgrade`
- `static/js/states.js` — layar pilih hero sebelum stage

---

## Fase 8 — Polish Hallmark (anti AI-slop)
**Selesai kalau:**
- Design audit: layout, warna, tipografi, spacing konsisten (tokens CSS `--color-*`, `--font-*`, `--space-*`)
- HUD game rapi: gold, lives, wave, score — gak numpuk, readable di HP
- Screen state lengkap: menu, stage select, upgrade, hero select, playing, win, lose, redeem — semua konsisten
- Sound: WebAudio — shoot, kill, wave start, win, lose, UI click. Volume + mute tombol
- Mobile responsif: canvas skala, layout vertikal di layar sempit, gak ada horizontal scroll
- Particle & screen shake pas ledakan (subtle, gak mabuk)
- Toast notifikasi (bukan alert) — pola dari game lama
- `prefers-reduced-motion` dihormati

Deliverable:
- `static/css/style.css` — tokens + komponen + state screens
- `static/js/audio.js` — WebAudio synth sfx
- `static/js/ui.js` — toast, modal, konfirmasi
- Audit checklist internal vs anti-pattern

---

## Fase 9 — Konten Tambahan (opsional, naik bertahap)
- Stage 6-10 (variasi path, lingkungan: kota rusak, sungai tercemar, base militer, malam hari, hujan)
- Boss zombie tiap 5 stage (HP gede, skill khusus — mis. spawn minion, charge cepat)
- Elite zombie random (berlari cepat, armor, regen)
- Leaderboard: top gold / stage terjauh (tabel baru + halaman)
- Achievement / mission harian

---

## Catatan balance (aturan main)
- Semua angka (cost, damage, HP, reward) di `config.go` — gak boleh hardcode di JS. JS baca dari `GET /api/config`.
- Reward stage: `base = 100 * stage` + bonus bintang `50 * stage * stars`. Kill reward: `5 + floor(stage/2)`.
- Biaya tower & upgrade naik eksponensial (`cost * 1.6^level`).
- Lives 20. Zombie nyampe finish: -1 lives.
- Anti-farm: gold kill cap per wave? Tidak — kill reward kecil, stage reward yang utama. Redeem code buat tes cepat (user suka).
