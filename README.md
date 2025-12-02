# Disclaimer
This project was built with extensive help from GitHub Copilot.

# Paws & Preferences

Paws & Preferences is a swipe-style single-page app that helps users discover which cats they like by browsing a curated deck of photos from [Cataas](https://cataas.com).

## Features

- **Mobile-friendly swipe deck** – Swipe right to “Love it” or left to “Skip,” with touch and mouse gestures powered by `react-swipeable`.
- **Prefetch & caching** – Images are fetched, cached, and shimmered in to minimize blank states while still letting the deck feel responsive.
- **Progress tracker** – Displays current card index, total cats, and liked count so users always know where they are in the flow.
- **Animated feedback** – Cards show like/dislike indicators and stack styling to mirror modern dating apps.
- **Session summary** – After the deck ends, users see a gallery of every cat they loved plus quick stats and a “Start again” button.
- **Graceful loading states** – “Summoning cats” screen plus in-card skeletons keep the UI polished even on slow networks.
- **Resettable experience** – Users can refresh the entire deck for another pass without leaving the page.

## Tech Stack

- **Vite + React + TypeScript** – Fast HMR dev loop and type safety.
- **react-swipeable** – Uniform swipe gestures across mouse and touch.
- **CSS custom styling** – Fully custom layout, gradients, and animations without external UI kits.

## Project Structure

```
src/
├─ App.tsx        # Main UI + state management, swipe logic, image cache
├─ App.css        # Component-level styling, animations, skeletons
└─ main.tsx       # React entry point
```

## Getting Started

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open the forwarded URL (or run `"$BROWSER" http://localhost:5173`).  
For a production build:

```bash
npm run build
npm run preview
```

## Key Implementation Details

- **Image pool** – Cataas IDs are generated up front, fetched via `fetch -> Blob -> Object URL`, and recycled when the deck resets.
- **Progressive readiness** – The UI becomes interactive once the first *n* cats finish downloading; slower images continue fetching in the background.
- **Accessibility** – Buttons include focus styles, gesture alternatives, and text labels to support keyboard use.
- **State machine** – The app cycles through `loading → browsing → summary`, tracked via derived booleans to keep rendering logic predictable.
