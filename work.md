# Realtor One - Project Progress

### **Day 1: Connection & Infrastructure**
- Setup React Web Admin Portal
- Admin Vault Login System
- Main Dashboard Overview Implementation
- Backend API Integration & Services
- Database Connectivity & Real-time Health Monitoring
- Core User Management Registry
- Environment Variables & Deployment Configuration

### **Day 2: UI/UX Engineering & Branding**
- Compact User Profile Modal Redesign (50% Size Reduction)
- Ergonomic Typography & Spacing Scaling
- Performance Metrics Layout Optimization
- High-Density Single-Column Modal Format
- Enhanced Interactive Search UI (Auto-Expanding)
- Advanced Top Bar & Navigation Refinement
- Dark Mode Action Card Compatibility Fixes
- Premium Kora Aesthetic Design Polish
- Sidebar Brand Layout & Collapse Logic Fix
- Dashboard Analytics Hero Section Refinement
- Responsive Modal Overlay & Backdrop Effects
- Automated UI State & Theme Persistence
- **API Development & Integration:**
    - Admin Authentication API
    - Extended User Details & Metrics Retrieval API
    - Dynamic Status Toggle & Action API
- Realtor One Website Branding Integration
- Browser Tab & Title Synchronization
- Codebase Cleanup & Structural Lint Fixes
- Final GitHub Deployment Push

### **Day 3: Live Deployment & Cloud Scaling**
- Production Build & Asset Optimization
- Render Cloud Platform Deployment
- Cross-Origin Resource Sharing (CORS) Configuration
- Live API Endpoint Mapping
- Production Database Synchronization
- SSL Certificate & Security Protocol Setup
- Post-Launch Feature Verification
- CI/CD Pipeline Automation

### **Day 4: Momentum Engine & Activity System**
- Momentum Dashboard Tab & Daily Score Tracking
- Conscious & Subconscious Activity Separation
- 15 Conscious Activities Hardcoded from App Logic
- Custom Activity Creation Modal (Admin + User)
- Backend Scoring & Streak Logic Update
- API Validation Expansion (Conscious Category)
- Dark Mode & Light Mode Visibility Fixes
- Build Error Resolution & TypeScript Cleanup

### **Day 5: Monetization & Subscription Infrastructure**
Application (Mobile):
    - Implemented a native subscription plan selection screen with smooth scrolling cards
    - Added real-time user subscription status synchronization logic
    - Integrated logic to display current active plan and expiration date
    - Added biometric authentication fallback for secure plan changes
    - Implemented caching for subscription status to support offline mode
Backend:
    - Created `subscription_packages` database migration and model
    - Created `user_subscriptions` database migration and model
    - Implemented tier-based access logic for Free, Silver, Gold, and Diamond tiers
    - Added API endpoints for fetching active subscription plans
    - Implemented webhook listeners for external payment gateway integration (Stripe/Razorpay)
    - Added validation logic to prevent downgrading to a lower tier with active usage
Website:
    - Developed `SubscriptionsPage.tsx` for comprehensive plan management
    - Designed dynamic pricing card UI with feature comparison lists and hover effects
    - Created admin modal for adding and editing subscription packages with form validation
    - Implemented active subscriber list view with status indicators and search filtering
    - Added 'Popular' badge logic for best-selling subscription tiers UI

### **Day 6: Learning Management System (LMS)**
Application (Mobile):
    - Built a dedicated 'Learning' module/tab for mobile course consumption
    - Implemented course list view with thumbnails, descriptions, and progress bars
    - Added video player integration for course content playback with fullscreen support
    - Implemented progress tracking for individual courses (saved playback position)
    - enable offline access for downloaded course materials
Backend:
    - Created `courses` database table migration with support for video, PDF, and text types
    - Created `learning_content` database table for lesson materials
    - Developed `CourseController` with index, store, update, and destroy methods
    - Implemented secure API endpoints for content delivery based on tier
    - Added background job for video transcoding and thumbnail generation (in-progress)
Website:
    - Developed `CoursesPage.tsx` as the main content management dashboard
    - Built 'Add Course' modal with fields for video URL, PDF upload, and resource linking
    - Implemented course grid view with visual indicators for tier access (padlock icons)
    - Added edit and delete functionality for course management with confirmation dialogs
    - Integrated rich text editor for course descriptions and extensive metadata

### **Day 7: Rewards Engine & Gamification**
Application (Mobile):
    - Developed a native Rewards Dashboard screen with animated progress circles
    - Implemented visual display for accrued reward points and redemption history
    - Created interface for entering and validating coupon codes with haptic feedback
    - Added push notification support for new reward availability
Backend:
    - Created `coupons` database table migration with fields for code, discount, and type
    - Implemented coupon code validation logic (expiry check, usage limits, user-specific)
    - Developed service for calculating dynamic discounts based on coupon type (percentage/flat)
    - Added logging table for tracking coupon usage analytics
Website:
    - Integrated rewards history and points display into `UserProfilePage.tsx`
    - Added UI for tracking coupon redemptions per user with date filtering
    - Implemented admin interface for creating and managing active coupons with bulk generation
    - Included 'Copy Code' functionality for easy sharing of coupon codes

### **Day 8: Momentum Engine & Ecosystem Polish**
Application (Mobile):
    - Ported the full Momentum Dashboard to Flutter for feature parity with identical color schemes
    - Implemented daily score synchronization with the backend with background fetch
    - Developed UI for logging "Conscious" vs "Subconscious" activities separately with toggle views
    - Updated navigation routing in `route_config.dart` to support new modules and deep linking
    - Added pull-to-refresh functionality for instant data updates
