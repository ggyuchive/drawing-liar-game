import { deckName, keywordAt, useLocale, useT } from '../i18n';
import type { CanvasPresence, GameConfig, Round } from '../types';

// Role + keyword come from the server (per-client), NOT the doc — the
// doc withholds them so the liar can't read the keyword. null while the
// fetch is in flight.
export type HudRole = {
  isLiar: boolean;
  keywordDeck: string;
  keywordIndex: number;
};

type Props = {
  round: Round;
  config: GameConfig;
  role: HudRole | null;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
};

export default function RoundHud({ round, config, role, presences }: Props) {
  const t = useT().hud;
  const { locale } = useLocale();
  const shownKeyword =
    role && !role.isLiar && role.keywordDeck
      ? keywordAt(locale.code, role.keywordDeck, role.keywordIndex)
      : '';
  const category =
    role && role.keywordDeck ? deckName(locale.code, role.keywordDeck) : '';
  const drawerId =
    round.playerOrder[round.turnIndex % round.playerOrder.length] ?? '';
  const drawerName =
    presences.find((p) => p.presence.uid === drawerId)?.presence.name ?? '???';
  const total =
    round.playerOrder.length * (round.turnsPerPlayer || config.turnsPerPlayer);
  const turnNumber = Math.min(round.strokesDone + 1, total);

  return (
    <div className="hud">
      <div className="hud__cell hud__cell--keyword">
        {role === null ? (
          <>
            <span className="hud__label">{t.keyword}</span>
            <strong className="hud__keyword">…</strong>
          </>
        ) : role.isLiar ? (
          <>
            <span className="hud__label">{t.yourRole}</span>
            <strong className="hud__liar">
              {t.youAreLiar}
              {category && ` (${t.category}: ${category})`}
            </strong>
          </>
        ) : (
          <>
            <span className="hud__label">{t.keyword}</span>
            <strong className="hud__keyword">
              {shownKeyword}
              {category && ` (${t.category}: ${category})`}
            </strong>
          </>
        )}
      </div>
      <div className="hud__cell">
        <span className="hud__label">{t.drawer}</span>
        <strong>{drawerName}</strong>
      </div>
      <div className="hud__cell">
        <span className="hud__label">{t.turn}</span>
        <strong>
          {turnNumber} / {total}
        </strong>
      </div>
    </div>
  );
}
