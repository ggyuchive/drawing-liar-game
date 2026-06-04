import { useT } from '../i18n';
import type { CanvasPresence, Round } from '../types';

type Props = {
  round: Round;
  myActorID: string | null;
  isHost: boolean;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onVote: (suspectId: string) => void;
  onReveal: () => void;
};

export default function Voting({
  round,
  myActorID,
  isHost,
  presences,
  onVote,
  onReveal,
}: Props) {
  const t = useT().voting;
  const myVote = myActorID ? round.votes[myActorID] : undefined;
  const votedCount = Object.keys(round.votes).length;
  const allIn = votedCount >= round.playerOrder.length;

  const order = round.playerOrder;
  const nameFor = (id: string) =>
    presences.find((p) => p.clientID === id)?.presence.name ?? '???';

  return (
    <div className="voting">
      <h2 className="voting__title">{t.title}</h2>
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
              {hasVoted && (
                <span className="voting__pickCheck">{t.voted}</span>
              )}
            </button>
          );
        })}
      </div>

      {isHost && (
        <button
          className="voting__reveal"
          onClick={onReveal}
          disabled={!allIn}
        >
          {allIn ? t.reveal : t.waitingForVotes}
        </button>
      )}
    </div>
  );
}
