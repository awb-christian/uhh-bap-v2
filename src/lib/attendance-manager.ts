
// Client-side attendance transaction manager using localStorage.
// For production Electron apps with potentially large datasets,
// consider moving transaction storage to SQLite managed by the main process for better performance and data integrity.

export type TransactionType = 'check-in' | 'check-out';
export type UploadStatus = 'not_uploaded' | 'uploaded';

export interface AttendanceTransaction {
  id: string; 
  employee_id: string;
  transaction_type: TransactionType;
  transaction_time: string; // ISO string format
  source_type: string; 
  device_id: string; 
  status: UploadStatus; 
}

const TRANSACTIONS_STORAGE_KEY = 'app_attendance_transactions';
const MAX_TRANSACTIONS_IN_STORAGE = 5000; // Example limit for localStorage

/**
 * Retrieves all attendance transactions from localStorage.
 * @returns {AttendanceTransaction[]} An array of transactions, sorted newest first if saved that way.
 */
export function getAttendanceTransactions(): AttendanceTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return storedTransactions ? JSON.parse(storedTransactions) : [];
  } catch (error) {
    console.error("AttendanceManager: Error reading transactions from localStorage:", error);
    return [];
  }
}

/**
 * Adds a new attendance transaction.
 * @param {Omit<AttendanceTransaction, 'id' | 'transaction_time'> & { transaction_time?: Date }} transactionData - Data for the new transaction. `transaction_time` defaults to now if not provided.
 */
export function addAttendanceTransaction(transactionData: Omit<AttendanceTransaction, 'id' | 'transaction_time'> & { transaction_time?: Date }): void {
  if (typeof window === 'undefined') return;

  const newTransaction: AttendanceTransaction = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    ...transactionData,
    transaction_time: (transactionData.transaction_time || new Date()).toISOString(),
  };

  try {
    const currentTransactions = getAttendanceTransactions();
    // Add new transaction and re-sort by time descending before saving.
    const updatedTransactions = [newTransaction, ...currentTransactions]
      .sort((a, b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime())
      .slice(0, MAX_TRANSACTIONS_IN_STORAGE); // Apply storage limit
    
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
  } catch (error) {
    console.error("AttendanceManager: Error writing transaction to localStorage:", error);
  }
}

/**
 * Updates the status of specified attendance transactions.
 * @param {string[]} transactionIds - Array of transaction IDs to update.
 * @param {UploadStatus} newStatus - The new status to set.
 */
export function updateAttendanceTransactionStatus(transactionIds: string[], newStatus: UploadStatus): void {
  if (typeof window === 'undefined' || transactionIds.length === 0) return;

  try {
    let currentTransactions = getAttendanceTransactions();
    let updatedCount = 0;
    currentTransactions = currentTransactions.map(transaction => {
      if (transactionIds.includes(transaction.id)) {
        updatedCount++;
        return { ...transaction, status: newStatus };
      }
      return transaction;
    });

    if (updatedCount > 0) {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(currentTransactions));
      window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
      console.log(`AttendanceManager: Updated status to '${newStatus}' for ${updatedCount} transactions.`);
    } else {
      console.log(`AttendanceManager: No transactions found with IDs: ${transactionIds.join(', ')} to update status.`);
    }
  } catch (error) {
    console.error("AttendanceManager: Error updating transaction statuses in localStorage:", error);
  }
}


/**
 * Clears all attendance transactions from localStorage.
 */
export function clearAttendanceTransactions(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
  } catch (error) {
    console.error("AttendanceManager: Error clearing transactions from localStorage:", error);
  }
}

/**
 * Seeds localStorage with sample attendance transaction data for testing purposes.
 * This should typically not be called in a production build unless for specific demo needs.
 */
export function seedSampleTransactions(): void {
  if (typeof window === 'undefined') return;
  const existingTransactions = getAttendanceTransactions();
  if (existingTransactions.length > 0) {
    console.log("AttendanceManager: Sample data seeding skipped: Transactions already exist.");
    return; 
  }

  const sampleBaseData: Omit<AttendanceTransaction, 'id' | 'transaction_time'>[] = [
    { employee_id: 'EMP001', transaction_type: 'check-in', source_type: 'biometric', device_id: 'ZK-Device-01', status: 'not_uploaded' },
    { employee_id: 'EMP002', transaction_type: 'check-in', source_type: 'biometric', device_id: 'SecureLink-AAS', status: 'uploaded' },
    { employee_id: 'EMP001', transaction_type: 'check-out', source_type: 'biometric', device_id: 'ZK-Device-01', status: 'not_uploaded' },
  ];
  
  const allSamplesToSeed: AttendanceTransaction[] = [];
  for(let i=0; i<15; i++) { // Generate a reasonable number of samples
    sampleBaseData.forEach(sample => {
        const timeOffset = Math.random() * 7 * 24 * 3600 * 1000; // Transactions within the last week
        const newTime = new Date(Date.now() - timeOffset);
         allSamplesToSeed.push({
            id: newTime.getTime().toString() + Math.random().toString(36).substring(2,9) + i, // More unique ID
            ...sample,
            transaction_time: newTime.toISOString(),
            employee_id: `EMP${Math.floor(Math.random() * 10 + 1).toString().padStart(3, '0')}`, 
            status: Math.random() > 0.4 ? 'not_uploaded' : 'uploaded'
        });
    });
  }

  allSamplesToSeed.sort((a,b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());

  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(allSamplesToSeed.slice(0, MAX_TRANSACTIONS_IN_STORAGE)));
    window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
    console.log(`AttendanceManager: Seeded ${allSamplesToSeed.length} sample transactions.`);
  } catch (error) {
    console.error("AttendanceManager: Error seeding sample transactions:", error);
  }
}
