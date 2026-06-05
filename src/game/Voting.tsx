import { useT } from '../i18n';
import { VOTE_TIME_MS } from '../types';
import type { CanvasPresence, Round } from '../types';
import PhaseTimer from './PhaseTimer';

type Props = {
  round: Round;
  myActorID: string | null;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onVote: (suspectId: string) => void;
};

export default function Voting({ round, myActorID, presences, onVote }: Props) {
  const ui = useT();
  const t = ui.voting;
  const myVote = myActorID ? round.votes[myActorID] : undefined;
  const votedCount = Object.keys(round.votes).length;

  const order = round.playerOrder;
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';

  return (
    <div className="voting">
      <div className="voting__head">
        <h2 className="voting__title">{t.title}</h2>
        <PhaseTimer
          durationMs={VOTE_TIME_MS}
          resetKey={round.index}
          label={ui.common.time}
        />
      </div>
      <p className="voting__sub">
        {t.votesIn(votedCount, order.length)}
        {myVote ? t.youPicked(nameFor(myVote)) : ''}
      </p>

      <div className="voting__grid">
        {order.map((id) => {
          if (id === myActorID) return null;
          const selected = myVote === id;
          const hasVoted = id in round.votes;
          return (
            <button
              key={id}
              className={
                selected
                  ? 'voting__pick voting__pick--selected'
                  : 'voting__pick'
              }
              onClick={() => onVote(id)}
            >
              <span className="voting__pickName">{nameFor(id)}</span>
              {hasVoted && <span className="voting__pickCheck">{t.voted}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
