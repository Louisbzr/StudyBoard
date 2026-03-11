# StudyBoard - Product Requirements Document

## Original Problem Statement
Application web full-stack inspirée de Trello pour étudiants: gestion de tâches visuelle avec tableaux, listes, cartes, checklists, dates limites, tags, drag & drop, collaboration temps réel, commentaires, mode sombre.

## Architecture
- **Frontend**: React + TailwindCSS + shadcn/ui + @dnd-kit + framer-motion
- **Backend**: FastAPI + MongoDB (Motor async driver) + WebSocket
- **Auth**: JWT (email/password) + Google OAuth (Emergent Auth)
- **Theme**: Light/Dark mode toggle via next-themes

## User Personas
1. **Étudiant** - Organise cours, projets, révisions
2. **Groupe d'étudiants** - Collaboration sur projets communs

## What's Been Implemented (March 2026)
### Phase 1 - MVP
- [x] Complete backend API (18+ endpoints)
- [x] JWT Auth (register/login) + Google OAuth via Emergent
- [x] Board CRUD with auto-created default lists
- [x] List CRUD with reordering
- [x] Card CRUD with move between lists
- [x] Checklist CRUD (add/toggle/delete items)
- [x] Comments system
- [x] WebSocket real-time updates
- [x] Landing page, Auth page, Dashboard, Board view
- [x] Card detail modal (description, priority, due date, tags, checklists, comments)
- [x] Dark/Light mode toggle
- [x] Responsive design

### Phase 2 - Templates, Stats, Search, Profile
- [x] 5 Board templates (Projet Scolaire, Révisions Examens, Planning Semestre, Sprint Agile, Lecture & Recherche)
- [x] Dashboard statistics (boards, cards, completion rate, overdue, deadlines)
- [x] Global progress bar
- [x] Search bar on board view (filter by title/tag)
- [x] Priority filter on board view
- [x] Profile page with editable name
- [x] Profile stats (boards, cards, checklists, tags, overdue alerts)

## Prioritized Backlog
### P1 (Important)
- Board sharing/collaboration invitations
- Notifications system
- Activity history/feed
### P2 (Nice-to-have)
- File attachments on cards
- Export board data (PDF/CSV)
- Board duplication
- Card labels with custom colors
- Keyboard shortcuts
