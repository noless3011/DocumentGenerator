import React from 'react';
import { Message } from '../../models/Message';

interface MessageComponentProps {
    message: Message;
}

const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {

    const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isUser = message.sender === 'user';
    const isAssistant = message.sender === 'assistant';
    const isSystem = message.sender === 'system';

    let bgColor = 'bg-gray-100 text-gray-800';
    let textAlign = 'justify-start';
    let senderName = 'Assistant';

    if (isUser) {
        bgColor = 'bg-blue-500 text-white';
        textAlign = 'justify-end';
        senderName = 'You';
    } else if (isSystem) {
        bgColor = 'bg-yellow-100 text-yellow-800';
        senderName = 'System';
    }

    return (
        <div
            className={`flex my-2 px-2 ${textAlign}`}
            key={message.id}
        >
            <div
                className={`max-w-xl md:max-w-2xl rounded-lg px-4 py-2 shadow-sm ${bgColor}`}
            >
                <div className="message-content whitespace-pre-wrap break-words">
                    {message.content}
                </div>
                <div className={`text-xs mt-1 ${isUser ? 'text-blue-100 text-right' : 'text-gray-500 text-left'}`}>
                    {senderName} - {formattedTime}
                </div>
            </div>
        </div>
    );
};

export default MessageComponent;