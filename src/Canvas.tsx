import { useEffect, useRef } from 'react';
import { useDocument, type JSONArray, type JSONObject } from '@yorkie-js/react';
import { useT } from './i18n';
import type { CanvasPresence, Game, Point, Stroke } from './types';
import { generateId } from './util';

type DocRoot = {
  game: JSONObject<Game>;
  strokes: JSONArray<JSONObject<Stroke>>;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const POINT_THRESHOLD_SQ = 4;

type Props = {
  strokes: JSONArray<JSONObject<Stroke>>;
  isMyTurn: boolean;
  drawerName: string;
  myUid: string;
  myColor: string;
  highlightId?: string | null;
  onStrokeEnd: () => void;
};

export default function Canvas({
  strokes,
  isMyTurn,
  drawerName,
  myUid,
  myColor,
  highlightId,
  onStrokeEnd,
}: Props) {
  const { update } = useDocument<DocRoot, CanvasPresence>();
  const t = useT().canvas;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<{ id: string; last: Point } | null>(null);

  // When the turn rotates away mid-stroke (e.g. the turn timer or
  // brush quota fired the advance), drop the in-flight stroke so the
  // drawer can't keep appending points after their turn ended.
  useEffect(() => {
    if (!isMyTurn) drawingRef.current = null;
  }, [isMyTurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      const points = stroke.points;
      if (points.length === 0) continue;
      ctx.globalAlpha =
        highlightId && stroke.authorId !== highlightId ? 0.15 : 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      const first = points[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (points.length === 1) {
        ctx.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [strokes, strokes.length, highlightId]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released (e.g. budget cutoff)
    }
    drawingRef.current = null;
    onStrokeEnd();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn) return;
    if (drawingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getCanvasPoint(e);
    const id = generateId();
    drawingRef.current = { id, last: point };

    update((root) => {
      // A fresh turn already started the budget; never below empty.
      if (root.game.round.brushUsedPx >= root.game.round.brushBudgetPx) return;
      root.strokes.push({
        id,
        authorId: myUid,
        color: myColor,
        size: 4,
        points: [point],
      } as JSONObject<Stroke>);
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const current = drawingRef.current;
    if (!current) return;
    const point = getCanvasPoint(e);
    const dx = point.x - current.last.x;
    const dy = point.y - current.last.y;
    if (dx * dx + dy * dy < POINT_THRESHOLD_SQ) return;
    const segLen = Math.hypot(dx, dy);
    current.last = point;

    let depleted = false;
    update((root) => {
      const round = root.game.round;
      round.brushUsedPx = round.brushUsedPx + segLen;
      for (let i = root.strokes.length - 1; i >= 0; i--) {
        if (root.strokes[i].id === current.id) {
          root.strokes[i].points.push(point);
          break;
        }
      }
      if (round.brushUsedPx >= round.brushBudgetPx) depleted = true;
    });

    // Budget exhausted: end the stroke in place and advance the turn.
    if (depleted) finishStroke(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    finishStroke(e);
  };

  return (
    <div className="canvas">
      <div className="canvas__hud">
        {isMyTurn ? (
          <span className="canvas__hudMine">{t.yourTurn}</span>
        ) : (
          <span className="canvas__hudWait">
            {drawerName ? t.drawing(drawerName) : t.waiting}
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={
          isMyTurn ? 'canvas__surface' : 'canvas__surface canvas__surface--off'
        }
        aria-label={
          isMyTurn ? t.yourTurn : drawerName ? t.drawing(drawerName) : t.waiting
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
