export interface ComputerAction {
  type: string;
  [key: string]: any;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export abstract class Computer {
  abstract screenshot(): Promise<string>;
  abstract click(x: number, y: number, button?: string): Promise<void>;
  abstract doubleClick(x: number, y: number): Promise<void>;
  abstract scroll(x: number, y: number, scrollX: number, scrollY: number): Promise<void>;
  abstract type(text: string): Promise<void>;
  abstract keypress(keys: string[]): Promise<void>;
  abstract move(x: number, y: number): Promise<void>;
  abstract drag(path: Array<{ x: number; y: number }>): Promise<void>;
  abstract wait(ms: number): Promise<void>;
  abstract getDimensions(): ScreenDimensions;
  abstract getEnvironment(): string;
  abstract getCurrentUrl(): string;
}
