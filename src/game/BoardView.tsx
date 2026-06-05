import { useEffect, useRef } from 'react';
import type { JSONArray, JSONObject } from '@yorkie-js/react';
import type { Stroke } from '../types';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

type Props = {
  strokes: JSONArray<JSONObject<Stroke>>;
  // When set, only this author's strokes draw at full opacity; the
  // rest are dimmed. Local-only view aid for spotting the liar.
  highlightId?: string | null;
};

// Read-only render of the finished drawing, shown alongside the
// voting / reveal / guessing / round-end screens. Shares no pointer
// handling with the editable Canvas — it only paints.
export default function BoardView({ strokes, highlightId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      const first = points[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (points.length === 1) {
        ctx.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [strokes, strokes.length, highlightId]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="boardView"
      aria-label="Final drawing"
    />
  );
}
