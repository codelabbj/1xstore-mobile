## 1xStore Mobile — Blue Horizon Redesign

### 1. Why we are redesigning
- The current experience still mirrors a first-generation back-office tool (heavy gradients, inconsistent spacing, limited feedback loops).
- Business needs moved toward a premium, “mature banking” feel where agents trust the app with large-volume operations.
- We need a cohesive color system anchored on a light blue palette and a logic layer that feels intentional instead of a collection of screens.

### 2. Experience vision (“Blue Horizon”)
| Pillar | Description | Practical handles |
| --- | --- | --- |
| **Clarity** | Every state is obvious: neutral canvas, calm typography, explicit affordances. | Max 2 accent colors per screen, microcopy for every async state, consistent spacing scale (4 / 8 / 12). |
| **Confidence** | Money movement must feel bank-grade. | Progress trackers, receipt surfaces, biometric hinting, “last synced” badges, empty/error states with recovery actions. |
| **Velocity** | Agents complete daily flows in <3 taps. | Sticky quick actions, contextual shortcuts (e.g., convert coupon → deposit), offline cache for last 20 operations. |

### 3. Visual system
**Primary palette (Light Blue focus)**
| Token | Value | Usage |
| --- | --- | --- |
| `--primary` | #3FA9FF | Call-to-action, charts, highlights |
| `--primary-dark` | #1E7DD8 | Pressed, dark theme CTA |
| `--primary-soft` | #E5F3FF | Background washes, cards |
| `--accent` | #60D5FF | Secondary buttons, info badges |
| `--success` | #35C48D | Deposit success, positive alerts |
| `--warning` | #FFB347 | Pending states |
| `--danger` | #FF6B6B | Errors |

**Typography**
- Keep Geist, but bump title weights down (500–600) for polish.
- Introduce `display`, `title`, `body`, `micro` scale for predictable hierarchy.

**Layout grid / rhythm**
- Mobile-first 12-column fluid grid (max 420px content width).
- Safe-area aware shells, 24px vertical rhythm, 16px horizontal gutters.
- Cards get `--radius-xl` (18px) with light borders, never naked shadows.

**Motion & affordances**
- Easing curve: `cubic-bezier(0.24, 0.8, 0.38, 1)` for screen transitions.
- Buttons use 140ms scale fade; skeleton loaders for anything >350ms.

### 4. Concept & logic changes
1. **Unified Balance Model**
   - Replace scattered `bonus_available`, `transactions` fetches with a `WalletSnapshot` (primary, bonus, locked).
   - Cache snapshot in Zustand store; revalidate via `react-query` every 30s idle, manual pull-to-refresh.
2. **Flow Sequencing**
   - Deposit / withdraw forms become 3 steps (Amount → Method → Review) with progress indicator; logic ensures validation before hitting API.
3. **Operations Timeline**
   - Transactions, coupons, bonuses share a `timeline` component (grouped by day, inline status badges, receipts modal).
4. **Notification Center**
   - Convert `/notifications` into inbox with tabs (System / Finance / Marketing) and ability to mark as done (persists locally until backend ready).
5. **Support Surface**
   - Add `Help & Escalations` sheet accessible from every screen (links to WhatsApp, FAQ, live status).
6. **Empty/Error Strategies**
   - Every API-backed surface must specify shimmer → empty → error blueprint with copy + CTA.

### 5. Screen-by-screen intent
| Screen | Intent | Key changes |
| --- | --- | --- |
| Dashboard | Mission control | Stack of “modules”: Wallet Snapshot, Quick Actions, Smart Suggestions, Timeline. Remove ad carousel unless business-critical → convert to compact banner carousel with light blue glassmorphism. |
| Deposit / Withdraw | Guided flows | Stepper layout, bottom action bar with total + CTA, saved beneficiaries panel. |
| Bonus | Showcase & convert | Highlight conversion rules, progress bars, CTA to apply bonus directly to coupon. |
| Coupons | Workspace | Filter chips (Active, Used, Archived), ability to pin favorite coupon, CTA to share. |
| Notifications | Inbox | Swipe gestures for read/unread, color-coded tags. |
| Profile | Account hub | Avatar, verification state chips, Quick toggles for biometrics, theme, language. |

### 6. Component inventory
- **Navigation shell**: sticky top bar + floating bottom action row (contextual). 
- **WalletSnapshotCard**: combined balances, last sync, “view details”.
- **Stepper**: mobile-friendly, progress labels + states.
- **TimelineItem**: icon slot, description, amount, status chip, “open receipt”.
- **ActionGrid**: 2 or 3 column layout for CTA chips.
- **SupportPill**: persistent help entry.

### 7. Engineering plan (phased)
1. **Foundation (this PR)**
   - Implement light blue theme tokens, typography scale, spacing helpers.
   - Ship design blueprint (this document) to align team.
2. **Navigation & shell**
   - Rebuild `app/layout` header/footer, introduce `AppShell` component inside `app/_components`.
3. **Wallet + timeline refactor**
   - Create `useWallet` hook (Zustand store + `react-query`), update dashboard to new cards.
4. **Flow revamp**
   - Deposit/withdraw rewrites with stepper, validation, optimistic UI.
5. **Secondary surfaces**
   - Notifications inbox, coupon workspace, profile automation.
6. **Finishing**
   - Accessibility pass, offline support, tests, telemetry instrumentation.

### 8. Next actions checklist
- [ ] Update global tokens (`app/globals.css`).
- [ ] Create typography + spacing utilities.
- [ ] Scaffold `AppShell`, `WalletSnapshotCard`, `Timeline` packages.
- [ ] Draft high-fidelity mockups (Figma) referencing this blueprint.
- [ ] Migrate each route following sections above, tracking progress in `/updates/manifest.json`.


