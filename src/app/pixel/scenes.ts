import { TRIP_ART } from './art'
import type { SceneArt } from './stage'

// Every backdrop by id: the trip's painted scenes, with what moves in them
// (art.ts). The quest paints its own battlefields (quest/stage.ts).

export const hasScene = (id: string) => !!TRIP_ART[id]

// What the stage needs to show a backdrop
export const sceneArt = (id: string): SceneArt | undefined => TRIP_ART[id]
