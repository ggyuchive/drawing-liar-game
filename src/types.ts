export type Point = { x: number; y: number };

export type Stroke = {
  id: string;
  color: string;
  size: number;
  points: Array<Point>;
};

export type CanvasDoc = {
  strokes: Array<Stroke>;
};

export type CanvasPresence = {
  name: string;
  color: string;
};
