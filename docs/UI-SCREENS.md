# Zenitrox — Screens, Tabs & Buttons (design brief)

Use this as the input for an AI design tool (e.g. Stitch). It lists every screen in Zenitrox, what is on it,
and every button/action, so new designs cover the real product. Section 0 has the brand basics; section 3 has
ready-to-paste prompts.

---

## 0. Brand & design basics

| Item | Value |
|---|---|
| Product | **Zenitrox** — team task & project management for a 6-person team |
| Logo | Rounded-square mark with a white **"Z"** on a blue→violet gradient, wordmark "Zenitrox" |
| Brand colors | Blue `#196AFF` → Violet `#5B3DF5` (gradient); current primary button blue `#1973FF` |
| Status colors | Success/done green, Warning/busy amber, Danger/overdue red |
| Current font | Quicksand (headings), Open Sans (body) — open to change (e.g. Inter) |
| Themes | Light **and** dark mode required |
| Devices | Desktop 1440px and mobile 390px (installable as a phone app / PWA) |
| Language | English (UI supports 30+ languages, so allow text to grow ~30%) |
| Tone | Clean, calm, modern; rounded cards; soft shadows; plenty of white space |

---

## 1. Global layout (on every page after login)

### 1.1 Left sidebar (collapsible; becomes a slide-in drawer on mobile)
- **Logo** (click → Overview)
- Main menu:
  - **Overview** — home
  - **Upcoming** — tasks by date
  - **Dashboard** — team stats *(Zenitrox addition)*
  - **Workload** — who is busy when *(Zenitrox addition)*
  - **Projects**
  - **Labels**
  - **Teams**
- **Favorites** section (starred projects)
- **Saved filters** section (e.g. "Overdue", "Due this week", "Ravi's tasks")
- **Project tree** — projects with nested sub-projects, expand/collapse arrows, drag to reorder,
  each project shows its color dot and a **⋯ menu** on hover
- **Resize handle** on the sidebar edge

### 1.2 Top header bar
- **Hamburger** (open/close sidebar)
- **Current project title** + **⋯ project menu** (when inside a project)
- **Search / Quick actions** (magnifier; keyboard shortcut ⌘K / Ctrl+K)
- **Notifications bell** with unread badge → dropdown list, "Mark all as read"
- **User menu** (avatar + name ▼): Settings · Keyboard shortcuts · About · Log out

### 1.3 Global overlays
- **Quick actions palette** (Ctrl+K): search tasks / projects / teams / labels; commands "New task",
  "New project", "New team"
- **Toasts** (success / error) bottom-left with optional action button ("Undo")
- **Modals** for confirmations and small forms (dark backdrop, centered card)
- **"Add to home screen"** banner on mobile
- **Keyboard shortcuts** help modal

---

## 2. Screens

### 2.1 Login `/login`
- Logo on top; split card: **left = brand image panel** with "Welcome back!" (hidden on mobile), **right = form**
- Fields: **Username or email**, **Password** (show/hide eye), **Two-factor code** (only if enabled)
- Checkbox: **Stay logged in**
- Buttons: **Login** (primary), **Forgot password?** link, **Create account** link
- Text: "Using Zenitrox installation at … — change" (server address; small, secondary)
- States: wrong password error, loading, server unreachable

### 2.2 Register `/register`
- Same split layout; fields **Username**, **Email**, **Password** (strength hint)
- Buttons: **Create account**, **Already have an account? Login**

### 2.3 Forgot password `/get-password-reset` and Reset `/password-reset`
- Email field → **Send reset link**; then **New password** → **Reset password**

### 2.4 Overview / Home `/`
- **Greeting** that changes with time of day ("Good morning, Ram!")
- **Quick add task bar** — one input "Add a task…" with magic shortcuts
  (`*label`, `+project`, `@user`, dates like "tomorrow 5pm", `!3` priority) and a help tooltip