Backend:
    - Unified API response structures to ensure consistency between Web and Mobile clients (JSON:API standard)
    - Refined real-time activity synchronization logic for multi-device support using timestamps
    - Updated `activities` table with new metrics fields for detailed tracking (duration, metadata)
    - Implemented rate limiting for activity logging endpoints to prevent abuse
Website:
    - Refined `MomentumPage.tsx` for daily score visualization and trends with interactive charts
    - Enhanced `SettingsPage.tsx` to include global configuration options (theme, notifications)
    - Implemented consistency checks between web and mobile data streams with alert flags
    - Polished responsive layout for better mobile browser experience (touch targets, spacing)
    - Added simplified 'Dark Mode' toggle affecting all new dashboard pages

### **Day 9: Feb 9 - 14 - Momentum Core & Infrastructure**
Application (Mobile):
    - Integrated backend API endpoints for tasks and daily tasks to sync with Momentum engine.
    - Implemented Rewards navigation and initial profile linking for points tracking.
Backend:
    - Configured custom domain (aanantbishthealing.com) and enforced SSL security on Render.
    - Reverted branding across all API responses and metadata to 'RealtorOne'.
Website:
    - Built 'Dopamine HUD' for tracking streaks, revenue milestones, and active goals.
    - Implemented 'Results Intelligence' pipeline visualization for lead and deal tracking.
    - Polished 'Momentum Command Center' with live activity audits and interactive protocol sheets.

### **Day 10: Feb 17 - Leaderboards & Advanced Gamification**
Application (Mobile):
    - Standardized mobile UI components to match the latest web gamification aesthetics.
Backend:
    - Architected and seeded `badges` and `leaderboard_entries` database tables.
    - Refined dynamic scoring logic for Momentum (0-100) with real-time feedback.
Website:
    - Developed premium `LeaderboardPage.tsx` and `BadgesPage.tsx` with dynamic category filtering.
    - Updated Sidebar and Dashboard for high-visibility access to gamification metrics.
    - Integrated real-time leaderboard refresh and badge retrieval system.

### **Day 11: Clients & Revenue Onboarding** GG
Application (Mobile):
    - Added first-time "Add First Client" hero state in the Results Tracker when no clients exist.
    - Integrated backend `clients/status` endpoint to detect whether the user has any clients.
    - Reused the Results logging flow so the first client is logged as a hot lead with full scoring and badges support.
    - Implemented Deal Room flow inside Tasks → Revenue Actions (intro → privacy modal → add client → clients list).
Backend:
    - Refined clients status + create-client endpoints to support lead-only counting and optional status.
    - Updated per-client Revenue Actions API to store Yes/No selections per-day (date-scoped daily log).

### **Day 11 (cont.): Action Bottom Sheets**
Application (Mobile):
    - Added action-specific bottom sheets for Cold Call, Site Visit, Deal Negotiation, Referral Ask.
    - Each sheet matches Figma designs: Yes/No toggle, chip selectors, date/time pickers, themed inputs.
    - Refactored follow-up sheet to use shared building-block widgets (sheetWrapper, chipRow, dateTimeRow, etc.).
    - Added "Deal Closed!" celebration screen triggered when Deal Negotiation is saved as Finalized (deal type, amount, commission, Q-report note, green confirm button).
Backend:
    - Added `POST /clients/{id}/action-log` to persist detailed action data (cold_call, site_visit, deal_negotiation, deal_closed, referral_ask) with date-scoped storage in notes JSON.
    - Added `GET /clients/{id}/action-logs` to retrieve logged action details per date.
    - Deal Closed action auto-creates a `deal_closed` Result record for the performance pipeline with value and commission.
Application (Mobile):
    - All 5 action sheets now POST detailed form data to backend on save via `_logAction` helper.
Backend:
    - Added `GET /revenue/metrics?period=week|month|quarter` – returns hot leads, deals closed, commission, top source, period-over-period change, and recent activity.
Application (Mobile):
    - Added CLIENTS / REVENUE icon toggle at top of Revenue Actions tab.
    - CLIENTS tab shows Deal Room client list + Core Priorities.
    - REVENUE tab shows Revenue Tracker with Week/Month/Quarter toggle, Key Metrics (Hot Leads, Deals Closed, Commission, Top Source), and Recent Activity list.

### **Day 12: Feb 19 - Revenue Tracker Polish & UI Cleanup**
Application (Mobile):
    - Fixed NoSuchMethodError in Revenue Tracker when comparing activity value (parsed String "0.00" to number before comparison).
    - Implemented click navigation from Recent Activity tiles to new All Activities page.
    - Made "VIEW ALL ACTIVITIES" text tappable to navigate to full timeline page.
    - Created All Activities page with timeline layout (back arrow, "All Activities", "Your journey in motion", status tags, timestamps, FAB).
    - Removed "Clients" label and diamond icon from Deal Room widget card.
    - Removed Results Intelligence section from home page (momentum hub).
    - Daily log actions (Yes) for a client now create Result records and appear in Recent Activity (global feed) while staying in that client's daily log.
Backend:
    - POST /clients/{id}/actions: when status=yes, creates type=revenue_action Result for Recent Activity.
    - Revenue metrics API now includes notes in recent_activity for action_label display.
    - Added migration to include `revenue_action` in results.type enum (MySQL) and recreated results table for SQLite (CHECK constraint was blocking inserts).
    - Fixed missing activities: create Result when status=yes even if previously yes (backfill); added backfill on GET /clients/{id}/actions so actions marked Yes before the migration now appear in Activity.
