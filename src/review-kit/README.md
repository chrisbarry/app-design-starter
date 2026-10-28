# review-kit

A small design-review layer for any React site: a password and name gate, pinned
comments with replies, and click-to-edit text. Everything is saved to Firestore
under the reviewer's name and syncs live between everyone looking at the page.

Self-contained: React and `firebase` are the only dependencies. It ships its own
CSS, so it doesn't rely on Tailwind or the host app's styles.

## Using it

Wrap the app (in Next.js, the root `layout.tsx`):

```tsx
import { Review } from "@/review-kit";

<Review
  project="my-app"           // keeps this project's data apart from others
  firebase={FIREBASE_CONFIG} // web config of the Firebase project that stores reviews
  password="letmein"         // optional shared password; leave out to skip it
  title="My app design prototype"
>
  {children}
</Review>
```

Reviewers enter the password, then their name, and get a toolbar on the right:

| Tool | What it does |
| --- | --- |
| Speech bubble (`C`) | Click anything to pin a comment. Click a pin to reply, resolve or delete. |
| Pencil (`E`) | Click any text to rewrite it. The change shows for everyone straight away. |
| Panel | Every comment and edit, "Comment on the whole page", **Copy all** as Markdown, show resolved, show the original text. |
| Question mark | Replay the how-to tour. |
| Initials | Change your name. |
| Chevron | Tuck the toolbar away. |

The first time someone gets in, a short tour walks them through each tool. It's
remembered per browser, and the question mark plays it again.

`Esc` leaves comment or edit mode. While one is on, clicks go to the review tool
and not to the app.

## Adding it to another project

1. Copy this folder into the project.
2. `npm install firebase@12.19.0`
3. In the Firebase project you want to use, create a Firestore database and deploy
   `firestore.rules`. Add `"firestore": { "rules": "<path>/firestore.rules" }` to
   `firebase.json`, then run `firebase deploy --only firestore:rules`.
4. Wrap the app as above with that project's web config (`firebase apps:sdkconfig WEB`).

Several sites can share one Firebase project. Each one just needs its own `project` key.

## How it works

- **Comments** are pinned to an element by a CSS path plus a text fingerprint. A pin
  only shows when that content is on screen, so screens that share a URL in a
  single-page app keep their own pins. Put `data-review-id="..."` on an element to
  give it a pin anchor that survives layout changes.
- **Edits** are matched on the original text, scoped to the URL path. Whenever that
  text renders on that page, it's swapped for the edit, including after re-renders.
  Edits are stored append-only, so every change keeps a history of who made it.
  "Put the original back" adds a reset rather than deleting anything.
- **Copy all** gives the developer a Markdown list of every live edit
  (`"old" → "new"`) and every comment, ready to apply to the source.

Data lives at `review_projects/{project}/comments` and `review_projects/{project}/edits`.

## Limits worth knowing

- The password sits in the page bundle, and Firestore has no sign-in. That keeps
  casual visitors out, but it isn't security. The rules only allow well-formed review
  documents and close the rest of the database. Don't put anything sensitive in
  comments.
- Names aren't verified. "Delete" only shows to the comment's author, but that's a
  courtesy, not a lock.
- Edits change text only. They don't touch images, links or layout. The same string
  on the same page changes everywhere it appears.
