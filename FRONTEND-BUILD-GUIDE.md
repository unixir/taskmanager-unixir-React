# TaskManagement API — Frontend Build Guide

This document is written for an agent (or developer) building the React + TypeScript Kanban frontend against this existing backend. It describes authentication, every endpoint, every request/response schema, error shape, and the UI flows the API was designed to support (Phase 10 of the project plan).

The backend is complete, tested (27/27 automated tests passing), and deployed. Nothing here requires backend changes to build a working frontend — treat this API surface as stable.

---

## 1. Base setup

- **Base URL:** read from an environment variable (e.g. `VITE_API_BASE_URL`). Locally this is typically `http://localhost:5156`; in production it is the deployed Azure URL (e.g. `https://<app-name>.azurewebsites.net`).
- **Content type:** all requests/responses are `application/json` unless noted.
- **Auth header:** after sign-in/verification, attach the JWT to every protected request:
  ```
  Authorization: Bearer <token>
  ```
- **Swagger:** `/swagger` on the running API is the live, authoritative source of truth if anything here goes stale — use it to double check request/response shapes with the "Authorize" button (bearer token).
- **CORS:** the API allows one configured origin (`AllowedOrigins` config value, defaults to `http://localhost:5173`). When deploying the frontend, the API's CORS origin must be updated to the real frontend URL or requests will be blocked by the browser.

---

## 2. Authentication flow (build these screens first)

Auth is NOT simple email+password sign-in-only — it is signup with **mandatory email OTP verification** before a JWT is issued. Design the frontend routes around this:

```
/signup           -> collect Name, Email, Password, Age
/verify-otp       -> collect 6-digit code (arrives at the given email via Brevo)
/signin           -> email + password (blocked until verified)
/forgot-password  -> collect email, request a reset code
/reset-password   -> collect email + 6-digit code + new password
/boards           -> authenticated landing page
/boards/:id    -> Kanban board detail
```

### 2.1 `POST /signup`
Creates the user but does **not** log them in yet.

Request body (`CreateUserDTO`):
```json
{
  "name": "Jane Doe",        // required, 3-30 chars
  "email": "jane@x.com",     // required, 3-30 chars (note: short max length!)
  "password": "Secret123",   // required, 6-30 chars
  "age": 25,                 // required, 16-100
  "role": null                // optional, leave null/omit — server always assigns "User"
}
```
Response `201 Created` (`SignupResponse`):
```json
{ "userId": 10, "email": "jane@x.com", "message": "Check your email for the verification code." }
```
No token is returned here. Show a "check your email" screen and route to `/verify-otp`, carrying the email forward (e.g. via router state or query param).

**Important validation quirk:** `Email` has a 30-character max length. Warn/validate this client-side so users don't submit long emails that fail with a 400.

### 2.2 `POST /signup/verify-otp`
Request body (`VerifyOtpRequest`):
```json
{ "email": "jane@x.com", "code": "123456" }  // code must be exactly 6 digits
```
Response `200 OK` (`SignInDTO`):
```json
{ "accessToken": "<jwt>", "tokenType": "Bearer" }
```
Store the JWT (memory + localStorage) and redirect to `/boards`. This is the point verification completes and the account becomes usable.

Failure cases return `400` with a `ProblemDetails` body (see section 5) for: wrong code, expired code (10-minute TTL), already-consumed code.

### 2.3 `POST /signup/resend-otp`
Request body (`ResendOtpRequest`):
```json
{ "email": "jane@x.com" }
```
Response `200 OK`: `{ "message": "A new verification code has been sent." }`

Rate-limited to one resend per 60 seconds per user server-side. Implement a client-side cooldown timer on the resend button (60s) to match, and surface the server's error message if the user still manages to trigger it early.

### 2.4 `POST /signin`
Request body (`GenerateTokenDTO`):
```json
{ "email": "jane@x.com", "password": "Secret123" }
```
Response `200 OK` (`SignInDTO`): same shape as verify-otp above — `{ "accessToken": "...", "tokenType": "Bearer" }`.

Failure cases:
- `401 Unauthorized` with `{ "message": "Invalid email or password." }` — wrong credentials.
- `400 Bad Request` (ProblemDetails) with detail `"Please verify your email before signing in."` — account exists but is not yet OTP-verified. **Handle this specifically**: redirect the user back to `/verify-otp` (with a resend option) instead of just showing a generic error.

### 2.5 Forgot password (`ForgotPasswordController`)