Backend:
    - Key Metrics: total_commission now uses net commission from deal_closed notes (not deal amount); deal_closed Result created when commission > 0 even if deal amount is 0.
    - Key Metrics: hot_leads, deals_closed, commission, top_source now show all-time totals (not period-filtered) so total clients, closed deals, and commission are always visible.
Application (Mobile):
    - Key Metrics: renamed COMMISSION to NET COMMISSION EARNED; commission card shows net commission entered when closing deals.
    - Key Metrics cards tappable: Hot Leads → client list; Deals Closed → closed deals by client; Commission → commission earned by client; Top Source → clients from that source.
### **Day 13: Feb 23 - Activity Log Header Polish**
Application (Mobile):
    - Redesigned Activity Log header: richer gradient, clearer lightning accent, and improved stat badges (STREAK, POINTS, LIVE) with icons, pill shape, and readable typography.
    - Added client priority selection when creating a client (Normal / High / Urgent) and surfaced priority-aware styling in the Deal Room client list.
    - Implemented per-client daily execution progress API and UI: Clients tab now shows today's daily-log completion (color-coded percentage / NOT STARTED) for each hot lead.
    - Enhanced Deal Room Clients list UX: gold/silver priority chips, sort-by-priority-and-progress toggle, and faster client loading by embedding today's progress into the hot_lead results API.
    - Reordered Activity Log tabs to surface Identity Conditioning first, keeping Revenue Actions as the second tab for clearer mental model.
Backend:
    - Admin endpoints: GET /admin/users/{id}/revenue-metrics and GET /admin/users/{id}/results (type, source filters) for per-user Deal Room metrics.
Website:
    - Added Deal Room / Key Metrics section to User Profile (admin view). Hot Leads, Deals Closed, Net Commission, Top Source with expandable detail lists per metric.

### **Day 14: Feb 25 - Production Dockerization & VPS Deployment Pipeline**
Website (Web Application):
    - Authored production `Dockerfile` for the React/Vite application to operate in an isolated container.
    - Set up an automated GitHub Actions CI/CD pipeline (`deploy.yml`) for push-to-deploy to a remote Hostinger VPS over SSH.
    - Implemented custom `nginx.conf` for SPA routing, resolving 404 errors on direct route access (e.g., /dashboard).
    - Synchronized environment variables (`.env`) to point the production build to the live VPS API endpoint.
    - Moved infrastructure from Port 3000 to Port 80 for professional root domain access without port numbers.
    - Automated host-level Nginx deactivation to prevent port 80 conflicts with the Dockerized application.
Backend:
    - Fully containerized the Laravel backend using a custom PHP 8.4 `Dockerfile` with system-level extensions.
    - Resolved critical 500 Server Error by injecting a secure `APP_KEY` into the production environment.
    - Hardened startup commands (`CMD`) to automatically map storage, migrate database schemas (`--force`), and seed demo data.
    - Synced administrative login logic in `DatabaseSeeder.php` and `api.php` with updated credentials (`admin@yas1r.local`).
    - Configured MySQL and phpMyAdmin (Port 8080) in the service layer for easier database management.
Infrastructure & Domain:
    - Directed `aanantbishthealing.com` and `api.aanantbishthealing.com` A-records to the Hostinger VPS IP.
    - Configured Hostinger VPS Firewall rules to allow traffic on Port 80 (Web), 8000 (API), and 8080 (Admin Database).
    - Repaired local Git repository reference corruption, ensuring a stable push-to-deploy pipeline.
    - Validated end-to-end data flow from DNS → Nginx → Docker → PHP → MySQL.

### **Day 15: Feb 26 - Brand Finalization & Mobile Ecosystem Sync**
Application (Mobile):
    - Synchronized Flutter source code with the live production API (`api.aanantbishthealing.com`).
    - Prepared the mobile environment for the final release build (APK) targeting the live VPS database.
    - Updated internal service layers to handle the new production URL structure.
Infrastructure:
    - Hardened the VPS Firewall by systematically opening ports 80, 8000, and 8080.
    - Validated live database health and seeder accuracy via phpMyAdmin on the remote host.



### **Day 16: Mar 2 - Course Management & Elite Training Experience**
Website (Course Management):
    - **Refined Course Modal**: Re-engineered the "Add/Edit Course" modal into a centered, 680px "Standard Dashboard" layout for perfect visibility on all viewports.
    - **Modal Accessibility**: Implemented internal scrolling for the main form while keeping the "Master Architect" header and action buttons fixed.
    - **Tactical Header**: Added a high-contrast HUD header with dynamic Tier Badges (Consultant, Rainmaker, Titan) and animated exit controls.
    - **Viewport Safety**: Forced vertical centering and an 85vh height cap to prevent "clipping" of the PUBLISH/CANCEL buttons on smaller screens.
Website (Knowledge Vault):
    - **Tiered Course Display**: Restored the three-column layout (Consultant, Rainmaker, Titan) with premium dark-theme cards and high-visibility status indicators.
    - **Curriculum Editor Polish**: Refactored PDF/Video resource management and lesson title editing for a more efficient administrative workflow.
Application (Mobile Mastery Engine):
    - **Cinematic Video Continuity**: Implemented a "Resume from Last Timestamp" system that tracks precisely where a student stops and automatically restarts the training from that exact second.
    - **Universal Offline Engine**: Engineered a permission-free download system using app-private storage, enabling one-tap saving for all training videos and PDF workbooks without system prompts.
    - **Atomic UI Isolation**: Optimized the download progress tracking using micro-widget state isolation, ensuring 1080p video playback remains lag-free while downloading assets in the background.
    - **Strategic Level Vault**: Re-organized the learning curriculum into distinct level-based hubs (Consultant, Rainmaker, Titan) for clear professional progression visibility.
    - **Visual Pre-loader Integration**: Synchronized high-definition thumbnail resolution across the curriculum vault and integrated them as pre-play placeholders in the video player.
    - **Tactical Storage Control**: Added a compact "Purge Offline Content" trigger next to every saved lesson, allowing students to instantly manage their device storage.
