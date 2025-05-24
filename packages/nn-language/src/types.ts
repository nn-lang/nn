import { SourceFile } from ".";

export interface Position {
  pos: number;
  end: number;
}

export interface Diagnostic {
  source: SourceFile;
  message: string;

  scope?: string;
  position: Position;
}
