export interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant' | 'system'; // Updated to match backend
    timestamp: string | Date; // Allow string for data from backend, Date for new messages
    projectId?: string; // Optional projectId
}