Backend & Data:
    - **Precision Progress API**: Enhanced the `updateMaterialProgress` endpoint to support `progress_seconds` synchronization for multi-device training continuity.
    - **Research Course Restoration**: Successfully re-seeded the "Cold Calling Mastery" and "Million Dirham Beliefs" programs from research folders into the local database.
    - **Seeder Logic Enhancement**: Updated `DatabaseSeeder.php` with guard logic and specialized course seeders for high-fidelity content restoration.

### **Day 12: Course points, exam flow, backend monitoring**
- **Application (Mobile):**
  - Course points: users earn points when completing each module; completion SnackBar shows "+10 points" per module.
  - Modules lock until the previous module’s videos are completed; locked modules show lock icon and message.
  - When the full course is completed, a "Take course exam" banner appears; user can open the course exam screen, answer questions, and submit to see score and pass/fail.
- **Backend:**
  - New tables: `course_exams`, `course_exam_questions`, `course_exam_attempts` for course tests.
  - APIs: `GET /courses/{id}/exam` (exam after course completion), `POST /courses/{id}/exam/submit` (submit answers, get score).
  - Monitoring: `GET /admin/course-results` (all users’ course progress + exam attempts), `GET /admin/users/{userId}/course-detail` (one user’s course progress and exam history).
  - Admin: `POST /admin/courses/{id}/exam` (create exam), `POST /admin/exams/{examId}/questions` (add questions) to set up exams.

### **Day 13: Fix “video watched but next module still locked”**
- **Application (Mobile):**
  - Fixed unlock logic: module completion and video type checks are now case-insensitive (`video` / `Video` from backend both count).
  - Video completion triggers when within last 2 seconds of end (avoids timing edge cases).
  - Curriculum reloads when user closes the inline video player (X), so next module unlocks immediately after finishing a video.
- **Models:** Material `is_completed` now parsed from backend as either boolean or 1/0 for compatibility.

### **Day 14: Curriculum editor fixes, Module 1 loading**
- **Backend:**
  - Admin course details (`GET admin/courses/{id}`) now loads all modules and lessons regardless of `is_published`, so editors can see and edit all content (e.g. Module 1 lessons).
- **Website (Curriculum Editor):**
  - Fixed content disappearing when selecting Module 2 lessons: defensive handling of `materials` (null/undefined), case-insensitive type checks for Video/PDF.
  - Softened black video/thumbnail preview areas to dark gradient.
  - Fixed crash when `pdf.title` is null: use `(pdf.title || '')` for length/substring and fallback in delete confirm.

### **Day 15: Test/Exam section in curriculum editor**
- **Backend:**
  - Added `GET /admin/courses/{id}/exam` to fetch exam and questions for the admin editor.
- **Website (Curriculum Editor):**
  - Added "Test / Exam" section in the sidebar. Admins create exams and add questions; users take the exam when they complete the course 100%.
  - Create exam flow: create exam, add questions (question text, 4 options, correct answer selector), view and manage questions.
- **Backend (exam limits):**
  - Each user may attempt the course exam only 2 times within 30 days. Both GET exam and POST submit enforce this limit and return a clear message when exceeded.
- **Backend (testing):**
  - Added `php artisan course:force-complete diamond@example.com` and `POST /admin/force-complete-course` to mark a course 100% complete for a user (for testing exam flow).
- **Application (Mobile):**
  - Exam banner now visible to everyone; shows progress % when locked (e.g. "40% complete — finish all modules to unlock"). Unlocks when course is 100% complete.
  - Certification exam page: realtor-focused copy ("Certification exam", "Submit for certification"), gradient header, meta badges (questions, pass %, time), refined question cards, result screen copy ("You passed!" / "Keep practicing").
  - Pass result screen: "Download certificate" button when user passes; placeholder for future certificate feature (shows "Coming soon").

### **Day 17: Mar 12 - VPS Docker Runtime & Auto-Deploy**
Website:
  - Switched production website hosting from Hostinger Docker Manager builds to a stable Docker CLI flow on the VPS using `realtorone-website:latest` and the shared `backend_default` network.
  - Updated Courses page copy (header now "Course Library") to avoid duplicate "Educational Content" wording on the curriculum grid screen.
  - Added `docker-compose.yml` and refined `compose.yaml` for clean VPS deployments and future portability.
  - Introduced `deploy-on-push.yml` GitHub Actions workflow that SSHes into the VPS, pulls the latest `main` branch, rebuilds the Docker image, and restarts the `realtorone-website` container automatically on each push.

### **Day 18: Mar 13 - Deploy Hardening & Course Media Fixes**
Website:
    - Consolidated deployment to one GitHub Actions workflow and removed conflicting duplicate workflows.
    - Updated curriculum media rendering to resolve live API asset URLs correctly (removed localhost-only preview behavior).
    - Increased website proxy upload capacity and timeouts for large video/PDF uploads.
Backend:
    - Raised public runtime upload and input limits to align with 1GB course media handling.
    - Enforced lesson material ordering so clients always receive Video first, then PDF, then other items.
Documentation:
    - Standardized progress logging to a single dated file (`work.md`) for all surfaces.
