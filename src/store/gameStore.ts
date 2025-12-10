import { create } from "zustand";

interface GameStore {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
    refreshTrigger: 0,
    triggerRefresh: () =>
        set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
