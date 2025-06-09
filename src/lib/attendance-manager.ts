
// Client-side attendance transaction manager using localStorage

export type TransactionType = 'check-in' | 'check-out';
export type UploadStatus = 'not_uploaded' | 'uploaded';

export interface AttendanceTransaction {
  id: string; // Unique ID
  employee_id: string;
  transaction_type: TransactionType;
  transaction_time: string; // ISO string format
  source_type: string; // e.g., 'biometric', 'manual', 'mobile_app'
  device_id: string; // Identifier for the biometric device or source system
  status: UploadStatus; // Status of synchronization with Odoo
}

const TRANSACTIONS_STORAGE_KEY = 'app_attendance_transactions';

// Function to get all transactions from localStorage
export function getAttendanceTransactions(): AttendanceTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return storedTransactions ? JSON.parse(storedTransactions) : [];
  } catch (error) {
    console.error("Error reading attendance transactions from localStorage:", error);
    return [];
  }
}

// Function to add a new transaction
export function addAttendanceTransaction(transactionData: Omit<AttendanceTransaction, 'id' | 'transaction_time'> & { transaction_time?: Date }): void {
  if (typeof window === 'undefined') return;

  const newTransaction: AttendanceTransaction = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    ...transactionData,
    transaction_time: (transactionData.transaction_time || new Date()).toISOString(),
  };

  try {
    const currentTransactions = getAttendanceTransactions();
    // Sort by transaction_time descending (newest first) before saving
    const updatedTransactions = [newTransaction, ...currentTransactions]
      .sort((a, b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());
    
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
  } catch (error) {
    console.error("Error writing attendance transaction to localStorage:", error);
  }
}

// Function to clear all transactions
export function clearAttendanceTransactions(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
  } catch (error) {
    console.error("Error clearing attendance transactions from localStorage:", error);
  }
}

// Function to seed sample transactions if none exist
export function seedSampleTransactions(): void {
  if (typeof window === 'undefined') return;
  const existingTransactions = getAttendanceTransactions();
  if (existingTransactions.length > 0) {
    return; // Don't seed if data already exists
  }

  const sampleData: Omit<AttendanceTransaction, 'id'>[] = [
    { employee_id: 'EMP001', transaction_type: 'check-in', transaction_time: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), source_type: 'biometric', device_id: 'ZK-Device-01', status: 'not_uploaded' },
    { employee_id: 'EMP002', transaction_type: 'check-in', transaction_time: new Date(Date.now() - 7.5 * 3600 * 1000).toISOString(), source_type: 'biometric', device_id: 'SecureLink-AAS', status: 'uploaded' },
    { employee_id: 'EMP001', transaction_type: 'check-out', transaction_time: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), source_type: 'biometric', device_id: 'ZK-Device-01', status: 'not_uploaded' },
    { employee_id: 'EMP003', transaction_type: 'check-in', transaction_time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), source_type: 'manual', device_id: 'AdminPanel', status: 'uploaded' },
    { employee_id: 'EMP002', transaction_type: 'check-out', transaction_time: new Date(Date.now() - 0.5 * 3600 * 1000).toISOString(), source_type: 'biometric', device_id: 'SecureLink-AAS', status: 'not_uploaded' },
    { employee_id: 'EMP004', transaction_type: 'check-in', transaction_time: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), source_type: 'biometric', device_id: 'ZK-Device-02', status: 'not_uploaded' },
    { employee_id: 'EMP005', transaction_type: 'check-in', transaction_time: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), source_type: 'mobile_app', device_id: 'Mobile-UserX', status: 'uploaded' },
  ];
  
  // Add multiple samples
  const allSamplesToSeed: AttendanceTransaction[] = [];
  for(let i=0; i<5; i++) { // Create about 35 sample records
    sampleData.forEach(sample => {
        const timeOffset = Math.random() * 72 * 3600 * 1000; // Upto 3 days variation
        const newTime = new Date(new Date(sample.transaction_time).getTime() - timeOffset);
         allSamplesToSeed.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2,9) + i,
            ...sample,
            transaction_time: newTime.toISOString(),
            employee_id: `EMP${Math.floor(Math.random() * 20).toString().padStart(3, '0')}`, // Randomize employee ID a bit
            status: Math.random() > 0.5 ? 'uploaded' : 'not_uploaded'
        });
    });
  }


  // Sort by transaction_time descending (newest first)
  allSamplesToSeed.sort((a,b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());

  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(allSamplesToSeed));
    window.dispatchEvent(new CustomEvent('attendanceTransactionsUpdated'));
  } catch (error) {
    console.error("Error seeding sample transactions:", error);
  }
}

    