/**
 * In-process ring-buffer log reader.
 *
 * Intercepts console.log/warn/error output and retains the last N entries
 * so that the System > Logs page can display real application log lines
 * without requiring a file-based logger.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface LogEntriesFilter {
  level?: LogLevel;
  search?: string;
  /** ISO date string — only entries at or after this timestamp */
  startDate?: string;
  /** ISO date string — only entries before or at this timestamp */
  endDate?: string;
}

export interface LogEntriesPage {
  items: LogEntry[];
  totalCount: number;
}

const MAX_BUFFER_SIZE = 2000;

export class LogReaderService {
  private buffer: LogEntry[] = [];
  private counter = 0;
  private installed = false;

  /** Install console interceptors so log output is captured. */
  install(): void {
    if (this.installed) return;
    this.installed = true;

    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    console.log = (...args: unknown[]) => {
      originalLog(...args);
      this.push('info', args.map(String).join(' '));
    };

    console.warn = (...args: unknown[]) => {
      originalWarn(...args);
      this.push('warn', args.map(String).join(' '));
    };

    console.error = (...args: unknown[]) => {
      originalError(...args);
      this.push('error', args.map(String).join(' '));
    };
  }

  /** Add a log entry to the ring buffer. */
  push(level: LogLevel, message: string): void {
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.buffer.push({
      id: ++this.counter,
      timestamp: new Date().toISOString(),
      level,
      message,
    });
  }

  /**
   * Retrieve log entries with optional filtering and pagination.
   * Returns newest entries first.
   */
  getEntries(
    filter: LogEntriesFilter = {},
    page = 1,
    pageSize = 100,
  ): LogEntriesPage {
    let items = [...this.buffer].reverse();

    if (filter.level) {
      items = items.filter(e => e.level === filter.level);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      items = items.filter(e => e.message.toLowerCase().includes(needle));
    }
    if (filter.startDate) {
      const from = new Date(filter.startDate).getTime();
      items = items.filter(e => new Date(e.timestamp).getTime() >= from);
    }
    if (filter.endDate) {
      const to = new Date(filter.endDate).getTime();
      items = items.filter(e => new Date(e.timestamp).getTime() <= to);
    }

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), totalCount };
  }
}

/** Global singleton — imported by both server startup and routes. */
export const globalLogBuffer = new LogReaderService();
