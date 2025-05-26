import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';


import { Message } from '../models/Message';

const CHAT_WS_URL = 'ws://localhost:5000/ws/chat';

interface ChatContextState {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    sendMessage: () => void;
    isConnected: boolean;
}

const ChatContext = createContext<ChatContextState | undefined>(undefined);

interface ChatProviderProps {
    children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const websocketRef = useRef<WebSocket | null>(null);

    useEffect(() => {

        const ws = new WebSocket(CHAT_WS_URL);
        websocketRef.current = ws;

        ws.onopen = () => {
            console.log('Chat WebSocket connected');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const receivedMessage = event.data as string;
            let senderType: 'user' | 'assistant' | 'system' = 'assistant';
            if (receivedMessage.startsWith("Create command received:") || receivedMessage.startsWith("Edit command received:")) {
                senderType = 'system';
            } else if (receivedMessage.includes("says:")) {
                senderType = 'assistant';
            } else if (receivedMessage.includes("left the chat")) {
                senderType = 'system';
            }

            const newServerMessage: Message = {
                id: Date.now().toString() + '_server',
                content: receivedMessage,
                sender: senderType,
                timestamp: new Date(),
            };
            setMessages(prevMessages => [...prevMessages, newServerMessage]);
        };

        ws.onerror = (error) => {
            console.error('Chat WebSocket error:', error);
            setIsConnected(false);
        };

        ws.onclose = () => {
            console.log('Chat WebSocket disconnected');
            setIsConnected(false);

        };


        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            websocketRef.current = null;
        };
    }, []);

    const sendMessage = () => {
        if (inputValue.trim() === '' || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
            console.log("Cannot send message, WebSocket not connected or input is empty.");
            return;
        }

        const messageContent = inputValue;


        websocketRef.current.send(messageContent);
        if (!messageContent.startsWith("/")) {
            const userMessage: Message = {
                id: Date.now().toString(),
                content: messageContent,
                sender: 'user',
                timestamp: new Date(),
            };
            setMessages(prevMessages => [...prevMessages, userMessage]);
        }

        setInputValue('');
    };

    const value: ChatContextState = {
        messages,
        setMessages,
        inputValue,
        setInputValue,
        sendMessage,
        isConnected,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextState {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}