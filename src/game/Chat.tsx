import { useEffect, useRef, useState } from 'react';
import { useDocument, type JSONArray, type JSONObject } from '@yorkie-js/react';
import { useT } from '../i18n';
import type {
  CanvasPresence,
  ChatMessage,
  Game,
  Stroke,
} from '../types';
import { generateId } from '../util';

type DocRoot = {
  game: JSONObject<Game>;
  strokes: JSONArray<JSONObject<Stroke>>;
  chat: JSONArray<JSONObject<ChatMessage>>;
};

const CHAT_CAP = 200;

type Props = {
  myActorID: string | null;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  // When true (local actor is the liar during guessing), the typing
  // indicator write is suppressed so others can't infer thinking time.
  suppressTyping: boolean;
};

export default function Chat({ myActorID, presences, suppressTyping }: Props) {
  const { root, update } = useDocument<DocRoot, CanvasPresence>();
  const t = useT().chat;
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = (root.chat ?? []) as unknown as ReadonlyArray<ChatMessage>;

  const colorFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.color ?? 'var(--text)';
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const stopTyping = () => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    update((_root, presence) => {
      if (presence.get('typing')) presence.set({ typing: false });
    });
  };

  const onChange = (value: string) => {
    setText(value);
    if (suppressTyping) return;
    update((_root, presence) => {
      if (!presence.get('typing')) presence.set({ typing: true });
    });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1000);
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || !myActorID) return;
    update((r) => {
      (r.chat as JSONArray<JSONObject<ChatMessage>>).push({
        id: generateId(),
        authorId: myActorID,
        text: trimmed,
        at: Date.now(),
      } as JSONObject<ChatMessage>);
      while (r.chat.length > CHAT_CAP) r.chat.delete?.(0);
    });
    setText('');
    stopTyping();
  };

  // "X is typing…" from other presences flagged typing.
  const typingNames = presences
    .filter((p) => p.presence.uid !== myActorID && p.presence.typing)
    .map((p) => p.presence.name);

  return (
    <aside className="chat">
      <h3 className="chat__title">{t.title}</h3>
      <div className="chat__list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="chat__empty">{t.empty}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="chat__msg">
              <span className="chat__author" style={{ color: colorFor(m.authorId) }}>
                {nameFor(m.authorId)}
              </span>
              <span className="chat__text">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <div className="chat__typing">
        {typingNames.length === 1
          ? t.typing(typingNames[0])
          : typingNames.length > 1
            ? t.typingMany(typingNames.length)
            : ' '}
      </div>
      <div className="chat__row">
        <input
          className="chat__input"
          type="text"
          value={text}
          maxLength={300}
          placeholder={t.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Guard against IME composition: a Korean (etc.) Enter
            // that commits the composition also fires keydown, which
            // would otherwise send the message twice.
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
          }}
          onBlur={stopTyping}
          aria-label={t.title}
        />
        <button className="chat__send" onClick={send} disabled={!text.trim()}>
          {t.send}
        </button>
      </div>
    </aside>
  );
}
