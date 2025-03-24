export { LogLevel, Logger, LspClientLogger } from './Logger'
export * from './MarkdownString'

export function between(start: number, end: number) {
  return (value: number) => value >= start && value <= end;
}