import { useEffect, useState } from 'react';
import { listenToTeamMessages } from '@/services/firestoreService';

export const useChatMessages = (teamId: string) => {
    const [messages, setMessages] = useState<any[]>([]);
    useEffect(() => {
        const unsubscribe = listenToTeamMessages(teamId, setMessages);
        return () => unsubscribe();
    }, [teamId]);
    return messages;
};
