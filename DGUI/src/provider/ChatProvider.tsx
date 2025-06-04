// filepath: d:\ProgrammingProjects\Javascript\DocumentGenerator\DGUI\src\provider\ChatProvider.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useProjects } from './ProjectProvider';
import { Message } from '../models/Message';

// Command interface to match backend expectations
export interface ChatCommand {
    name: string;
    params: Record<string, any>;
}

interface ChatContextType {
    messages: Message[];
    inputValue: string;
    setInputValue: (value: string) => void;
    sendMessage: () => void;
    sendCommand: (command: ChatCommand) => void;
    isChatConnected: boolean;
    chatError: string | null;
    isGenerating: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
    children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isChatConnected, setIsChatConnected] = useState<boolean>(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const webSocketRef = useRef<WebSocket | null>(null);
    const { currentProject } = useProjects();

    // WebSocket Base URL (consistent with ProjectProvider and chat.py endpoint structure)
    const WS_BASE_URL = 'ws://localhost:5000';

    const addSystemMessage = useCallback((content: string, type: 'system' | 'error' = 'system') => {
        const systemMessage: Message = {
            id: Date.now().toString() + Math.random().toString(), // Simple unique ID
            content,
            sender: 'system', // Keep sender as system, content can denote error
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemMessage]);
        if (type === 'error') {
            setChatError(content);
        }
    }, []);

    useEffect(() => {
        if (currentProject && currentProject.id) {
            const projectId = currentProject.id;
            const wsUrl = `${WS_BASE_URL}/ws/chat/${projectId}`;            // Clear previous state when project changes
            setMessages([]);
            setChatError(null);
            setIsChatConnected(false);
            setIsGenerating(false); // Reset generating state when connecting to new project
            addSystemMessage(`Attempting to connect to chat for project: ${currentProject.name || projectId}...`);

            if (webSocketRef.current) {
                webSocketRef.current.onclose = null; // Avoid triggering old onclose logic
                webSocketRef.current.close();
            }

            const ws = new WebSocket(wsUrl);
            webSocketRef.current = ws;

            ws.onopen = () => {
                setIsChatConnected(true);
                setChatError(null);
                addSystemMessage('Chat connected successfully.');
                console.log(`Chat WebSocket connected for project ${projectId}`);
            }; ws.onmessage = (event) => {
                try {
                    const receivedData = JSON.parse(event.data as string); if (receivedData.type === 'ai_response' && typeof receivedData.text === 'string') {
                        const aiMessage: Message = {
                            id: Date.now().toString() + Math.random().toString(),
                            content: receivedData.text,
                            sender: 'assistant',
                            timestamp: new Date().toISOString(),
                        };
                        setMessages(prev => [...prev, aiMessage]);
                        setIsGenerating(false); // AI has finished generating
                    } else if (receivedData.type === 'error_message' && typeof receivedData.text === 'string') {
                        addSystemMessage(`Server error: ${receivedData.text}`, 'error');
                        console.error('Chat WebSocket error message from server:', receivedData.text);
                        setIsGenerating(false); // Stop generating on error
                    } else if (receivedData.type === 'system_message' && typeof receivedData.text === 'string') {
                        addSystemMessage(receivedData.text);
                    } else if (receivedData.type === 'file_content' && receivedData.filename && receivedData.content) {
                        const fileMessage: Message = {
                            id: Date.now().toString() + Math.random().toString(),
                            content: receivedData.content,
                            sender: 'system',
                            timestamp: new Date().toISOString(),
                            filename: receivedData.filename,
                            language: receivedData.lang || 'text',
                        };
                        setMessages(prev => [...prev, fileMessage]);
                        addSystemMessage(`File updated: ${receivedData.filename}`);
                        setIsGenerating(false); // Command completed with file creation
                    } else {
                        console.warn('Received unknown message type or format:', receivedData);
                        addSystemMessage('Received an unhandled message format from the server.');
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message or handle it:', e);
                    addSystemMessage('Error processing message from server.', 'error');
                    setIsGenerating(false); // Stop generating on parse error
                }
            };

            ws.onerror = (errorEvent) => {
                console.error('Chat WebSocket error:', errorEvent);
                setIsChatConnected(false);
                setIsGenerating(false); // Stop generating on connection error
                addSystemMessage('Chat connection error. Please check server and network.', 'error');
            };

            ws.onclose = (event) => {
                setIsChatConnected(false);
                setIsGenerating(false); // Stop generating on disconnect
                webSocketRef.current = null; // Clear ref on close
                if (event.wasClean) {
                    addSystemMessage(`Chat disconnected (Code: ${event.code}).`);
                    console.log(`Chat WebSocket disconnected cleanly for project ${projectId}, Code: ${event.code}, Reason: ${event.reason}`);
                } else {
                    addSystemMessage(`Chat connection lost (Code: ${event.code}). You may need to reload or check the server.`, 'error');
                    console.error(`Chat WebSocket connection lost for project ${projectId}, Code: ${event.code}`);
                }
            };

            return () => {
                if (ws) {
                    ws.onclose = null; // Prevent onclose from firing during cleanup if already handled
                    ws.close();
                    console.log(`Chat WebSocket connection for project ${projectId} closed on cleanup.`);
                }
            };
        } else {
            if (webSocketRef.current) {
                webSocketRef.current.onclose = null;
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
            setMessages([]);
            setIsChatConnected(false);
            setIsGenerating(false); // Reset generating state when disconnecting
            if (currentProject === null) { // Only show if project was explicitly closed/is null
                addSystemMessage('Chat disconnected: No active project selected.');
            }
        }
    }, [currentProject, addSystemMessage, WS_BASE_URL]); const sendMessage = () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isGenerating) return; // Don't send if already generating

        if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
            addSystemMessage('Cannot send message: Chat is not connected.', 'error');
            console.error('Attempted to send message, but WebSocket is not open or available.');
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString() + Math.random().toString(),
            content: trimmedInput,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsGenerating(true); // Start generating

        try {
            webSocketRef.current.send(JSON.stringify({ type: 'chat', text: trimmedInput }));
            setInputValue(''); // Clear input after successful send
        } catch (error) {
            console.error('Failed to send message via WebSocket:', error);
            addSystemMessage('Failed to send your message. Please try again.', 'error');
            setIsGenerating(false); // Stop generating on error
            // Optionally, mark the user's message as failed in the UI
            setMessages(prev => prev.map(msg =>
                msg.id === userMessage.id ? { ...msg, content: `${msg.content} (Sending failed)` } : msg
            ));
        }
    }; const sendCommand = (command: ChatCommand) => {
        if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
            addSystemMessage('Cannot send command: Chat is not connected.', 'error');
            console.error('Attempted to send command, but WebSocket is not open or available.');
            return;
        }

        if (isGenerating) {
            addSystemMessage('Please wait for the current operation to complete before sending another command.', 'error');
            return;
        }

        // Add user message showing the command being executed
        const commandMessage: Message = {
            id: Date.now().toString() + Math.random().toString(),
            content: `Executing command: ${command.name}`,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, commandMessage]);
        setIsGenerating(true); // Start generating

        try {
            webSocketRef.current.send(JSON.stringify({
                type: 'command',
                name: command.name,
                params: command.params
            }));
        } catch (error) {
            console.error('Failed to send command via WebSocket:', error);
            addSystemMessage('Failed to send command. Please try again.', 'error');
            setIsGenerating(false); // Stop generating on error
        }
    }; const contextValue: ChatContextType = {
        messages,
        inputValue,
        setInputValue,
        sendMessage,
        sendCommand,
        isChatConnected,
        chatError,
        isGenerating,
    };

    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