- **Last viewed projects** — row of project cards (color/background image, title)
- **Current tasks** — list of my undone tasks with due dates (checkbox, title, project, labels, assignee avatars,
  due chip, priority flag)
- Empty state for new users: "Import your data" / "Create your first project"

### 2.5 Upcoming `/tasks/by/upcoming`
- Title "Current tasks"
- **Date range picker** (Today, Next 7 days, Next 30 days, This month, Custom…)
- Checkboxes: **Show tasks without dates**, **Show overdue tasks**
- Task list grouped by date; label filter chips with "Clear filter"
- Empty state: "Nothing to do — have a nice day!"

### 2.6 Team Dashboard `/dashboard` *(Zenitrox)*
- **4 stat tiles**: Open · Overdue (red when > 0) · Due this week · Done this week (green)
- **Bar chart**: "Completed in the last 7 days" (one bar per day)
- **Team members table**: Member (avatar+name) · Open · Overdue · Due today · Done this week ·
  Progress bar (7 days); click a row → expands to that person's open tasks (title link + due time, overdue in red);
  an **Unassigned** row at the end
- Ideas for redesign: per-person cards instead of a table on mobile, sparkline per person, "needs attention" list

### 2.7 Workload `/workload` *(Zenitrox)*
- Title + one-line explanation; **legend**: 1–2 tasks (green), 3–4 (amber), 5+ (red)
- **Grid**: rows = people (avatar+name, sticky first column), columns = **Overdue** + next **14 days**
  (weekday + date; weekends shaded; today highlighted)
- Each cell = colored count badge; click → **task list panel** below ("Arun · Friday, Oct 9" + task links)
- Mobile: horizontal scroll with the name column pinned

### 2.8 Projects list `/projects`
- Header: **Show archived** checkbox; buttons **New saved filter**, **New from template** *(Zenitrox)*, **New project**
- **Grid of project cards** (background image or color, title, description excerpt, ⭐ favorite toggle,
  archived badge); child projects nested
- Empty state

### 2.9 New project (modal) `/projects/new`
- Fields: **Title**, **Parent project** (search), **Color** picker → **Create**

### 2.10 New project from template (modal) `/projects/from-template` *(Zenitrox)*
- **Template** dropdown, **Title**, **Parent project**, **Start date** (with help text: due dates shift so the first task
  lands on this day), checkbox **Copy shares** → **Create project**
- Empty state explaining: make a project named "Templates" and put template projects inside it

### 2.11 Project page `/projects/:id` — **view tabs** at the top
Tabs (configurable per project): **List · Gantt · Table · Kanban** (+ custom views)

Shared project header: project title, **⋯ project menu**, **filter button** (query builder popup with
"Show done tasks"), **search**

**a) List view**
- **Add a task…** input (with quick-add magic) + **Add** button
- Rows: checkbox (done), task identifier (#12), title, labels (colored chips), assignee avatars, due date chip
  (red when overdue), priority icon, comment/attachment counts, ⭐ favorite; drag handle to reorder
- Pagination; **Sort** options

**b) Kanban view**
- Columns (buckets) e.g. To-Do · Doing · Done; column header shows title, task count, **limit** ("3/5"),
  **⋯ bucket menu**: Rename · Set limit · Mark as **Done bucket** · Mark as **Default bucket** · Collapse · Delete
- Cards: cover image (optional), title, labels, assignees, due chip, priority, progress, attachment/comment icons,
  done checkmark
- **Add a task** at the bottom of each column; **Create a bucket** column at the end
- Drag cards between columns and reorder; drag columns

**c) Gantt view**
- Date range picker, checkbox **Show tasks without dates**
- Timeline with day columns, task bars (drag to move / resize), "today" line, add task input

**d) Table view**
- **Columns** toggle popup (ID, Done, Title, Priority, Labels, Assignees, Due date, Start date, End date,
  % done, Done at, Created, Updated, Created by)
- Sortable column headers; filter popup; pagination

