# CFV Tracker MY

Cardfight!! Vanguard Card Tracker for Malaysian Players.

Track your cards, find trades, and connect with the community.

## Features

- **Card Database** - Browse CFV Standard cards with Japanese + English text and errata history
- **Collection Tracker** - Track quantities, mark cards for trade, export to JSON
- **Wishlist** - Prioritize cards you want (high/medium/low)
- **Trading Hub** - Auto-matching algorithm finds trade partners based on your collection and wishlist
- **Real-time Chat** - Message trade partners directly in the app
- **User Profiles** - Reputation system, trade history, custom bio
- **Admin Panel** - Card management, bulk import, user roles, dispute resolution
- **Dark Mode** - System preference detection + manual toggle
- **Mobile Friendly** - Responsive design works on all screen sizes

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Firebase (Auth, Firestore, Realtime Database)
- GitHub Pages

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Firebase config
3. `npm install`
4. `npm run dev`

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions.
Firebase config is injected from repository secrets at build time.
