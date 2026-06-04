import { useDocument } from '@yorkie-js/react';

export function useActorID(): string | null {
  const { doc } = useDocument();
  if (!doc) return null;
  return doc.getChangeID().getActorID();
}