### 2.12 Project ⋯ menu (dropdown)
Edit · Views · Background · Share · Duplicate · **Clear completed tasks** *(Zenitrox)* · Archive ·
Subscribe/Unsubscribe · Webhooks · Create sub-project · Delete (red)

Modals behind these items:
- **Edit**: Title, Identifier, Parent, Description (rich text), Color, Archived → Save
- **Views**: list of views with title, type (List/Gantt/Table/Kanban), filter, "bucket configuration" → Create / Edit / Delete
- **Background**: upload image / pick from Unsplash / remove
- **Share**: tabs **Users** (search + permission Read only / Read & write / Admin) · **Teams** (same) ·
  **Link shares** (create public link with permission, name, password; copy button)
- **Duplicate**: parent project + "copy shares" → Duplicate
- **Clear completed tasks**: confirmation "permanently delete N completed tasks" → Cancel / Do it
- **Archive / Delete**: confirmation modals
- **Webhooks**: list + form (Target URL, Secret, Events checkboxes) → Create; delete per row

### 2.13 Task detail `/tasks/:id` (full page, or modal over a project)
- **Header**: project breadcrumb, task identifier, **Title** (inline editable), **Done** toggle button,
  "Created … by …, updated …" meta
- **Attribute area** (only shows fields that are set): Assignees · Priority · Due date · Start date · End date ·
  Reminders · Repeat · Progress (%) · Color · Labels · Project
- **Description** — rich-text editor (headings, bold/italic/underline/strike, code, quote, lists, checklists,
  image, link, table, undo/redo; "/" command menu); Save / Cancel
- **Attachments** — upload (drag & drop), list with preview, download, delete, "set as cover"
- **Related tasks** — subtask / parent / blocking / blocked by / related / duplicate …, add relation search
- **Comments** — list (avatar, name, time, edited), reactions (emoji), reply/quote, edit/delete own;
  new comment editor + **Comment** button; @mentions
- **Right-hand action sidebar (buttons)**:
  Done / Undone · **Assign to user** · **Add labels** · **Set priority** · **Set due date** · **Set start date** ·
  **Set end date** · **Set reminders** · **Set repeating interval** · **Set progress** · **Add attachments** ·
  **Add relation** · **Move** (to another project) · **Duplicate** · **Set color** · **Add to favorites** ·
  **Subscribe** · **Delete** (red)
- Keyboard shortcuts for most actions (t = done, a = assign, l = labels, d = due date, etc.)
- Mobile: attributes stack; action buttons become a bottom sheet / "more" menu

### 2.14 Labels `/labels`
- List of labels (color chip + title); click → edit panel (title, description, color) → Save / Delete
- **New label** button + modal (title, color)

### 2.15 Saved filter (create/edit) `/filters/new`
- Title, Description, **Filter query** input with autocomplete (e.g. `done = false && dueDate < now`),
  checkbox "Include tasks without dates", **Show done tasks** → Create
- Saved filters then appear in the sidebar and open like a project (List/Kanban/Table views)

### 2.16 Teams `/teams`, New team, Edit team `/teams/:id/edit`
- List of teams → **Create team**
- Edit team: Name, Description (rich text), **Save**, delete (red);
  **Team members**: user search + **Add to team**, rows with avatar, name, "You" tag, Admin/Member toggle, remove;
  **Leave team** (red, full width)

### 2.17 Settings `/user/settings/…` — **left tabs**
1. **General** — Display name, language, timezone, week start (Mon/Sun), default project, default view,
   time format (12/24h), "Play a sound when completing tasks", show/hide archived, email reminders,
   overdue-summary email time, quick-add magic mode, color scheme (Light / Dark / Auto) → Save
