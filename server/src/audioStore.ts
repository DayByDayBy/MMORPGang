export const audioStore = new Map<string, string>();

export const clearRoom = (roomId: string) => {
  for (const key of audioStore.keys()) {
    if (key.startsWith(`${roomId}:`)) {
      audioStore.delete(key);
    }
  }
};
