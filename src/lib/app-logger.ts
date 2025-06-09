
// Client-side logger utility using localStorage.
// For production Electron apps with potentially large log volumes,
// consider moving log storage to SQLite managed by the main process for better performance and reliability.

export type LogEntryStatus = 'Success' | 'Error' | 'Info' | 'Debug';

export interface LogEntry {
  id: string; 
  timestamp: string; // ISO string format
  source: string;
  message: string;
  status: LogEntryStatus;
}

const LOGS_STORAGE_KEY = 'app_dynamic_logs';
const MAX_LOGS_IN_STORAGE = 1000; // Limit the number of logs stored in localStorage

/**
 * Retrieves all log entries from localStorage.
 * @returns {LogEntry[]} An array of log entries, sorted newest first if previously saved that way.
 */
export function getLogs(): LogEntry[] {
  if (typeof window === 'undefined') return []; 
  try {
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (error) {
    console.error("AppLogger: Error reading logs from localStorage:", error);
    return [];
  }
}

/**
 * Adds a new log entry to localStorage.
 * Dispatches a 'logsUpdated' custom event on the window object after adding a log.
 * @param {string} source - The source of the log entry (e.g., component name, module).
 * @param {string} message - The log message.
 * @param {LogEntryStatus} status - The status of the log entry.
 */
export function addLog(source: string, message: string, status: LogEntryStatus): void {
  if (typeof window === 'undefined') return; 
  
  const newLog: LogEntry = {
    // Generate a reasonably unique ID
    id: Date.now().toString() + Math.random().toString(36).substring(2,7), 
    timestamp: new Date().toISOString(),
    source,
    message,
    status,
  };

  try {
    const currentLogs = getLogs();
    // Add new log to the beginning (newest first) and apply storage limit.
    const updatedLogs = [newLog, ...currentLogs].slice(0, MAX_LOGS_IN_STORAGE); 

    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
    // Notify other parts of the app that logs have been updated.
    window.dispatchEvent(new CustomEvent('logsUpdated'));
  } catch (error) {
    console.error("AppLogger: Error writing log to localStorage:", error);
    // In a production app, you might dispatch an error to a more robust error handling system.
  }
}

/**
 * Clears all log entries from localStorage.
 * Dispatches a 'logsUpdated' custom event on the window object after clearing logs.
 */
export function clearLogs(): void {
  if (typeof window === 'undefined') return; 
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('logsUpdated'));
  } catch (error) {
    console.error("AppLogger: Error clearing logs from localStorage:", error);
  }
}

/**
 * Placeholder for applying log retention policy.
 * In a production Electron application, this logic should reside in the main process
 * and operate on a more robust storage system like SQLite.
 * It's called from the LogsPage for now to log the action but doesn't perform actual deletion.
 * @param {string} retentionPeriodValue - The retention period (e.g., "7d", "30d", "never").
 */
export function applyRetentionPolicy(retentionPeriodValue: string): void {
  if (typeof window === 'undefined' || retentionPeriodValue === 'never') return;

  // This is a SIMULATION and logs that this needs backend implementation.
  // Actual deletion logic for localStorage would be complex and potentially slow.
  console.warn(`AppLogger: Simulating log retention policy check. Period: ${retentionPeriodValue}. This needs a robust background process implementation (e.g., in Electron main process with SQLite).`);
  
  // TODO: [Electron Main Process] Implement actual log cleanup based on retention period,
  // likely querying and deleting from an SQLite database.
  // Example of how one might attempt client-side localStorage cleanup (not recommended for large logs):
  // const now = new Date();
  // const unit = retentionPeriodValue.slice(-1); // 'd'
  // const amount = parseInt(retentionPeriodValue.slice(0, -1), 10); // e.g., 7
  // if (unit === 'd' && !isNaN(amount)) {
  //   const cutoffDate = new Date(now.setDate(now.getDate() - amount));
  //   let currentLogs = getLogs();
  //   const logsBefore = currentLogs.length;
  //   const retainedLogs = currentLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
  //   if (retainedLogs.length < logsBefore) {
  //      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(retainedLogs));
  //      window.dispatchEvent(new CustomEvent('logsUpdated'));
  //      console.log(`AppLogger (Simulated): Deleted ${logsBefore - retainedLogs.length} logs older than ${cutoffDate.toISOString()}`);
  //   }
  // }
}