2. **Password** — current + new password → Save
3. **Email address** — new email + password → Save (with "waiting for confirmation" state)
4. **Avatar** — choose: Initials · Gravatar · Marble · Upload image
5. **Two-factor authentication** — enable/disable TOTP, QR code, confirm code
6. **Sessions** — list of logged-in devices with "Log out" per session
7. **API tokens** — list (title, permissions, expiry) + **Create token** (title, expiry, permission checkboxes)
8. **Bots** — bot users list + create
9. **Webhooks** — personal webhooks (reminders/overdue) — URL, secret, events
10. **CalDAV** — URL to sync tasks with phone calendar apps + tokens
11. **MCP** — connect AI assistants (token + setup guides)
12. **Feeds** — notification feed URL (Atom/RSS)
13. **Import** — import from Todoist, Trello, Microsoft To Do, TickTick, WeKan, Planka, CSV, Zenitrox export
14. **Data export** — request a copy of all data (password) → download link
15. **Delete account** — password → schedule deletion (red)

### 2.18 Link-share view `/share/:hash/auth`
- Public read-only (or editable) project view for people without accounts; optional password prompt;
  minimal header with logo

### 2.19 Misc
- **About** modal (version, links)
- **404** page
- **Offline** screen (no internet) and **Loading** screen (logo + spinner)
- **Error** messages / toasts

---

## 3. What to design first (priority) + ready prompts

Paste the brand basics (section 0) first, then one of these:

1. **Login / Register**
   > "Login page for Zenitrox, a team task manager. Left: brand panel with blue→violet gradient (#196AFF→#5B3DF5),
   > white 'Z' logo and the line 'Welcome back!'. Right: username, password with eye toggle, 'Stay logged in',
   > primary Login button, links 'Forgot password?' and 'Create account'. Light and dark mode. Desktop 1440 + mobile 390."

2. **Overview (home)**
   > "Home screen: greeting 'Good morning, Ram!', a large quick-add task input, a row of recent project cards,
   > and 'My tasks' list with checkbox, title, project chip, labels, assignee avatars, due chip (red if overdue),
   > priority flag. Left sidebar: Overview, Upcoming, Dashboard, Workload, Projects, Labels, Teams, Favorites,
   > Saved filters, project tree. Top bar: search (Ctrl+K), notifications bell, user avatar menu."

3. **Kanban board + task card**
   > "Kanban board: columns To-Do / Doing / Review / Done with count and WIP limit '3/5', ⋯ column menu,
   > 'Add a task' at column bottom, 'Create a bucket' at the end. Cards: optional cover image, title, label chips,
   > assignee avatars, due-date chip (red overdue / amber today), priority icon, progress bar, comment and
   > attachment counts. View tabs above: List · Gantt · Table · Kanban, plus Filter and Search buttons."

4. **Task detail**
   > "Task detail page: breadcrumb, identifier '#12', big editable title, Done button. Attribute pills:
   > assignees, priority, due date, start/end, reminders, repeat, progress, labels. Rich-text description,
   > attachments grid, related tasks (subtask / blocked by), comments with emoji reactions and @mentions.
   > Right sidebar of actions: Assign, Labels, Priority, Due date, Reminders, Repeat, Progress, Attachments,
   > Relation, Move, Duplicate, Color, Favorite, Delete (red). Mobile: actions in a bottom sheet."

5. **Team dashboard**
   > "Team dashboard: 4 stat tiles (Open, Overdue red, Due this week, Done this week green), a 7-day
   > 'tasks completed' bar chart, and a members table/cards with avatar, open, overdue, due today,
   > done this week and a progress bar; expanding a member shows their task list."

6. **Workload**
   > "Workload heatmap: rows are team members (avatar + name, pinned), columns are 'Overdue' then the next
   > 14 days (weekday + date, weekends shaded, today highlighted). Cells show a count badge colored
   > green (1–2), amber (3–4), red (5+). Clicking a cell opens a panel listing those tasks."

7. **Mobile versions** of 2, 3 and 4 (bottom navigation: Home · Upcoming · Projects · Dashboard · Menu)

---

## 4. What to send back for implementation

For each screen: a **PNG** (desktop + mobile, light + dark if possible) and, if the tool exports it,
the **HTML/CSS (Tailwind)**. Note any new elements that don't exist in the list above — those may need
new features, not just styling.
