import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

// Firestore layout (rules in ./firestore.rules):
//   review_projects/{project}/comments/{id}  one doc per comment or reply
//   review_projects/{project}/edits/{id}     append-only log of text edits

export type ReviewComment = {
  id: string;
  page: string;
  text: string;
  author: string;
  at: number;
  /** Where the pin sits. An empty selector means a general page comment. */
  selector: string;
  snippet: string;
  fx: number;
  fy: number;
  /** Id of the comment this replies to, or "" for a new thread. */
  replyTo: string;
  resolved: boolean;
  resolvedBy: string;
};

export type ReviewEdit = {
  id: string;
  page: string;
  /** The text as the app renders it, whitespace-collapsed. Also the lookup key. */
  original: string;
  text: string;
  author: string;
  at: number;
};

export type ReviewApi = ReturnType<typeof createApi>;

// A named app, so the kit never clashes with a Firebase app the host project sets up itself
const APP_NAME = "review-kit";

function millis(d: QueryDocumentSnapshot) {
  const at = d.get("at", { serverTimestamps: "estimate" }) as { toMillis(): number } | null;
  return at?.toMillis() ?? Date.now();
}

export function createApi(config: FirebaseOptions, project: string) {
  const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(config, APP_NAME);
  const db = getFirestore(app);
  const comments = collection(db, "review_projects", project, "comments");
  const edits = collection(db, "review_projects", project, "edits");

  return {
    watch(on: {
      comments(list: ReviewComment[]): void;
      edits(list: ReviewEdit[]): void;
      error(message: string): void;
    }) {
      const fail = (e: Error) => on.error(e.message);
      const stopComments = onSnapshot(
        comments,
        (s) => on.comments(s.docs.map((d) => ({ ...(d.data() as ReviewComment), id: d.id, at: millis(d) }))),
        fail,
      );
      const stopEdits = onSnapshot(
        edits,
        (s) => on.edits(s.docs.map((d) => ({ ...(d.data() as ReviewEdit), id: d.id, at: millis(d) }))),
        fail,
      );
      return () => {
        stopComments();
        stopEdits();
      };
    },
    comment(c: Omit<ReviewComment, "id" | "at" | "resolved" | "resolvedBy">) {
      return addDoc(comments, { ...c, at: serverTimestamp(), resolved: false, resolvedBy: "" });
    },
    resolve(id: string, resolved: boolean, by: string) {
      return updateDoc(doc(comments, id), { resolved, resolvedBy: resolved ? by : "" });
    },
    remove(id: string) {
      return deleteDoc(doc(comments, id));
    },
    edit(e: Omit<ReviewEdit, "id" | "at">) {
      return addDoc(edits, { ...e, at: serverTimestamp() });
    },
  };
}

/** The edits that are live right now: the latest per page and text, minus any reset to the original. */
export function liveEdits(all: ReviewEdit[]): ReviewEdit[] {
  const latest = new Map<string, ReviewEdit>();
  for (const e of [...all].sort((a, b) => a.at - b.at)) latest.set(`${e.page}\u0000${e.original}`, e);
  return [...latest.values()].filter((e) => e.text !== e.original);
}