Uses the same OTP mechanism as signup verification, but codes are purpose-scoped server-side — a signup code and a reset code for the same user are never interchangeable, so you don't need to worry about that on the frontend.

**`POST /ForgotPassword`** — request a reset code.
```json
{ "email": "jane@x.com" }
```
Response `200 OK` (always, regardless of whether the email exists — this is intentional, to avoid leaking which emails have accounts):
```json
{ "message": "If an account with that email exists, a password reset code has been sent." }
```
**Important:** never infer "email exists" or "email doesn't exist" from this response — it's identical either way. Just show a generic "check your email" screen and move to `/reset-password`.

**`POST /ForgotPassword/resend-otp`** — resend a reset code.
```json
{ "email": "jane@x.com" }
```
Response `200 OK`: `{ "message": "If an account with that email exists, a new reset code has been sent." }` (same enumeration-safe behavior as above). Rate-limited to one resend per 60 seconds per user; on early retry you'll get a `400` (ProblemDetails) with detail `"Please wait at least 60 seconds before requesting another code."` — implement the same 60s client-side cooldown pattern as `/signup/resend-otp`.

**`POST /ForgotPassword/reset`** — submit the code + new password.
```json
{
  "email": "jane@x.com",
  "code": "123456",       // exactly 6 digits
  "newPassword": "NewSecret123"  // required, 6-30 chars
}
```
Response `200 OK`: `{ "message": "Your password has been reset. You can now sign in." }`. No token is returned — redirect to `/signin` after showing a success message.

Failure case: `400 Bad Request` (ProblemDetails) with detail `"The reset code is invalid or expired."` — this single generic message covers wrong code, expired code (10-minute TTL), already-consumed code, **and unknown email**, all deliberately, again to avoid enumeration. Show it as a plain form error; don't try to distinguish sub-cases.

### 2.6 Global 401 handling
Any authenticated request that comes back `401` (expired/invalid/tampered token) should clear the stored token and redirect to `/signin`. Implement this once, centrally, in your API client's response interceptor — don't handle it per-call.

---

## 3. User endpoints

