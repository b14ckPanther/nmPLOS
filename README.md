# nmPLOS - Personal Life OS

A full-stack TypeScript-based Personal Life OS Web App built with Next.js 14, Firebase, and AI integration.

## Features

- **Time & Productivity**: Class/work schedules, tasks, projects, exams, homework tracking
- **Finance**: Salary tracking, expenses, bills calendar, budget management, analytics
- **Gmail Integration**: OAuth connection, email filtering, categorization
- **AI Assistant**: Gemini-powered assistant with app navigation capabilities
- **PWA Support**: Installable, offline-capable progressive web app
- **Modern UI**: TailwindCSS, shadcn/ui, Framer Motion animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: TailwindCSS v3.4.4, shadcn/ui, lucide-react, Framer Motion
- **Fonts**: Ubuntu (primary), Cairo (Arabic fallback)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Cloud Storage)
- **Auth**: Email/password + Google provider
- **AI**: Gemini API (LLM + embedding support)
- **State Management**: TanStack Query
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/b14ckPanther/nmPLOS.git
cd nmPLOS
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in your Firebase and Gemini API credentials in `.env.local`.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google)
3. Create a Firestore database
4. Get your Firebase config from Project Settings
5. For server-side operations, create a service account and download the key

## Project Structure

```
nmPLOS/
├── app/
│   ├── (protected)/     # Protected routes
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── finance/
│   │   ├── courses/
│   │   └── ...
│   ├── auth/            # Auth pages
│   ├── api/             # API routes
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn/ui components
│   └── ...
├── firebase/            # Firebase config
├── lib/                 # Utilities
└── public/              # Static assets
```

## Features in Development

- [ ] Full CRUD operations for all modules
- [ ] Gmail OAuth integration
- [ ] Email categorization ML
- [ ] Advanced charts and analytics
- [ ] Study plan generator
- [ ] Habit tracking
- [ ] Calendar view
- [ ] Recurring transactions
- [ ] Budget alerts

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables (see `.env.example`)
4. Deploy!

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

### Firebase Hosting

```bash
npm run build
firebase deploy
```

## Repository

- **GitHub**: https://github.com/b14ckPanther/nmPLOS
- **Live Demo**: Coming soon (after Vercel deployment)

## License

MIT

