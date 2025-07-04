// hooks/useRealtimeCollection.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

export function useRealtimeCollection(path: string) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setData(docs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [path]);

    return { data, loading };
}
