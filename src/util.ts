const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function randomColor(): string {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 70%, 50%)`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
