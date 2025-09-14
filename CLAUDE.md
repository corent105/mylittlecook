# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Little Cook is a collaborative meal planning application built with Next.js 15 and React 19. The project aims to simplify weekly meal planning by allowing users to create collaborative schedules, select or create recipes, and automatically generate consolidated shopping lists.

## Development Commands

- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build production bundle with Turbopack
- `npm run start` - Start production server

The project uses pnpm as the package manager (evidenced by `pnpm-lock.yaml`).

## Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **React**: Version 19
- **TypeScript**: Strict configuration enabled
- **Styling**: TailwindCSS v4 with PostCSS
- **Fonts**: Geist Sans and Geist Mono (Google Fonts)

### Planned Architecture (from PRD)
- **UI Components**: shadcn/ui for modular components
- **Data Fetching**: tRPC with TanStack Query
- **Database**: Prisma ORM with NeonDB (PostgreSQL)
- **Markdown Editor**: For recipe creation and editing
- **Authentication**: Email/password + Google OAuth
- **File Storage**: Cloud storage for images (S3/Supabase)
- **Code Quality**: Biome for linting/formatting

### Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout with font configuration
│   ├── page.tsx      # Home page (currently default Next.js template)
│   └── globals.css   # Global styles with TailwindCSS
```

## Key Features (Planned)

1. **Weekly Meal Planning**: Grid view (days × meals) with clickable slots
2. **Recipe Management**: Markdown-based recipes with live preview editor
3. **Collaborative Projects**: Multi-user meal planning with real-time sync
4. **Shopping List Generation**: Auto-consolidation of ingredients from planned meals
5. **Recipe Import**: URL scraping to import recipes automatically

## Development Notes

- The project is in early stages with only the Next.js template currently implemented
- Uses Turbopack for faster development builds
- TypeScript path mapping configured (`@/*` → `./src/*`)
- Responsive design targeting mobile/tablet/desktop
- French language PRD indicates potential i18n requirements

## Database Schema (Planned)

Key entities:
- `User` - Authentication and user preferences
- `Project` - Collaborative meal planning projects
- `MealPlan` - Weekly schedules linking to recipes
- `Recipe` - Markdown-based recipes with ingredients
- `Ingredient` - Shopping list components

## MVP Scope

Focus on core functionality:
- Weekly planning interface
- Recipe CRUD with Markdown editor
- Basic collaboration features
- Shopping list generation
- API recipe search integration

## Rules
- pour le build : pnpm build
- n'utilise pas d'alert mais des dialog
- 