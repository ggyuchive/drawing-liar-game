import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocument } from '@yorkie-js/react';
import { useT } from '../i18n';
import type { CanvasPresence, ChatMessage } from '../types';
import type { DocRoot } from '../Room';

type Props = {
  myActorID: string;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
};

type Toast = {
  key: string;
  kind: 'join' | 'left' | 'msg';
  author?: string;
  color: string;
  text: string;
};

const TOAST_MS = 4000;
const MAX_VISIBLE = 5;

// Self-removing toast — self-contained so a new message never cancels an
// existing toast's timer.
function ChatToastItem({
  toast,
  onDone,
}: {
  toast: Toast;
  onDone: (key: string) => void;
}) {
  useEffect(() => {
    const id = setTimeout(() => onDone(toast.key), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast.key, onDone]);

  return (
    <div className={`chatToast chatToast--${toast.kind}`}>
      {toast.kind === 'msg' ? (
        <>
          <span className="chatToast__author" style={{ color: toast.color }}>
            {toast.author}
          </span>
          <span className="chatToast__text">{toast.text}</span>
        </>
      ) : (
        <span className="chatToast__sys">{toast.text}</span>
      )}
    </div>
  );
}

// Floating, auto-dismissing toasts for chat + join/left, shown whether or
// not the panel is open. Each fades on its own timer.
export default function ChatToasts({ myActorID, presences }: Props) {
  const { root } = useDocument<DocRoot, CanvasPresence>();
  const t = useT().chat;
  const [toasts, setToasts] = useState<Toast[]>([]);

  const nameFor = (uid: string) =>
    presences.find((p) => p.presence.uid === uid)?.presence.name ?? '???';
  const colorFor = (uid: string) =>
    presences.find((p) => p.presence.uid === uid)?.presence.color ??
    'var(--text-soft)';
  const myName = nameFor(myActorID);

  const removeToast = useCallback((key: string) => {
    setToasts((prev) => prev.filter((x) => x.key !== key));
  }, []);

  // Toast only entries arriving after mount (seed with existing ids so
  // history isn't replayed). null until first observation.
  const seenRef = useRef<Set<string> | null>(null);
  const items = (root.chat ?? []) as unknown as ReadonlyArray<ChatMessage>;
  const chatSig = items.map((m) => m.id).join('|');

  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(items.map((m) => m.id));
      return;
    }
    const seen = seenRef.current;
    const fresh = items.filter((m) => !seen.has(m.id));
    if (fresh.length === 0) return;
    for (const m of fresh) seen.add(m.id);

    const next: Toast[] = [];
    for (const m of fresh) {
      if (m.system) {
        // Skip my own join/left (names are unique, so this is reliable).
        if (m.text === myName) continue;
        next.push({
          key: m.id,
          kind: m.system,
          color: 'var(--text-soft)',
          text: m.system === 'join' ? t.joined(m.text) : t.left(m.text),
        });
      } else {
        // Skip messages I just sent myself.
        if (m.authorId === myActorID) continue;
        next.push({
          key: m.id,
          kind: 'msg',
          author: nameFor(m.authorId),
          color: colorFor(m.authorId),
          text: m.text,
        });
      }
    }
    if (next.length === 0) return;

    // Deferred: no synchronous setState in the effect body.
    const addId = setTimeout(() => {
      setToasts((prev) => [...prev, ...next].slice(-MAX_VISIBLE));
    }, 0);
    return () => clearTimeout(addId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSig]);

  if (toasts.length === 0) return null;

  return (
    <div className="chatToasts" aria-live="polite">
      {toasts.map((toast) => (
        <ChatToastItem key={toast.key} toast={toast} onDone={removeToast} />
      ))}
    </div>
  );
}
