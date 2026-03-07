# Remaining Tasks

## 1. Authentication and Session
- [x] Add E2E coverage for login, session persistence, logout, and protected-route redirects.
- [x] Improve login/session failure UX in [frontend/src/app/login/page.tsx](/mnt/c/pdSystemAI/frontend/src/app/login/page.tsx).
- [x] Add regression coverage for the frontend API proxy in [frontend/src/app/api/[...path]/route.ts](/mnt/c/pdSystemAI/frontend/src/app/api/[...path]/route.ts).
- [x] Verify [frontend/src/proxy.ts](/mnt/c/pdSystemAI/frontend/src/proxy.ts) bypasses only public routes and static assets.

## 2. Notification UX
- [x] Integrate header notifications with user `notifications` instead of project `alerts`.
- [x] Remove the broken `/alerts` shortcut from the header dropdown flow.
- [x] Add a real global notifications page or make all notification shortcuts project-scoped.
- [x] Verify read, read-all, and unread count behavior from the UI.

## 3. Settings Navigation
- [x] Decide whether `/settings` exists as a real page or should be removed from navigation.
- [x] Add a settings index page if the route will stay.
- [x] Clarify the boundary between project notification settings and global settings.

## 4. Project Member Management UI
- [x] Add a project members page.
- [x] Add member invite/add UI.
- [x] Add member role update UI.
- [x] Add member removal UI.
- [x] Add React Query hooks for project member APIs.

## 5. Alert vs Notification Domain Cleanup
- [x] Document which screens use project `alerts` and which use user `notifications`.
- [x] Align header, project detail, and alert pages to one clear model per screen.

## 6. Security and Ops
- [x] Implement login rate limiting.
- [x] Implement general API rate limiting.
- [x] Align 429 handling and docs with the actual behavior.
- [ ] Decide whether JWT signing should stay symmetric or move to the RS256 design in the legacy spec.

## 7. Dev Environment
- [x] Remove the Next.js workspace root warning in the frontend config.
- [x] Document team guidance for `start`, `start:dev`, and `start:watch`.
- [x] Add a short troubleshooting note for stale backend builds and auth/session failures.
