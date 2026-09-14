# Graph Report - taskmanager-unixir-React  (2026-09-14)

## Corpus Check
- Corpus is ~8,611 words - fits in a single context window. You may not need a graph.

## Summary
- 244 nodes · 297 edges · 28 communities (14 shown, 14 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.76)
- Token cost: 191,615 input · 0 output

## Community Hubs (Navigation)
- App Screens & Navigation
- NPM Package Config
- OTP Auth Flow
- Board Member & Assignment
- Board & Task CRUD
- App TS Config
- Node TS Config
- API Client & Tests
- Dev Tooling Dependencies
- Frontend Build Docs
- Favicon Brand Design
- Social Icon Sprite
- Oxlint Rules Config
- API Error Shapes
- Root TS Config
- API Base URL & CORS
- Backend Design Gaps
- Auth Token Handling
- Hero Marketing Image
- Vite Logo Asset
- Vercel Deploy Config
- Create Board DTO
- Board Member Lookup
- Task Assignments Lookup
- Swagger API Docs
- User Lookup Endpoint
- User Profile DTO
- React Logo Asset

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `navigate()` - 10 edges
4. `api()` - 10 edges
5. `scripts` - 7 edges
6. `TodoItemDetailDTO` - 7 edges
7. `POST /api/todoitem/assign` - 6 edges
8. `Suggested screen-to-endpoint map` - 6 edges
9. `Board detail (Kanban) screen` - 6 edges
10. `React + TypeScript + Vite template` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Build Guide (API doc for React Kanban frontend)` --conceptually_related_to--> `React + TypeScript + Vite template`  [INFERRED]
  FRONTEND-BUILD-GUIDE.md → README.md
- `React + TypeScript + Vite template` --conceptually_related_to--> `index.html entry document`  [INFERRED]
  README.md → index.html
- `/src/main.tsx module entry reference` --conceptually_related_to--> `React Compiler (not enabled in this template)`  [INFERRED]
  index.html → README.md
- `ThemeToggle()` --calls--> `useTheme()`  [EXTRACTED]
  src/App.tsx → src/theme.ts
- `Signup()` --calls--> `api()`  [EXTRACTED]
  src/App.tsx → src/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Signup OTP verification flow** — frontend_build_guide_signup_endpoint, frontend_build_guide_verify_otp_endpoint, frontend_build_guide_resend_otp_endpoint, frontend_build_guide_verify_otp_route [EXTRACTED 1.00]
- **Password reset flow (enumeration-safe)** — frontend_build_guide_forgotpasswordcontroller, frontend_build_guide_forgot_password_endpoint, frontend_build_guide_forgot_password_resend_endpoint, frontend_build_guide_forgot_password_reset_endpoint, frontend_build_guide_email_enumeration_prevention [EXTRACTED 1.00]
- **Board/task owner-or-member authorization pattern** — frontend_build_guide_board_access_rule, frontend_build_guide_board_detail_endpoint, frontend_build_guide_task_detail_endpoint, frontend_build_guide_update_board_endpoint, frontend_build_guide_delete_board_endpoint [INFERRED 0.85]

## Communities (28 total, 14 thin omitted)

### Community 0 - "App Screens & Navigation"
Cohesion: 0.11
Nodes (27): react, api(), App(), AppShell(), Assignment, Board, BoardDetail(), Boards() (+19 more)

### Community 1 - "NPM Package Config"
Cohesion: 0.07
Nodes (25): dependencies, react, react-dom, name, private, scripts, build, dev (+17 more)

### Community 2 - "OTP Auth Flow"
Cohesion: 0.11
Nodes (23): Brevo (OTP email delivery), CreateUserDTO, Email-enumeration-safe response pattern, POST /ForgotPassword, POST /ForgotPassword/resend-otp, POST /ForgotPassword/reset, /forgot-password route, ForgotPasswordController (+15 more)

### Community 3 - "Board Member & Assignment"
Cohesion: 0.12
Nodes (21): POST /api/boardmember, AddBoardMemberRequest DTO, POST /api/todoitem/assign, Assign task screen, Assignee-must-be-board-member business rule, AssignTaskDTO, Board settings / delete screen, BoardMemberDTO (+13 more)

### Community 4 - "Board & Task CRUD"
Cohesion: 0.13
Nodes (21): Owner-or-member board/task access rule, GET /api/board/{id}, /boards/:id route, Board detail (Kanban) screen, BoardDetailDTO, GET /api/board/user/boards, Boards list screen, /boards route (+13 more)

### Community 5 - "App TS Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 6 - "Node TS Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 7 - "API Client & Tests"
Cohesion: 0.25
Nodes (9): @testing-library/react, vitest, ApiError, apiUrl, errorMessage(), isTechnicalDetail(), tokenKey, jsonResponse() (+1 more)

### Community 8 - "Dev Tooling Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, jsdom, oxlint, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node, @types/react (+5 more)

### Community 9 - "Frontend Build Docs"
Cohesion: 0.22
Nodes (11): Frontend Build Guide (API doc for React Kanban frontend), index.html entry document, /src/main.tsx module entry reference, #root mount div, Inline theme-bootstrap IIFE (pre-render dark/light theme init), Oxlint configuration (.oxlintrc.json), oxlint-tsgolint package (type-aware lint rules), React Compiler (not enabled in this template) (+3 more)

### Community 10 - "Favicon Brand Design"
Cohesion: 0.43
Nodes (7): SVG Alpha Mask Clipping Technique, TaskManager Favicon / App Icon, Blue Accent Color (#47bfff), Layered Blurred Ellipse Gradient Effect, Angular Bolt/Arrow Silhouette, Purple Brand Color (#863bff), TaskManager Brand Identity

### Community 11 - "Social Icon Sprite"
Cohesion: 0.67
Nodes (7): Bluesky Icon Symbol, Discord Icon Symbol, Documentation Icon Symbol, GitHub Icon Symbol, Icon Sprite Sheet (public/icons.svg), Social (Generic People) Icon Symbol, X (Twitter) Icon Symbol

### Community 12 - "Oxlint Rules Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "API Error Shapes"
Cohesion: 0.67
Nodes (3): Shared error-parsing helper pattern, RFC 7807 ProblemDetails error shape, ASP.NET Core validation error shape

## Ambiguous Edges - Review These
- `Bluesky Icon Symbol` → `Social (Generic People) Icon Symbol`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **123 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+118 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Bluesky Icon Symbol` and `Social (Generic People) Icon Symbol`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `App Screens & Navigation` to `NPM Package Config`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Tooling Dependencies` to `NPM Package Config`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _123 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Screens & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.10685483870967742 - nodes in this community are weakly interconnected._
- **Should `NPM Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `OTP Auth Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.11067193675889328 - nodes in this community are weakly interconnected._