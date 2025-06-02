export interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant' | 'system'; // Updated to match backend
    timestamp: string | Date; // Allow string for data from backend, Date for new messages
    projectId?: string; // Optional projectId
    // Optional fields for file_content messages
    filename?: string;
    lang?: string;
    language?: string; // For file_content messages from backend
}