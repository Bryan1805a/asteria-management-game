# Asteria Space Station Management

Welcome to the **Asteria Station Management Protocol**, an immersive, web-based space station sandbox where you orchestrate the survival and growth of an off-world colony.

## Screenshots
| Main Screen | Login |
|:---:|:---:|
| ![Main Screen](/screenshot/main_menu.png) | ![Login](/screenshot/login_.png) |

## Overview

Asteria Station challenges players to balance crucial life-support systems, manage resource constraints, and oversee construction projects. Every decision costs time and resources, and the station's environment is constantly shifting beneath you! 

Recently upgraded, the platform now features a premium sci-fi aesthetic, real-time feedback elements, and fully persistent player accounts.

---

## Technology Stack

This application is built as a monorepo containing interconnected spaces.

### Frontend (`apps/client`)
- **React & Vite**: Extremely fast and responsive component-driven interface.
- **Tailwind CSS v4**: Utilized for maximum stylistic control, glassmorphism, glowing micro-animations, and custom dark mode themes.
- **TanStack React Query**: Manages caching and asynchronous server state fetching.
- **Lucide React**: Clean, consistent, and beautiful SVG iconography.

### Backend (`apps/server`)
- **Express.js & Node**: Restful API handling the station simulation and interactions.
- **PostgreSQL & Prisma ORM**: Securely map and persist each user's unique game state.
- **JSON Web Tokens (JWT) & bcryptjs**: End-to-end authentication flow to ensure private, siloed save files per commander.
- **Zod**: Robust runtime validation across incoming request bodies.

---

## Getting Started

### Prerequisites
1. **Node.js** (v18+ recommended)
2. **PostgreSQL** running locally (Default port `5432`). Make sure your `.env` connection string within `apps/server` matches your local setup.

### Installation

1. **Clone the repository & install dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   Navigate to the backend and push the Prisma schema to your database.
   ```bash
   cd apps/server
   npx prisma generate
   npx prisma migrate dev --name init
   ```

### Running the Application

1. **Start the Backend Node Server**
   ```bash
   cd apps/server
   npm run dev
   ```
   *(Server defaults to `http://localhost:3001`)*

2. **Start the Frontend Vite Client**
   Open a new terminal window:
   ```bash
   cd apps/client
   npm run dev
   ```
   *(Client defaults to `http://localhost:5173`)*

---

## How to Play

1. **Setup Commander Protocol**: Navigate to the client URL and register a new commander ID.
2. **Review Telemetry**: Once authenticated, the dashboard will display your active resources (Oxygen, Power, Water, Metal, Rock).
3. **Advance Time**: Progress the simulation in hour-blocks. Be careful—running out of oxygen or power will trigger critical system failures!
4. **Queue Operations**: Command drones to mine rock or run refineries to generate advanced resources.

## License & Academic Honesty
This project was developed as a university course project showcasing comprehensive Full Stack capabilities—including database modeling, UI/UX aesthetics, and system architecture.