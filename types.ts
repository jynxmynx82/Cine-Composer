
export type AspectRatio = "16:9" | "9:16";

export interface Character {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  flipped?: boolean;
}

export interface Scene {
  background: string | null;
  characters: Character[];
}