import { createContext, useContext, useState, ReactNode } from 'react';

interface File {
    name: string;
    content: string;
}

interface Message {
    id: number;
    content: string;
    isUser: boolean;
    isEditing?: boolean;
}

// Define the shape of your chat context state
interface ChatContextState {
    currentOpenFile: File | null;
    setCurrentOpenFile: (file: File | null) => void;
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    startEditingMessage: (messageId: number) => void;
    updateMessage: (messageId: number, newContent: string) => void;
    cancelEditing: () => void;
}

// Create the context with a default value
const ChatContext = createContext<ChatContextState | undefined>(undefined);

// Props for the provider component
interface ChatProviderProps {
    children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
    // Initialize state
    const [currentOpenFile, setCurrentOpenFile] = useState<File | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // Method to start editing a message
    const startEditingMessage = (messageId: number) => {
        setMessages(prevMessages =>
            prevMessages.map(msg => ({
                ...msg,
                isEditing: msg.id === messageId
            }))
        );
    };

    // Method to update a message's content
    const updateMessage = (messageId: number, newContent: string) => {
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId
                    ? { ...msg, content: newContent, isEditing: false }
                    : msg
            )
        );
    };

    // Method to cancel editing
    const cancelEditing = () => {
        setMessages(prevMessages =>
            prevMessages.map(msg => ({
                ...msg,
                isEditing: false
            }))
        );
    };

    // The value that will be provided to consumers of this context
    const value: ChatContextState = {
        currentOpenFile,
        setCurrentOpenFile,
        messages,
        setMessages,
        startEditingMessage,
        updateMessage,
        cancelEditing
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Custom hook to use the chat context
export function useChat(): ChatContextState {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}