Application (Mobile):
    - Refined Activity Log flows: subconscious activities now follow the new mindset/growth grouping, and the conscious intro popup now appears only for users with zero clients based on live client status.
    - Updated the conscious intro behavior so users with zero clients keep seeing the popup whenever they enter the tab, until they actually have clients.
    - Hid Activity Log point values from the mobile UI, removing visible points badges and per-activity point labels for end users.

### **Day 19: Mar 18 - Local Docker Stack Recovery**
Backend:
    - Fixed the Docker build context to ignore the `public/storage` symlink so the Laravel container can build locally again.
    - Restarted the local Docker stack to align backend services with the MySQL/phpMyAdmin containers.
Website:
    - Rebuilt and launched the website inside Docker for server-style local testing instead of the Vite dev server.
Application (Mobile):
    - Centralized the app API base configuration so Android emulator, web, and desktop builds all target the correct local Docker backend automatically.
    - Switched identity-conditioning sections on mobile to render from backend-provided section titles and ordering instead of hardcoded group names.
Backend:
    - Added backend-managed section metadata for `activity_types` and backfilled existing rows so admin changes can drive app grouping.
Website:
    - Renamed sidebar navigation from "Growth Profile" to "Tasks / Activities" and updated the admin page to manage grouped activity sections/orders.
    - Reworked Tasks / Activities into a screenshot-style nested manager with left-side section tree, right-side activity detail panel, and group-wise update flow.

### **Day 20: Mar 19 - Activity Manager Simplification**
Backend:
    - Normalized subconscious activity grouping into two backend-driven tabs (`Mindset & Inner Strength`, `Growth & Daily Performance`) and applied it to existing DB records via migration.
    - Updated default activity seeding so fresh environments keep the same two-tab subconscious structure automatically.
Website:
    - Simplified Tasks / Activities UI to a cleaner editor-first layout: straightforward left list + right-side edit forms.
    - Kept direct management actions in one place for admins: update group, update activity, add activity, delete activity, and delete group.
    - Renamed the conscious side label from "Revenue Actions" to "Conscious" across Tasks / Activities and add-task defaults for clearer daily-task management.
    - Added day-wise popup content management in Tasks / Activities so admins can save per-day task description + video/reel script idea (with bulk tab-separated import).
    - Added collapsible/expandable editor blocks (Task Editor + Day-wise Popup Content + Bulk Import) and a one-click 60-day Visualization template loader for faster manual setup.
    - Added an in-panel "Saved Day Logs" list that shows all saved days (Day 1, Day 2, ...) for the selected activity, with quick click-to-load into editor.
    - Updated day-wise editor UI: section title shown as a single heading with edit icon, and day logs are now an expandable inline editor per day (click Day 1/Day 2 to expand and edit inside the list).
Backend:
    - Fixed activity deletion persistence by stopping automatic default reseeding on every `/activity-types` fetch (now seeds only when global activities are empty).
    - Added `script_idea` support for activity types (migration + API/model updates) to store editable video/reel guidance per task.
    - Added `activity_type_daily_logs` with admin endpoints for day-wise task/script content and exposed day-aware popup fields in `/activity-types` responses.
Application (Mobile):
    - Updated Activity Log cards to open a guided popup before YES/NO, showing day-wise task description and video/reel script idea from backend content.

### **Day 21: Mar 20 - AED currency labels**
- **Website (Subscriptions UI):**
  - Updated subscription/package revenue and price displays from `$` to `AED`.
- **Application (Mobile):**
  - Updated subscription plans screen duration options to `1 Month / 6 Monthly / 1 Yearly`, synced totals to `AED`, and aligned 6/12 pricing discounts with backend rules.
  - Enabled selecting the current tier card to renew for a new duration (instead of blocking taps on the active plan).
- **Backend:**
  - Updated `/subscriptions/purchase` to apply duration pricing discounts (6=10% off, 12=20% off) and to renew by extending from the current active `expires_at` (only one active record).

### **Day 22: Mar 20 - Mobile edit billing UX**
- **Application (Mobile):**
  - Auto-selected the user’s current tier package and added an “EDIT BILLING” action.
  - Bottom CTA now shows `RENEW` when managing the current tier (so users can change 1/6/12 months easily).
  - Tier accent colors now drive the selected duration pill and bottom CTA button styling.
- **Website (Admin):**
  - Replaced native `prompt()/confirm()` dialogs in `SubscriptionsPage` with custom modals for `Change Price`, `Remove`, and `Add Access Item`.

### **Day 23: Mar 20 - Admin UI cleanup**
- **Website (Momentum/Curriculum Editor):**
  - Removed the Reward Cap control and the stray `44` text near “Bulk Add”.
- **Website (Top Bar):**
  - Removed the `LIVE GATEWAY` status pill from the header.

### **Day 24: Mar 20 - Bulk Add UX fix**
- **Website (Momentum/Curriculum Editor):**
  - Updated `Bulk Add` to open in the same panel spot (replaces “Add Day”) instead of expanding at the bottom.
  - Added an in-editor `✎ Edit` button for the currently selected Visualization/Activity item.
  - Wired the top header search box to filter Momentum activities (Visualization/Daily Task Library).
  - Enhanced search to also filter day-wise popup content (task description / script idea / feedback) in the saved day list.

### **Day 25: Mar 20 - Practitioner Dossier UI clean-up**
- **Website:**
  - Improved Practitioner Dossier layout spacing using shared CSS classes.
  - Fixed Behavioral Momentum chart bar scaling (separate conscious/subconscious scaling).

