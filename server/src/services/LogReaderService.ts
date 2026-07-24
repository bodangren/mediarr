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
  level?: LogLevel | undefined;
  search?: string | undefined;
  /** ISO date string — only entries at or after this timestamp */
  startDate?: string | undefined;
  /** ISO date string — only entries before or at this timestamp */
  endDate?: string | undefined;
}

export interface LogEntriesPage {
  items: LogEntry[];
  totalCount: number;
}

export interface LogFileDescriptor {
  filename: string;
  size: number;
  lastModified: string;
}

export interface LogFileContents {
  filename: string;
  contents: string;
  totalLines: number;
}

const MAX_BUFFER_SIZE = 2000;
const LOG_FILENAME = 'mediarr.log';

export class LogReaderService {
  private buffer: LogEntry[] = [];
  private counter = 0;
  private installed = false;
  private visible = true;
  private lastModified = new Date().toISOString();

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
    const timestamp = new Date().toISOString();
    this.buffer.push({
      id: ++this.counter,
      timestamp,
      level,
      message,
    });
    this.visible = true;
    this.lastModified = timestamp;
  }

  /** List the virtual file backed by the in-process log buffer. */
  listFiles(): LogFileDescriptor[] {
    if (!this.visible) {
      return [];
    }

    return [{
      filename: LOG_FILENAME,
      size: Buffer.byteLength(this.renderContents()),
      lastModified: this.lastModified,
    }];
  }

  /** Read formatted log contents while retaining the full line count. */
  getFileContents(filename: string, limit?: number): LogFileContents | null {
    if (!this.hasFile(filename)) {
      return null;
    }

    const totalLines = this.buffer.length;
    const entries = limit !== undefined && limit > 0
      ? this.buffer.slice(-limit)
      : this.buffer;
    return {
      filename: LOG_FILENAME,
      contents: this.renderContents(entries),
      totalLines,
    };
  }

  /** Clear entries while keeping the virtual log file available. */
  clearFile(filename: string): boolean {
    if (!this.hasFile(filename)) {
      return false;
    }

    this.buffer = [];
    this.lastModified = new Date().toISOString();
    return true;
  }

  /** Delete the virtual file until the next real log entry is captured. */
  deleteFile(filename: string): boolean {
    if (!this.hasFile(filename)) {
      return false;
    }

    this.buffer = [];
    this.visible = false;
    this.lastModified = new Date().toISOString();
    return true;
  }

  /** Return the full raw text representation for download. */
  getRawFile(filename: string): string | null {
    return this.hasFile(filename) ? this.renderContents() : null;
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

  private hasFile(filename: string): boolean {
    return this.visible && filename === LOG_FILENAME;
  }

  private renderContents(entries: LogEntry[] = this.buffer): string {
    return entries
      .map(entry => `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`)
      .join('\n');
  }
}

/** Global singleton — imported by both server startup and routes. */
export const globalLogBuffer = new LogReaderService();
