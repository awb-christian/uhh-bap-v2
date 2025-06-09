
// Client-side logger utility using localStorage

export type LogEntryStatus = 'Success' | 'Error' | 'Info' | 'Debug';

export interface LogEntry {
  id: string; // Unique ID for each log entry, can be timestamp-based for simplicity
  timestamp: string; // ISO string format
  source: string;
  message: string;
  status: LogEntryStatus;
}

const LOGS_STORAGE_KEY = 'app_dynamic_logs';

// Function to get all logs from localStorage
export function getLogs(): LogEntry[] {
  if (typeof window === 'undefined') return []; // Guard for SSR or non-browser environments
  try {
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (error) {
    console.error("Error reading logs from localStorage:", error);
    return [];
  }
}

// Function to add a new log entry
export function addLog(source: string, message: string, status: LogEntryStatus): void {
  if (typeof window === 'undefined') return; 
  
  const newLog: LogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(2,7), // Simple unique ID
    timestamp: new Date().toISOString(),
    source,
    message,
    status,
  };

  try {
    const currentLogs = getLogs();
    const updatedLogs = [newLog, ...currentLogs]; // Add new log to the beginning (newest first)
    
    // Optional: Limit the number of logs stored to prevent localStorage from growing too large
    const MAX_LOGS_IN_STORAGE = 500; // Example limit
    if (updatedLogs.length > MAX_LOGS_IN_STORAGE) {
      updatedLogs.splice(MAX_LOGS_IN_STORAGE); // Keep only the newest N logs
    }

    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));

    // Dispatch a custom event to notify other parts of the app (like LogsPage)
    window.dispatchEvent(new CustomEvent('logsUpdated'));

  } catch (error) {
    console.error("Error writing log to localStorage:", error);
  }
}

// Function to clear all logs (e.g., for testing or based on retention policy if implemented here)
export function clearLogs(): void {
  if (typeof window === 'undefined') return; 
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('logsUpdated'));
  } catch (error) {
    console.error("Error clearing logs from localStorage:", error);
  }
}

// Placeholder for retention policy enforcement
// In a real Electron app, this would be in the main process and run periodically.
export function applyRetentionPolicy(retentionPeriodValue: string): void {
  if (typeof window === 'undefined' || retentionPeriodValue === 'never') return;

  // This is a SIMULATION. Actual deletion would be more robust.
  console.log(`Simulating log retention policy. Period: ${retentionPeriodValue}. This needs a backend implementation.`);
  
  // Example: (Not for production use in client-side localStorage for large logs)
  // const now = new Date();
  // let cutoffDate: Date;
  // const unit = retentionPeriodValue.slice(-1);
  // const amount = parseInt(retentionPeriodValue.slice(0, -1), 10);

  // if (unit === 'd' && !isNaN(amount)) {
  //   cutoffDate = new Date(now.setDate(now.getDate() - amount));
  //   const currentLogs = getLogs();
  //   const retainedLogs = currentLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
  //   localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(retainedLogs));
  //   window.dispatchEvent(new CustomEvent('logsUpdated'));
  //   console.log(`Simulated: Deleted logs older than ${cutoffDate.toISOString()}`);
  // }
}