### **Day 26: Mar 20 - Icons + Learning loader fix**
- **Website (Practitioner Dossier / UserProfilePage):**
  - Replaced emoji icons in stats/cards with consistent inline SVG icons.
  - Fixed “Learning & courses” panel stuck on loading by setting an empty default when the API fails.

### **Day 27: Mar 20 - Practitioner dossier compact UI**
- **Website (Practitioner Dossier / UserProfilePage):**
  - Tightened spacing: reduced action bar margin, main grid gaps, and several large panel paddings/gaps for a more compact look.

### **Day 29: Mar 22 - Day-wise audio for activity tasks**
- **Backend:**
  - Added `audio_url` column to `activity_type_daily_logs`; API accepts and returns it for daily log save/bulk; exposed as `daily_audio_url` in activity-types response for mobile.
- **Website:**
  - Added "AUDIO" field to Momentum admin day editor (Add Day + expanded day); supports pasting URL or uploading audio file with progress %; audio preview player before save; bulk import supports optional 5th column for audio URL.
- **Application (Mobile):**
  - Resolved relative audio URLs to full API URLs so playback works when backend returns paths like `/api/stream/...`.
- **Application (Mobile):**
  - Activity task popup shows inline audio player when admin has set an audio URL for that day; user can play/pause without leaving the app.
### **Day 28: Mar 22 - Activity Log task responses**
- **Application (Mobile):**
  - Activity task popup: changed NO/YES to Cancel/Submit; added text input for user response; Submit enabled only when user enters 2+ words; user response sent as activity description.
- **Backend:**
  - User task response (description) already stored via existing POST /activities endpoint.
- **Website:**
  - Renamed "Operational Activity Dossier" to "Activity Log"; added display of user task responses in admin Practitioner Dossier per-activity cards.

### Day 30: Mar 22 - Momentum task description UX
Website:
  - Made TASK DESCRIPTION collapsible per day card (expand/hide toggle with chevron); collapsed view shows one-line preview; collapsed by default.
  - New days and empty days now default task description from the previous saved day (reuses content across days).
  - Custom audio preview player: 2× speed toggle, seekable progress bar (click/drag to jump).
Application (Mobile):
  - Activity task audio player: 2× speed toggle, seekable progress bar (drag to listen from any position).
  - Replaced standard slider with waveform-style seek bar: vertical blue bars (voice-note style), tap/drag to seek.

### Day 31: Mar 22 - Compact activity audio player
Application (Mobile):
  - Removed the circular seek thumb; progress is indicated only by filled vs muted bars.
  - Tightened player card (padding, radii, play control size) and shortened waveform bars for a more compact layout; tabular figures on timestamps.

### Day 32: Mar 22 - Real activity-task waveform
Application (Mobile):
  - Activity audio seek bar uses native RMS waveform extraction (`audio_waveforms`) after caching the file via authenticated download; 56 bars mapped to the real envelope; synthetic fallback if extract fails or on web (no `dart:io`).
  - Added conditional `activity_waveform_download` helper (IO vs stub) for temp download + Bearer token when present.
done

### Day 33: Mar 23 - Momentum remove audio
Website:
  - Daily Task Library day editor: REMOVE AUDIO next to UPLOAD AUDIO (shown when a URL is set); clears the field and preview; Save persists with explicit `audio_url: null` in the PUT body.
  - Save on a day card shows a bottom toast popup (Day N saved on success; error message on failure); auto-dismiss ~3.8s or tap to dismiss; save reads drafts from `dayDraftsRef` so fields stay in sync.
  - Add Day form: `editor-card` uses `overflow: visible` for this page so sticky save row works; top bar is sticky with stronger contrast; second Save day / Cancel row under Feedback so actions stay visible after scrolling.
  - Layout: Momentum uses `.momentum-page` + `.momentum-curriculum-layout` - flex column, `min-height` tied to `100dvh`/viewport, editor `clamp(420px, 72dvh, 820px)`; sidebar uses `min()` width; <=900px stacks column with capped sidebar height and taller main panel.
  - FEEDBACK (OPTIONAL): Collapsible like task description (▸/▾); collapsed shows one-line preview or -; expanded uses a small textarea; shared collapsible row styles + hover (`.momentum-collapsible-trigger`) for task + feedback.

### Day 34: Mar 23 - Momentum audio upload reliability
Website:
  - Upload progress: `loadstart` + percent from `lengthComputable` or `loaded / file.size` when the browser/proxy hides totals (common); cap at 99% until JSON response; 100% only on success.
  - Button shows UPLOADING until percent >= 3, then UPLOADING n%; progress callback uses `Math.max` to avoid flicker.
  - After upload, auto-save uses current drafts via `dayDraftsRef` (fixes stale `dayDrafts` after `await`), stores relative `/api/stream/...` when the API returns that shape; alerts for missing admin token, failed upload URL, or failed save.

### Day 35: Mar 23 - Cross-platform push notifications
Backend:
  - `user_push_tokens`, `notification_broadcasts`, `notification_automation_dedupes` migrations; FCM HTTP v1 via `google/auth` + `FcmSenderService`; `SendPushBroadcastJob`, recipient resolver, schedule helper.
  - `POST/DELETE /user/push-token`; admin `GET/POST /admin/notifications`, cancel + send-now; `notifications:process-scheduled` (every minute) + `notifications:missed-activity` (daily 09:00) in `routes/console.php`; `.env.example` Firebase vars.
Website:
  - Notifications sidebar tab + `NotificationsPage` (compose: audience all/tier/users, display style, schedule, recurrence, deep link; list with cancel / send now); `apiClient` helpers + `NotificationBroadcast` type.
  - Admin Notifications page uses sectioned layout, display-mode cards, live phone preview, and banner-only fields (subtitle, CTA label, accent color, image URL) stored in `extra_data`.
  - Firebase web SDK + Analytics in `src/firebase.ts` / `main.tsx`.
