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

## Core Requirements (Static)
- Authentification (JWT + Google OAuth)
- CRUD Tableaux, Listes, Cartes
- Drag & Drop entre listes
- Checklists, Dates limites, Tags, Priorités
- Commentaires sur cartes
- Collaboration temps réel (WebSocket)
- Mode sombre/clair

## What's Been Implemented (March 2026)
- [x] Complete backend API (18+ endpoints)
- [x] JWT Auth (register/login) + Google OAuth via Emergent
- [x] Board CRUD with auto-created default lists
- [x] List CRUD with reordering
- [x] Card CRUD with move between lists
- [x] Checklist CRUD (add/toggle/delete items)
- [x] Comments system
- [x] WebSocket real-time updates
- [x] Landing page with hero + features
- [x] Auth page (login/register + Google)
- [x] Dashboard with board grid
- [x] Board view with DnD (@dnd-kit)
- [x] Card detail modal (description, priority, due date, tags, checklists, comments)
- [x] Dark/Light mode toggle
- [x] Responsive design
- [x] All tests passing (100%)

## Prioritized Backlog
### P0 (Critical) - All Done
### P1 (Important)
- User profile management page
- Board sharing/collaboration invitation
- Notifications
### P2 (Nice-to-have)
- Board templates
- Search/filter cards
- Export board data
- Activity history
- File attachments on cards

## Next Tasks
1. Profile management page
2. Board collaboration invitations
3. Card search/filter
4. Notification system
