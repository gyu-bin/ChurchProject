import { db } from '@/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function logErrorToDatabase(error: Error, additionalInfo: string = '') {
  try {
    await addDoc(collection(db, 'errorLogs'), {
      message: error.message,
      stack: error.stack,
      additionalInfo,
      timestamp: serverTimestamp(),
    });
    console.log('Error logged to database');
  } catch (dbError) {
    console.error('Failed to log error to database:', dbError);
  }
}

// Example usage in a try-catch block
try {
  // Example operation that might fail
} catch (error) {
  if (error instanceof Error) {
    logErrorToDatabase(error, 'Example operation failed');
  } else {
    console.error('Caught an unknown error type:', error);
  }
}