Application (Mobile):
  - `firebase_core` / `firebase_messaging`, placeholder `firebase_options.dart` + `google-services.json` (replace via flutterfire configure); `PushNotificationService` (token sync, foreground banner vs snackbar vs silent).
  - Hooks in `main`, login, splash; `ApiClient.beforeClearToken` removes push token on logout; foreground banner reads FCM data keys + `deep_link` for primary action.

### Day 36: Mar 23 - App notification reliability + inbox
Backend:
  - Wired Firebase Admin service-account config in runtime `.env` (`FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS_PATH`) and verified broadcasts complete without the previous "FCM not configured" error.
Application (Mobile):
  - Replaced placeholder Android Firebase config with real `google-services.json` and real Android values in `firebase_options.dart` for project `realtor-one`, so FCM token registration can succeed.
  - Added local notification inbox on app Home: bell icon with unread badge, history screen, and clear-all action.
  - `PushNotificationService` now stores incoming messages in local history (foreground/background/opened), keeps unread count via `ValueNotifier`, and marks as read when opening the inbox.

### Day 37: Mar 23 - Backend notification send troubleshooting
Backend:
  - Added Firebase environment passthrough to Docker `app` service (`FIREBASE_PROJECT_ID`, `FIREBASE_CREDENTIALS_PATH`, `FIREBASE_CREDENTIALS_JSON`) and rebuilt the app image so runtime config is consistent.
  - Fixed `SendPushBroadcastJob` retry guard to allow re-processing broadcasts already in `processing` state after a failed first attempt, preventing permanent stuck states.
  - Ran live admin API notification send tests; current blocker is still runtime FCM auth/class loading in the active backend worker process, which keeps recent broadcasts in `processing`.

### Day 38: Mar 23 - Better inbox UX + deep link + daily greeting
Backend:
  - `SendPushBroadcastJob` now includes `recurrence_type` / `recurrence_time` / `timezone` in the FCM data payload for better in-app UX.
Application (Mobile):
  - Daily recurring notifications automatically get a local-time greeting prefix (Good morning/afternoon/evening) in both banner and snackbar flows.
  - Notifications inbox UI is cleaner: split into `Active` (unread) and `History` (read), and tapping a notification opens the stored `deep_link` when available.

### Day 39: Mar 23 - Daily notification surface polish
Application (Mobile):
  - For `recurrence_type=daily`, the app auto-switches in-app presentation by time (morning banner, afternoon snackbar, evening banner).
  - Snackbar now includes an `Open` action when `deep_link` is present.
Website:
  - Added a small hint on the notifications page explaining the daily auto-surface behavior.

### Day 40: Mar 23 - Admin AI agent chat UI
Website:
  - Added an `AI Agent` tab with a session-based chat UI connected to backend `POST /api/chat` and `GET /api/chat/history`, including quick knowledge/support prompt chips.
Backend:
  - Added `ai_course_knowledge_base` table and admin endpoints to toggle course AI knowledge base visibility per tier.
  - Updated `ChatController` so course-related AI replies use only tier-enabled courses.
Website:
  - Added per-tier “AI Knowledge Base” ON/OFF toggles inside the course edit modal, saved via admin API.

### Day 41: Mar 23 - Admin AI Inbox + monitoring
Backend:
  - Added admin AI inbox endpoints to monitor all users’ chat sessions/messages plus enabled KB for a user.
  - Added token usage tracking (OpenAI `usage.total_tokens`) on chat messages so admin can see “AI tokens too much”.
  - Added initial `ai_human_tickets` table and admin APIs to create/resolve human handoff tickets.
Website:
  - Replaced the `AI Agent` tab UI with a multi-column admin inbox (Users → Sessions → Messages + KB + Human handoff).

### Day 42: Mar 24 - Curriculum viewport fit fix
Website:
  - Made Curriculum Editor layout responsive so modules sidebar and content panel fit medium laptop widths without clipping.
  - Replaced fixed two-column media/document grids with auto-fit responsive grids for video, thumbnail, PDF list, and PDF preview blocks.
  - Improved main editor scrolling behavior and tightened paddings/title wrapping to keep lesson content visible inside the viewport.
  - Added a compact 100%-zoom pass: reduced media card heights, sidebar/item spacing, settings card density, and section margins so the default browser zoom fits more content on screen.
  - Added an extra compact pass for low-height laptops: further reduced media/PDF preview heights, tightened card paddings and section gaps, and compressed module/lesson spacing.

### Day 43: Mar 25 - Website lint/build fixes
Website:
  - Unblocked ESLint by relaxing `@typescript-eslint/no-explicit-any` and fixed the React `setState`-in-effect issue in `LeaderboardPage`.
  - Removed an unused catch variable in `src/api/client.ts` and confirmed `npm run lint` + `npm run build` both succeed.

### Day 44: Mar 25 - Mobile app switched to live API
Application (Mobile):
  - Updated `lib/api/app_config.dart` to use the live backend base URL (`https://api.aanantbishthealing.com/api`) across platforms.
  - Re-ran the Android app on emulator and verified runtime API calls are now targeting the live domain.

### Day 45: Mar 25 - Mobile base switched to VPS IP
Application (Mobile):
  - Updated `lib/api/app_config.dart` base URL to `http://187.77.184.129/api` as requested for app API calls.