All require `Authorize` bearer header.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/user/profile` | Current authenticated user's profile |
| `GET` | `/api/user/{id}` | Any user's public profile by ID (used to resolve names for members/assignees) |

Response (`UserProfileDTO`) for both:
```json
{ "id": 10, "name": "Jane Doe", "emailAddress": "jane@x.com", "age": 25, "role": "User" }
```
`role` is a string, currently always `"User"` for new signups (roles infra exists but no admin-only screens are expected yet).

---

## 4. Boards

Route prefix: `api/board`. All require bearer auth.

### 4.1 `POST /api/board` — create board
Request (`CreateBoardDTO`):
```json
{ "title": "Sprint 12", "description": "Optional, up to 500 chars" }
```
Title required, 3-100 chars. `description` optional/nullable.
Response `201 Created` — full `BoardDetailDTO` (see 4.4).

### 4.2 `GET /api/board/{id}` — board detail
Returns `BoardDetailDTO` (section 4.4) with the board's owner, tasks, and members embedded — this is the single call to render the whole Kanban board detail screen.

Access rule: only the board's owner or an existing member may view it.
- `403 Forbidden` if the board exists but the caller has no access.
- `404 Not Found` if the board doesn't exist at all.

### 4.3 `GET /api/board/user/boards?page=1&pageSize=20` — boards list (for `/boards`)
Query params: `page` (default 1), `pageSize` (default 20, clamped 1-100 server-side).
Response is `PagedResult<BoardDetailDTO>` (section 4.5) — every board the current user owns or is a member of.

Note this returns the *full* `BoardDetailDTO` per board (including nested tasks/members), not a lightweight summary — plan your boards-list UI/data usage accordingly (it's heavier than a typical "list" endpoint, but avoids a second round trip if you want to show task counts on the list page).

### 4.4 `PUT /api/board/{id}` — update board (owner only)
Request (`UpdateBoardDTO`): same shape as create (`title`, `description`).
`403` if the caller is not the owner.

### 4.5 `DELETE /api/board/{id}` — delete board (owner only)
Response `204 No Content`. `403` if not owner. Cascades to delete the board's tasks and memberships.

### 4.6 `BoardDetailDTO` (also embedded in list results)
```json
{
  "id": 1,
  "title": "Sprint 12",
  "description": "string or null",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z",
  "ownerId": 10,
  "ownerName": "Jane Doe",
  "tasks": [ /* TodoItemDetailDTO[], see section 5.5 */ ],
  "members": [ /* BoardMemberDTO[], see section 6.3 */ ]
}
```

### 4.7 `PagedResult<T>` envelope shape (used by boards list and task list)
```json
{
  "items": [ /* T[] */ ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 42,
  "totalPages": 3
}
```

---

## 5. Todo items (tasks) and assignments

Route prefix: `api/todoitem`. All require bearer auth.

### 5.1 `POST /api/todoitem` — create task
Request (`CreateTodoItemDTO`):
```json
{
  "title": "Fix login bug",     // required, 3-200 chars
  "description": "optional, up to 1000 chars",
  "boardId": 1,                    // required
  "priority": 1,                    // optional, TaskPriority enum, default 1 (Medium)
  "dueDate": "2026-01-15T00:00:00Z" // optional
}
```
Response `201 Created` — `TodoItemDetailDTO` (5.5). New tasks always start in `Status: 0` (Todo).

### 5.2 `GET /api/todoitem/{id}` — task detail
Returns `TodoItemDetailDTO` with its assignments embedded. `403`/`404` follow the same owner-or-member access rule as boards.

### 5.3 `GET /api/todoitem/board/{boardId}?page=1&pageSize=20` — tasks for a board
Returns `PagedResult<TodoItemDetailDTO>`. **This is the endpoint that powers the three Kanban columns** — fetch all tasks for the board and bucket them client-side by `status` (0/1/2) into Todo / In Progress / Done columns. There is no separate per-status endpoint.

If you need every task on the board (not just one page) for the drag-and-drop board view, request a large `pageSize` (up to the server's clamp of 100) or paginate and merge; there is no "get all" flag.

### 5.4 `PUT /api/todoitem/{id}` — update task (also used for drag-and-drop status change)
Request (`UpdateTodoItemDTO`) — **this is a full replace, not a patch**; send all fields every time, including ones you didn't change:
```json
{
  "title": "Fix login bug",
  "description": "optional",
  "status": 1,        // TaskStatus enum: 0=Todo, 1=InProgress, 2=Done
  "priority": 2,       // TaskPriority enum: 0=Low, 1=Medium, 2=High
  "dueDate": "2026-01-15T00:00:00Z"
}
```
When the user drags a card to a new column, call this endpoint with the task's existing title/description/priority/dueDate unchanged and only `status` updated to match the new column. Members may edit tasks (status/title/description/due date); only the owner may delete.

### 5.5 `DELETE /api/todoitem/{id}` — delete task (owner only)
`204 No Content` on success, `403` if caller is a member (not owner).

### 5.6 `TodoItemDetailDTO` shape
```json
{
  "id": 5,
  "title": "Fix login bug",
  "description": "string or null",
  "status": 0,            // 0=Todo, 1=InProgress, 2=Done
  "priority": 1,           // 0=Low, 1=Medium, 2=High
  "dueDate": "2026-01-15T00:00:00Z or null",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z",
  "boardId": 1,
  "assignments": [ /* TaskAssignmentDTO[] */ ]
}
```

### 5.7 Task assignments

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/todoitem/assign` | Assign a user to a task |
| `GET` | `/api/todoitem/{todoItemId}/assignments` | List assignments for a task |
| `DELETE` | `/api/todoitem/{todoItemId}/assignments/{assignedToUserId}` | Remove an assignment |

`POST /api/todoitem/assign` request (`AssignTaskDTO`):
```json
{ "todoItemId": 5, "assignedToUserId": 12 }
```
Response `201 Created` — `TaskAssignmentDTO`:
```json
{ "id": 3, "todoItemId": 5, "assignedToUserId": 12, "assignedToUserName": "Bob", "assignedAt": "2026-01-01T00:00:00Z" }
```
Business rule enforced server-side: the assignee must already be a board member or the board owner — assigning a non-member returns a clear `400` error. When building an "assign to" dropdown, populate its options from the board's `members` list (plus the owner) rather than an arbitrary user search, to avoid hitting this validation.

Only the board owner can assign/remove assignments currently (simplest rule the backend enforces) — hide/disable assignment controls for non-owner members in the UI, since their calls would be rejected with `403` anyway.

---

## 6. Board members

Route prefix: `api/boardmember`. All require bearer auth.

### 6.1 `POST /api/boardmember` — add a member (owner only)
Request (`AddBoardMemberRequest`):
```json
{ "boardId": 1, "newMemberId": 12 }
```
Response `201 Created` — `BoardMemberDTO`. `409 Conflict` if that user is already a member (duplicate membership is rejected cleanly, not a raw DB error).

There is no "search users by email" endpoint yet — to add a member, the UI needs the target user's numeric ID (e.g. collect it from a shared "your user ID" screen on the profile page, or add a lightweight lookup later). Flag this as a known gap when building the "add member" UI; a reasonable interim UX is a text field for user ID with the profile page (`GET /api/user/profile`) shown to the current user so they know their own ID to share.

### 6.2 `GET /api/boardmember/{id}` — one membership record by its own ID
### 6.3 `GET /api/boardmember/board/{boardId}` — all members of a board
Returns `BoardMemberDTO[]` (not paginated):
```json
[
  { "id": 2, "boardId": 1, "userId": 12, "userName": "Bob", "userEmail": "bob@x.com", "joinedAt": "2026-01-01T00:00:00Z" }
]
```
Note: the board **owner is not included** in this members list (owners are implicit members, not a `BoardMembers` row) — always render the owner separately using `BoardDetailDTO.ownerId` / `ownerName` alongside this members list.

### 6.4 `DELETE /api/boardmember?boardId={boardId}&memberId={memberId}` — remove a member (owner only)
Query-string params, not a body. `204 No Content` on success. Owners cannot remove themselves this way (they'd need to delete the board instead) — disable/hide the "remove" control for the owner's own row if it's ever rendered in the members list.

---

## 7. Enums reference (used as raw integers over the wire)

```ts
enum TaskStatus { Todo = 0, InProgress = 1, Done = 2 }
enum TaskPriority { Low = 0, Medium = 1, High = 2 }
```
Define these exactly in the frontend and map them to column names / badge colors — do not rely on string values, the API serializes them as numbers by default.

---

## 8. Error response shape

Non-2xx responses are RFC 7807 `application/problem+json`:
```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Human-readable message safe to show the user",
  "instance": "/signin"
}
```
Validation errors (from `[Required]`/`[MaxLength]` etc. DTO annotations) instead return ASP.NET Core's built-in shape:
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "Email": ["The field Email must be a string or array type with a maximum length of '30'."] },
  "traceId": "..."
}
```
Build one shared error-parsing helper that checks for `errors` (field-level validation dict) first, falling back to `detail` (single message), so both shapes render sensibly in forms/toasts. Status codes to design UI around: `400` (validation/business rule), `401` (auth), `403` (forbidden — show "you don't have access", not a generic error), `404` (not found), `409` (conflict, e.g. duplicate membership/assignment).

---

## 9. Suggested screen-to-endpoint map

| Screen | Endpoint(s) |
|---|---|
| Sign up | `POST /signup` |
| Verify OTP | `POST /signup/verify-otp`, `POST /signup/resend-otp` |
| Sign in | `POST /signin` |
| Forgot password | `POST /ForgotPassword`, `POST /ForgotPassword/resend-otp`, `POST /ForgotPassword/reset` |
| Boards list | `GET /api/board/user/boards`, `POST /api/board` (create modal) |
| Board detail (Kanban) | `GET /api/board/{id}`, `GET /api/todoitem/board/{boardId}`, `PUT /api/todoitem/{id}` (drag/drop + edits), `POST /api/todoitem`, `DELETE /api/todoitem/{id}` |
| Board settings / delete | `PUT /api/board/{id}`, `DELETE /api/board/{id}` |
| Members panel | `GET /api/boardmember/board/{boardId}`, `POST /api/boardmember`, `DELETE /api/boardmember` |
| Assign task | `GET /api/boardmember/board/{boardId}` (populate dropdown), `POST /api/todoitem/assign`, `DELETE /api/todoitem/{id}/assignments/{userId}` |
| Own profile | `GET /api/user/profile` |

---

## 10. Known backend gaps to design around

- No "search user by email" endpoint — adding a board member currently requires knowing the target's numeric user ID.
- Board/task list endpoints return full nested DTOs, not lightweight summaries — fine for this app's scale, just don't expect a "light" list payload.
- First request after backend idle (cold start on lower App Service tiers) can take 10-30 seconds — show a loading/cold-start message rather than letting it look broken.
- CORS origin is a single configured value — confirm with whoever manages the backend that your frontend's deployed URL has been added before going live.
