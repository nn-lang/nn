export interface Position {
  pos: number
  end: number
}

export interface Diagnostic {
  message: string

  scope?: string
  position: Position
}
