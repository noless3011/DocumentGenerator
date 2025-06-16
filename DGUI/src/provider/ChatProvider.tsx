import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Message } from '../models/Message';
import { useProjects } from './ProjectProvider';

interface ChatContextType {
    messages: Message[];
    inputValue: string;
    setInputValue: (value: string) => void;
    sendMessage: () => void;
    sendCommand: (command: { name: string; params?: Record<string, any> }) => void;
    isConnected: boolean;
    isGenerating: boolean;
    clearMessages: () => void;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
    children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

    const { currentProject, getProjectDetails } = useProjects();
    const chatWebSocketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const maxReconnectAttempts = 5;

    // Generate unique message ID
    const generateMessageId = useCallback(() => {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Add message to chat
    const addMessage = useCallback((message: Omit<Message, 'id'>) => {
        const newMessage: Message = {
            ...message,
            id: generateMessageId(),
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
    }, [generateMessageId]);

    // Connect to chat WebSocket
    const connectChatWebSocket = useCallback((projectId: string) => {
        // Check if WebSocket is already connected to prevent duplicates in StrictMode
        if (chatWebSocketRef.current &&
            chatWebSocketRef.current.readyState === WebSocket.OPEN &&
            chatWebSocketRef.current.url.endsWith(`/chat/${projectId}`)) {
            console.log(`[ChatProvider] Chat WebSocket already connected to project: ${projectId}`);
            return;
        }

        // Close any existing connection before creating a new one
        if (chatWebSocketRef.current) {
            chatWebSocketRef.current.close();
        }

        setConnectionStatus('connecting');
        const wsUrl = `ws://localhost:5000/ws/chat/${projectId}`;
        const ws = new WebSocket(wsUrl);
        chatWebSocketRef.current = ws;

        ws.onopen = () => {
            console.log(`[ChatProvider] Chat WebSocket connected to project: ${projectId}`);
            setIsConnected(true);
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;

            // Add connection message
            addMessage({
                content: `Connected to chat for project ${projectId}`,
                sender: 'system',
                timestamp: new Date().toISOString(),
                projectId
            });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data, projectId);
            } catch (e) {
                console.error('[ChatProvider] Error parsing WebSocket message:', e);
                addMessage({
                    content: 'Error parsing server message',
                    sender: 'system',
                    timestamp: new Date().toISOString(),
                    projectId
                });
            }
        };

        ws.onerror = (error) => {
            console.error('[ChatProvider] Chat WebSocket error:', error);
            setConnectionStatus('error');
            addMessage({
                content: 'Connection error occurred',
                sender: 'system',
                timestamp: new Date().toISOString(),
                projectId
            });
        };

        ws.onclose = (event) => {
            console.log(`[ChatProvider] Chat WebSocket disconnected: Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
            setIsConnected(false);
            setConnectionStatus('disconnected');
            setIsGenerating(false);

            if (chatWebSocketRef.current === ws) {
                chatWebSocketRef.current = null;
            }

            // Attempt to reconnect if it wasn't a clean close and we haven't exceeded max attempts
            if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts && currentProject?.id) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
                reconnectAttemptsRef.current++;

                console.log(`[ChatProvider] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    if (currentProject?.id) {
                        connectChatWebSocket(currentProject.id);
                    }
                }, delay);

                addMessage({
                    content: `Connection lost. Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
                    sender: 'system',
                    timestamp: new Date().toISOString(),
                    projectId
                });
            } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                addMessage({
                    content: 'Maximum reconnection attempts reached. Please refresh the page.',
                    sender: 'system',
                    timestamp: new Date().toISOString(),
                    projectId
                });
            }
        };
    }, [addMessage, currentProject?.id]);

    // Handle incoming WebSocket messages
    const handleWebSocketMessage = useCallback((data: any, projectId: string) => {
        switch (data.type) {
            case 'ai_response':
                setIsGenerating(false);
                addMessage({
                    content: data.text || 'No response received',
                    sender: 'assistant',
                    timestamp: new Date().toISOString(),
                    projectId
                });
                break; case 'system_message':
                setIsGenerating(false);
                addMessage({
                    content: data.text || 'System notification',
                    sender: 'system',
                    timestamp: new Date().toISOString(),
                    projectId
                });

                // If the message indicates a file was created/modified, refresh project data
                const messageText = data.text || '';
                if (messageText.includes('generated') ||
                    messageText.includes('created') ||
                    messageText.includes('saved') ||
                    messageText.includes('Prototype') ||
                    messageText.includes('Document') ||
                    messageText.includes('Diagram')) {
                    // Refresh project details to get updated file list
                    getProjectDetails().catch(error => {
                        console.error('[ChatProvider] Failed to refresh project after file creation:', error);
                    });
                }
                break;

            case 'error_message':
                setIsGenerating(false);
                addMessage({
                    content: data.text || 'An error occurred',
                    sender: 'system',
                    timestamp: new Date().toISOString(),
                    projectId
                });
                break;

            case 'file_content':
                addMessage({
                    content: data.content || '',
                    sender: 'assistant',
                    timestamp: new Date().toISOString(),
                    projectId,
                    filename: data.filename,
                    language: data.lang || data.language
                });
                break;

            default:
                console.warn('[ChatProvider] Unknown message type:', data.type);
                break;
        }
    }, [addMessage, getProjectDetails]);

    // Disconnect chat WebSocket
    const disconnectChatWebSocket = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (chatWebSocketRef.current) {
            chatWebSocketRef.current.close();
            chatWebSocketRef.current = null;
        }

        setIsConnected(false);
        setConnectionStatus('disconnected');
        setIsGenerating(false);
        reconnectAttemptsRef.current = 0;
    }, []);

    // Send a text message
    const sendMessage = useCallback(() => {
        if (!inputValue.trim() || !isConnected || !chatWebSocketRef.current || isGenerating) {
            return;
        }

        const userMessage = {
            content: inputValue.trim(),
            sender: 'user' as const,
            timestamp: new Date().toISOString(),
            projectId: currentProject?.id
        };

        // Add user message to chat
        addMessage(userMessage);

        // Send to server
        const messageData = {
            type: 'chat',
            text: inputValue.trim()
        };

        try {
            chatWebSocketRef.current.send(JSON.stringify(messageData));
            setIsGenerating(true);
            setInputValue('');
        } catch (error) {
            console.error('[ChatProvider] Error sending message:', error);
            setIsGenerating(false);
            addMessage({
                content: 'Failed to send message. Please try again.',
                sender: 'system',
                timestamp: new Date().toISOString(),
                projectId: currentProject?.id
            });
        }
    }, [inputValue, isConnected, isGenerating, currentProject?.id, addMessage]);

    // Send a command
    const sendCommand = useCallback((command: { name: string; params?: Record<string, any> }) => {
        if (!isConnected || !chatWebSocketRef.current || isGenerating) {
            console.warn('[ChatProvider] Cannot send command: not connected or generating');
            return;
        }

        const commandData = {
            type: 'command',
            name: command.name,
            params: command.params || {}
        };

        try {
            chatWebSocketRef.current.send(JSON.stringify(commandData));
            setIsGenerating(true);

            // Add command message to chat for user feedback
            addMessage({
                content: `Executing command: ${command.name}`,
                sender: 'system',
                timestamp: new Date().toISOString(),
                projectId: currentProject?.id
            });
        } catch (error) {
            console.error('[ChatProvider] Error sending command:', error);
            setIsGenerating(false);
            addMessage({
                content: `Failed to execute command: ${command.name}`,
                sender: 'system',
                timestamp: new Date().toISOString(),
                projectId: currentProject?.id
            });
        }
    }, [isConnected, isGenerating, currentProject?.id, addMessage]);

    // Clear all messages
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);    // Effect to handle project changes
    useEffect(() => {
        if (currentProject?.id) {
            // Clear messages when switching projects
            clearMessages();
            connectChatWebSocket(currentProject.id);
        } else {
            disconnectChatWebSocket();
        }

        // Cleanup on unmount or project change
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            // Ensure WebSocket is properly closed when project changes
            if (chatWebSocketRef.current) {
                chatWebSocketRef.current.close();
                chatWebSocketRef.current = null;
            }
        };
    }, [currentProject?.id, connectChatWebSocket, disconnectChatWebSocket, clearMessages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnectChatWebSocket();
        };
    }, [disconnectChatWebSocket]);

    const value: ChatContextType = {
        messages,
        inputValue,
        setInputValue,
        sendMessage,
        sendCommand,
        isConnected,
        isGenerating,
        clearMessages,
        connectionStatus
    };

    return (
        <ChatContext.Provider value={value}>
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