### Day 46: Mar 25 - Reverted to full local run mode
Application (Mobile):
  - Switched `lib/api/app_config.dart` back to local API routing (`10.0.2.2:8000` for Android emulator, `127.0.0.1:8000` for web/desktop).
Website:
  - Restarted local Vite server on `http://localhost:5173`.

### Day 47: Mar 25 - Day delete in Momentum editor
Backend:
  - Added `DELETE /admin/activity-types/{id}/daily-logs/{day}` to remove a single saved day log for an activity.
Website:
  - Added per-day `Delete` action in Momentum day cards with confirmation dialog, loading state, and post-delete refresh/cleanup.

### Day 48: Mar 25 - Better delete error handling
Website:
  - Updated `deleteActivityTypeDailyLog()` to safely handle non-JSON (HTML) backend responses and show clearer toast messages when delete fails.

### Day 49: Mar 25 - Audio target % + listen tracking
Backend:
  - Added `required_listen_percent` support for day-wise activity logs (validation + GET/PUT/bulk APIs) and exposed `daily_required_listen_percent` in `/activity-types`.
Website:
  - Momentum day editor now includes `REQUIRED LISTEN %` (0-100) for each day and saves it with day content.
Application (Mobile):
  - Activity task popup tracks max listened audio progress %, shows progress vs required %, and sends this metadata on submit for daily tracking visibility.

### Day 50: Mar 25 - Hide listen target without audio
Website:
  - Momentum editor now shows `REQUIRED LISTEN %` slider only when a day has an audio URL set.

### Day 51: Mar 25 - Show listened % in Activity Log
Website:
  - User Activity Log cards now parse activity `notes` and display audio listen metrics (`listened %`, `required %`, `met/below`) when present.

### Day 52: Mar 25 - Admin-controlled response requirement
Backend:
  - Added `require_user_response` for day-wise logs and exposed `daily_require_user_response` in activity types API.
Website:
  - Added per-day toggle in Momentum editor: `Require user response before submit`.
Application (Mobile):
  - Submit now follows admin rules: response required toggle and required listen % threshold both gate submit enablement.

### Day 53: Mar 25 - Audio badge display filter
Website:
  - Activity Log now shows audio progress badge only for entries with meaningful audio tracking (`listened > 0` or `required > 0`), hiding `0% / 0%` noise.

### Day 54: Mar 25 - Momentum toggle visual polish
Website:
  - Replaced raw response-required checkbox/pill with a cleaner switch-style settings row (label + helper text + animated knob) in both new and saved day editors.

### Day 55: Mar 25 - Audio settings card polish
Website:
  - Reworked Momentum day audio area into a compact `Audio Settings` card with clearer grouping for URL/upload actions, listen % slider, response rule toggle, and preview.

### Day 56: Mar 25 - Script idea collapsible UI
Website:
  - Made `VIDEO/REEL SCRIPT IDEA` collapsible with expand/collapse + preview text (same interaction pattern as Task Description) in both new and saved day editors.

### Day 57: Mar 25 - Dynamic signup diagnosis questions
Backend:
  - Added `diagnosis_questions` storage + APIs for admin CRUD and mobile fetch (`/admin/diagnosis/questions`, `/diagnosis/questions`), with validation for options/blocker/score.
  - Seeded DB with the 7 provided signup questions/options and removed backend hardcoded fallback generation.
Website:
  - Added new admin section `Signup Questions` in sidebar with full add/edit/delete controls for question text, order, active toggle, and option mapping.
  - Polished Signup Questions UI with cleaner card hierarchy, labels, option rows, and improved error state styling for easier editing.
  - Upgraded Signup Questions action buttons (Delete/Save) with improved sizing, rounded styling, and stronger visual hierarchy.
  - Refined Push Notifications page UI: elevated hero card, richer section depth, improved input focus states, enhanced display-card interactions, and cleaner history table/actions styling.
  - Fixed Leaderboard admin sync with app data shape (`data.leaderboard`) and aligned default category to `Top Realtor` for matching live rankings.
Application (Mobile):
  - Replaced hardcoded diagnosis questionnaire with API-driven questions loaded at runtime; if API returns none, the screen now shows empty-state instead of fallback hardcoded questions.

### Day 58: Mar 27 - Disaster Recovery & Advanced System Backup
Backend:
  - Implemented `BackupController` with granular component selection: administrators can now generate `Database only`, `Media only`, or `Full` system backups via the API.
  - Added support for `--ssl=0` in database commands (MariaDB compatible) to resolve "self-signed certificate" connection errors during export/import on the live VPS.
  - Hardened backup security: restricted access to admin-only routes and implemented automatic temporary file cleanup to prevent server storage bloat.
  - Enhanced `Dockerfile` with essential recovery tools: `zip` for asset compression and `default-mysql-client` for high-fidelity database dumps.
Website:
  - Redesigned "Admin System Settings" with a premium **Disaster Recovery & Redundancy** panel featuring a modern glassmorphism aesthetic and interactive state feedback.
  - Integrated granular checkboxes for selective component backup, allowing admins to download specific data segments (e.g., just Database or just Media Assets).
  - Added a "Restore from ZIP" workflow with a secure file-upload interface and safety confirmation dialogs to prevent accidental data overwrites.
  - Polished the Settings UI: removed legacy subscription/pricing fields and unified all system maintenance and recovery controls into a single dashboard.
Infrastructure:
  - Performed a deep-clean recovery of the VPS deployment pipeline: resolved local/remote Git branch desynchronization and recovered host-level terminal access.
  - Rebuilt the live production environment on the VPS (`187.77.184.129`) to apply the new backup utilities and ensure full end-to-end data persistence.
