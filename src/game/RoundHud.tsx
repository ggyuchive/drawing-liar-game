import { keywordAt, useLocale, useT } from '../i18n';
import type { CanvasPresence, GameConfig, Round } from '../types';

// The keyword + liar role come from the server (per-client), NOT the
// document — during drawing the document withholds them so the liar
// can't read the keyword. `role` is null while that fetch is in flight.
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
  // Show the keyword in the viewer's own language (deck + index are
  // parallel across languages).
  const shownKeyword =
    role && !role.isLiar && role.keywordDeck
      ? keywordAt(locale.code, role.keywordDeck, role.keywordIndex)
      : '';
  const drawerId =
    round.playerOrder[round.turnIndex % round.playerOrder.length] ?? '';
  const drawerName =
    presences.find((p) => p.presence.uid === drawerId)?.presence.name ?? '???';
  const total = round.playerOrder.length * config.turnsPerPlayer;
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
            <strong className="hud__liar">{t.youAreLiar}</strong>
          </>
        ) : (
          <>
            <span className="hud__label">{t.keyword}</span>
            <strong className="hud__keyword">{shownKeyword}</strong>
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
