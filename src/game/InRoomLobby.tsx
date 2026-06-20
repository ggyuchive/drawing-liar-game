import { useEffect, useState, type KeyboardEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useT } from '../i18n';
import type { GameConfig, CanvasPresence } from '../types';

const MIN_PLAYERS = 3;

type Props = {
  isHost: boolean;
  config: GameConfig;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  room: string;
  hostId: string;
  onConfigChange: (next: Partial<GameConfig>) => void;
  onRequestTransferHost: (uid: string) => void;
  onStart: () => void;
};

export default function InRoomLobby({
  isHost,
  config,
  presences,
  room,
  hostId,
  onConfigChange,
  onRequestTransferHost,
  onStart,
}: Props) {
  const tHost = useT().hostMode;
  const t = useT().inRoomLobby;
  const closeLabel = useT().howTo.close;
  // Which mode axis has its "?" explanation popup open (null = closed).
  const [helpOpen, setHelpOpen] = useState<'game' | 'draw' | 'kr' | null>(
    null,
  );
  // Resolve the open axis to a modal title + its option explanations.
  const help =
    helpOpen === 'game'
      ? { title: t.gameMode, rows: t.gameModeHelp }
      : helpOpen === 'draw'
        ? { title: t.drawMode, rows: t.drawModeHelp }
        : helpOpen === 'kr'
          ? { title: t.krCategories, rows: t.krCategoriesHelp }
          : null;
  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setHelpOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);
  // One-device: host device is the shared screen, excluded from the
  // roster and min-player count.
  const hostMode = config.drawMode === 'host';
  const isDisplay = isHost && hostMode;
  const players = presences.filter(
    (p) =>
      !p.presence.spectator && !(hostMode && p.presence.uid === hostId),
  );
  const spectatorCount = presences.filter(
    (p) => p.presence.spectator,
  ).length;
  const ready = players.length >= MIN_PLAYERS;
  // Hand-off only in each-device mode (in one-device, host IS the screen).
  const canTransfer = isHost && !hostMode;
  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#room=${room}`
      : '';

  return (
    <div className="lobbyIn">
      <h2 className="lobbyIn__title">{t.title}</h2>

      <ul className="lobbyIn__roster">
        {players.map(({ clientID, presence }) => {
          const isHostItem = presence.uid === hostId;
          const clickable = canTransfer && !isHostItem;
          return (
            <li
              key={clientID}
              className={
                'lobbyIn__rosterItem' +
                (clickable ? ' lobbyIn__rosterItem--btn' : '')
              }
              style={{ borderColor: presence.color }}
              {...(clickable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => onRequestTransferHost(presence.uid),
                    onKeyDown: (e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRequestTransferHost(presence.uid);
                      }
                    },
                  }
                : {})}
            >
              <span
                className="lobbyIn__rosterDot"
                style={{ background: presence.color }}
              />
              {presence.name}
              {isHostItem && (
                <span className="lobbyIn__hostBadge">{t.hostBadge}</span>
              )}
            </li>
          );
        })}
      </ul>
      {spectatorCount > 0 && (
        <p className="lobbyIn__spectators">
          👁 {t.spectatorsLabel(spectatorCount)}
        </p>
      )}

      {/* One-device mode: the shared screen leads with a big scan-to-join
          QR — it's the main thing players act on, so it gets its own
          prominent section rather than being tucked into the settings. */}
      {isDisplay && (
        <section className="lobbyIn__qr">
          <p className="lobbyIn__qrNote">{tHost.lobbyScreenNote}</p>
          <div className="lobbyIn__qrCode">
            <QRCodeSVG value={joinUrl} size={320} marginSize={2} />
          </div>
          <p className="lobbyIn__qrCaption">{tHost.scanToJoin}</p>
        </section>
      )}

      {isHost ? (
        <div className="lobbyIn__hostBox">
          <div className="lobbyIn__configRow">
            <label className="lobbyIn__configCell">
              {t.rounds}
              <input
                type="number"
                min={1}
                max={10}
                value={config.totalRounds}
                onChange={(e) =>
                  onConfigChange({
                    totalRounds: Math.min(
                      10,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </label>
            <label className="lobbyIn__configCell">
              {t.turnsPerPlayer}
              <input
                type="number"
                min={1}
                max={5}
                value={config.turnsPerPlayer}
                onChange={(e) =>
                  onConfigChange({
                    turnsPerPlayer: Math.min(
                      5,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </label>
          </div>
          <div className="lobbyIn__modeBlock">
            <div
              className="lobbyIn__modeRow"
              role="radiogroup"
              aria-label={t.gameMode}
            >
              <button
                type="button"
                className={
                  'lobbyIn__help' +
                  (helpOpen === 'game' ? ' lobbyIn__help--on' : '')
                }
                aria-label={t.helpLabel}
                aria-expanded={helpOpen === 'game'}
                onClick={() =>
                  setHelpOpen(helpOpen === 'game' ? null : 'game')
                }
              >
                ?
              </button>
              <span className="lobbyIn__modeLabel">{t.gameMode}</span>
              <div className="lobbyIn__modeBtns">
                {(['classic', 'fool'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={config.gameMode === m}
                    className={
                      'lobbyIn__mode' +
                      (config.gameMode === m ? ' lobbyIn__mode--on' : '')
                    }
                    onClick={() => onConfigChange({ gameMode: m })}
                  >
                    {m === 'classic' ? t.modeClassic : t.modeFool}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lobbyIn__modeBlock">
            <div
              className="lobbyIn__modeRow"
              role="radiogroup"
              aria-label={t.drawMode}
            >
              <button
                type="button"
                className={
                  'lobbyIn__help' +
                  (helpOpen === 'draw' ? ' lobbyIn__help--on' : '')
                }
                aria-label={t.helpLabel}
                aria-expanded={helpOpen === 'draw'}
                onClick={() =>
                  setHelpOpen(helpOpen === 'draw' ? null : 'draw')
                }
              >
                ?
              </button>
              <span className="lobbyIn__modeLabel">{t.drawMode}</span>
              <div className="lobbyIn__modeBtns">
                {(['each', 'host'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={config.drawMode === m}
                    className={
                      'lobbyIn__mode' +
                      (config.drawMode === m ? ' lobbyIn__mode--on' : '')
                    }
                    onClick={() => onConfigChange({ drawMode: m })}
                  >
                    {m === 'each' ? t.drawEach : t.drawHost}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lobbyIn__modeBlock">
            <div
              className="lobbyIn__modeRow"
              role="radiogroup"
              aria-label={t.krCategories}
            >
              <button
                type="button"
                className={
                  'lobbyIn__help' +
                  (helpOpen === 'kr' ? ' lobbyIn__help--on' : '')
                }
                aria-label={t.helpLabel}
                aria-expanded={helpOpen === 'kr'}
                onClick={() => setHelpOpen(helpOpen === 'kr' ? null : 'kr')}
              >
                ?
              </button>
              <span className="lobbyIn__modeLabel">{t.krCategories}</span>
              <div className="lobbyIn__modeBtns">
                {([false, true] as const).map((on) => (
                  <button
                    key={String(on)}
                    type="button"
                    role="radio"
                    aria-checked={config.krCategories === on}
                    className={
                      'lobbyIn__mode' +
                      (config.krCategories === on ? ' lobbyIn__mode--on' : '')
                    }
                    onClick={() => onConfigChange({ krCategories: on })}
                  >
                    {on ? t.krOn : t.krOff}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* No keyword-language or category pickers: each player sees
              the keyword in their OWN language (top-bar language switch),
              and the category is chosen server-side, hidden from the liar. */}
          <button
            className="lobbyIn__start"
            onClick={onStart}
            disabled={!ready}
          >
            {ready
              ? t.startGame
              : t.needMorePlayers(MIN_PLAYERS - players.length)}
          </button>
        </div>
      ) : (
        // Non-hosts: read-only view synced live through the document.
        <div className="lobbyIn__settings">
          <dl className="lobbyIn__settingsGrid">
            <div className="lobbyIn__setting">
              <dt>{t.rounds}</dt>
              <dd>{config.totalRounds}</dd>
            </div>
            <div className="lobbyIn__setting">
              <dt>{t.turnsPerPlayer}</dt>
              <dd>{config.turnsPerPlayer}</dd>
            </div>
            <div className="lobbyIn__setting">
              <dt>{t.gameMode}</dt>
              <dd>
                {config.gameMode === 'fool' ? t.modeFool : t.modeClassic}
              </dd>
            </div>
            <div className="lobbyIn__setting">
              <dt>{t.drawMode}</dt>
              <dd>{config.drawMode === 'host' ? t.drawHost : t.drawEach}</dd>
            </div>
            <div className="lobbyIn__setting">
              <dt>{t.krCategories}</dt>
              <dd>{config.krCategories ? t.krOn : t.krOff}</dd>
            </div>
          </dl>
          <p className="lobbyIn__waiting">{t.waiting}</p>
        </div>
      )}

      {help && (
        <div
          className="howto__backdrop"
          onClick={() => setHelpOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={help.title}
        >
          <div
            className="howto__card lobbyIn__helpCard"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="howto__title">{help.title}</h2>
            <ul className="lobbyIn__modeHelp">
              {help.rows.map((h) => (
                <li key={h.name}>
                  <strong>{h.name}</strong>
                  <span>{h.desc}</span>
                </li>
              ))}
            </ul>
            <button
              className="howto__close"
              onClick={() => setHelpOpen(null)}
              autoFocus
            >
              {closeLabel}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
