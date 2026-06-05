import { useT } from '../i18n';
import type { CanvasPresence, GameConfig, Round } from '../types';

type Props = {
  round: Round;
  config: GameConfig;
  myActorID: string | null;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
};

export default function RoundHud({
  round,
  config,
  myActorID,
  presences,
}: Props) {
  const t = useT().hud;
  const isLiar = !!myActorID && myActorID === round.liarId;
  const drawerId =
    round.playerOrder[round.turnIndex % round.playerOrder.length] ?? '';
  const drawerName =
    presences.find((p) => p.presence.uid === drawerId)?.presence.name ?? '???';
  const total = round.playerOrder.length * config.turnsPerPlayer;
  const turnNumber = Math.min(round.strokesDone + 1, total);

  return (
    <div className="hud">
      <div className="hud__cell hud__cell--keyword">
        {isLiar ? (
          <>
            <span className="hud__label">{t.yourRole}</span>
            <strong className="hud__liar">{t.youAreLiar}</strong>
          </>
        ) : (
          <>
            <span className="hud__label">{t.keyword}</span>
            <strong className="hud__keyword">{round.keyword}</strong>
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
