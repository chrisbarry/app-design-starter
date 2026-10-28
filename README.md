# App design starter

A sandbox for designing a mobile app as a clickable prototype, and getting feedback on it.

- **Phone preview**: React + TypeScript + Vite with hot reload, styled with Tailwind CSS v4
  and [Konsta UI](https://konstaui.com/react), so screens look native on iOS and Android.
  A toolbar switches platform and light/dark mode.
- **Review layer** ([`src/review-kit`](src/review-kit/README.md)): reviewers sign in with a
  shared password and their name, then pin comments on anything and click any text to
  rewrite it. Everything syncs live through Firestore, and **Copy all** exports every
  comment and edit as Markdown to work through.
- **Hosting**: one command deploys to Firebase Hosting, so reviewers just open a link.

## Start

Needs Node.js 22.12+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173). For a phone on the same Wi-Fi,
run `npm run dev -- --host` and open the Network URL.

Without Firebase settings the prototype runs on its own and the review layer is off.

## Design your app

- `src/screens/StarterScreen.tsx`: the example screens. Replace them with yours.
- `src/index.css`: global styles and design tokens.
- `src/App.tsx` and `src/preview.css`: the workspace around the phone (toolbar, frame).
  These aren't part of your app.

Use Konsta components (`Page`, `Navbar`, `List`, `Button`, …) inside the preview so they
follow the selected platform. Plain Tailwind works too. There's no router or state
library; a `useState` holding the current view is plenty for a prototype.

## Turn on reviews

1. Create a Firebase project at https://console.firebase.google.com, add a **Web app**,
   and create a **Firestore database** (production mode is fine; the rules open just
   what the review layer needs).
2. Install the CLI and connect this folder:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   npm run deploy:rules        # deploys src/review-kit/firestore.rules
   ```
3. `cp .env.example .env.local`, then fill it in with the values from
   `firebase apps:sdkconfig WEB`. Pick a `VITE_REVIEW_PROJECT` name and, optionally,
   a `VITE_REVIEW_PASSWORD`.
4. Restart `npm run dev`. You'll be asked for the password and your name, then get the
   review toolbar on the right.

The password is compiled into the page, so it keeps casual visitors out but isn't real
security. Keep prototype data fictional. See the [review-kit README](src/review-kit/README.md)
for how comments and edits are anchored, and its limits.

## Share it

```bash
npm run deploy
```

Builds and deploys to Firebase Hosting (enable Hosting in the console first). Send
reviewers the `https://<project>.web.app` link it prints.

## Checks

- `npm run typecheck`, `npm run lint`, `npm run build`
