# ⭐ Family Rewards Dashboard

A self-hosted, gamified chore & rewards system designed for a wall-mounted touchscreen tablet. Built with React, Node/Express, SQLite, and Docker.

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- A tablet or monitor running in a browser (landscape recommended)

### 1. Clone and configure

```bash
git clone <your-repo-url> family-rewards
cd family-rewards

# Copy and edit the backend env file
cp backend/.env.example backend/.env
nano backend/.env   # Change the QR secrets!
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

- **Dashboard:** http://localhost:3000
- **API:**       http://localhost:3001

### 3. Seed example data (optional)

```bash
docker exec family-rewards-api node src/seed.js
```

This adds 3 example children (Ella, Oscar, Mia), task templates, and a populated rewards shop.

---

## 🏗️ Project Structure

```
family-rewards/
├── docker-compose.yml
├── database/                   # SQLite data (auto-created, persisted)
│
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── server.js           # Express app entry
│       ├── db.js               # SQLite connection
│       ├── migrate.js          # Schema migrations
│       ├── seed.js             # Demo data
│       ├── routes/
│       │   ├── auth.js         # QR unlock, session management
│       │   ├── children.js     # CRUD + point adjustments
│       │   ├── tasks.js        # Daily tasks + completion
│       │   ├── templates.js    # Weekly recurring task templates
│       │   ├── rewards.js      # Shop items
│       │   ├── purchases.js    # Buying, approval, redemption
│       │   └── stats.js        # Progress & history
│       └── services/
│           ├── scheduler.js    # Daily task generation, weekly reset
│           └── achievements.js # Badge unlocking logic
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.js
        ├── api.js              # Axios API client
        ├── index.js
        ├── context/
        │   └── AppContext.js   # Global state
        └── pages/
            ├── Dashboard.js    # Main wall display
            ├── Shop.js         # Rewards shop per child
            └── ParentPanel.js  # Admin interface
        └── components/
            ├── ChildCard.js
            ├── TaskItem.js
            ├── StreakBadge.js
            ├── ParentLockButton.js
            ├── QRUnlockModal.js
            ├── CelebrationOverlay.js
            └── parent/
                ├── ParentChildren.js
                ├── ParentTemplates.js
                ├── ParentRewards.js
                ├── ParentApprovals.js
                ├── ParentStats.js
                └── ParentQRCodes.js
```

---

## 🔒 Parent Mode (QR Unlock)

1. Go to **Parent Mode → QR Codes** tab after first unlock
2. Print or save both QR codes
3. From the dashboard, tap 🔒 Parent Mode
4. Scan your Admin QR → unlocked for 5 minutes

**Two roles:**
- **Admin** — full access (children, tasks, rewards, stats, settings)
- **Approver** — can only approve/reject reward requests

Change secrets in `backend/.env`:
```
ADMIN_QR_SECRET=your-unique-secret-here
APPROVAL_QR_SECRET=another-unique-secret
PARENT_SESSION_DURATION=300
```

---

## 📋 Features

### Kid Dashboard
- Per-child task cards with progress bar
- Tap to complete tasks → instant points award
- Streak tracking with fire emoji badges 🔥
- Celebration animation when all tasks done
- One-tap access to Rewards Shop

### Task System
- Weekly templates auto-generate daily tasks (cron job at midnight)
- Parent can add one-off override tasks
- Edit or delete individual tasks per day
- Bonus multipliers during special events

### Rewards Shop
- Unlimited or limited-stock items
- Daily/weekly purchase limits
- Parent approval required for expensive rewards
- Mystery rewards (hidden until purchased)
- Points deducted immediately; refunded if rejected

### Achievements
10 built-in badges including:
- First Step ⭐, Task Master 💪, Week Warrior ⚡
- 3/7/30-day streaks, 100/500 point milestones
- First reward purchase

### Parent Panel
- Manage children (name, avatar, colour)
- Create/edit/delete weekly task templates
- Manage rewards shop inventory
- Approve/reject/redeem reward purchases
- Progress charts with 30-day history
- Point adjustment (bonus/penalty)

---

## 🗃️ Database Schema

| Table | Purpose |
|---|---|
| `children` | Name, avatar, points balance, totals |
| `streaks` | Current/longest streak per child |
| `task_templates` | Recurring task definitions with days-of-week |
| `tasks` | Daily tasks (generated + overrides) |
| `rewards` | Shop items with stock/limits |
| `purchases` | Redemption history with approval flow |
| `achievements` | Badge definitions |
| `child_achievements` | Earned badges per child |
| `point_events` | Full audit log of all point changes |
| `bonus_events` | Time-limited point multiplier events |

---

## 📅 Roadmap

### v1 (Current)
- [x] Core dashboard with child cards and tasks
- [x] Point system with streak tracking
- [x] QR-protected parent mode (admin + approval roles)
- [x] Weekly task templates with auto-generation
- [x] Rewards shop with stock/limits/approval
- [x] Achievements system
- [x] Docker Compose deployment

### v2
- [ ] Spin wheel bonus after all tasks complete
- [ ] Sound effects (task complete chimes, celebration music)
- [ ] Sibling leaderboard view
- [ ] Bonus point events (scheduled by parent)
- [ ] QR code per reward for physical redemption
- [ ] Push notifications (parent approval alerts)
- [ ] Multi-family / multi-device sync via WebSockets
- [ ] Dark/light theme toggle
- [ ] Custom background themes per child

### v3
- [ ] Mobile companion app for parents
- [ ] AI task suggestions based on age
- [ ] Monthly "Family Review" report PDF
- [ ] Custom achievement creation
- [ ] Point savings goals (target a specific reward)
- [ ] Calendar view of task history

---

## 🛠️ Development

```bash
# Backend only
cd backend
cp .env.example .env
npm install
node src/migrate.js
node src/seed.js
npm run dev

# Frontend only (in another terminal)
cd frontend
npm install
REACT_APP_API_URL=http://localhost:3001 npm start
```

---

## 📱 Tablet Setup Tips

- **Browser:** Use Chrome in fullscreen (F11 or kiosk mode)
- **Kiosk mode:** `chromium-browser --kiosk http://localhost:3000`
- **Auto-start:** Add to cron or systemd service
- **Orientation:** Landscape works best for 3+ children
- **Touch:** Works with any capacitive touchscreen

---

## 🐳 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `DATABASE_PATH` | `./database/family.db` | SQLite file location |
| `ADMIN_QR_SECRET` | *(change me!)* | Secret embedded in admin QR |
| `APPROVAL_QR_SECRET` | *(change me!)* | Secret embedded in approval QR |
| `PARENT_SESSION_DURATION` | `300` | Unlock duration in seconds |
| `WEEKLY_RESET_DAY` | `0` | Day for weekly reset (0=Sun) |

---

## 📄 Licence

MIT — free to use, modify, and self-host for your family.
