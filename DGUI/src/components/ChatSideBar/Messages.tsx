import React from 'react';
import { Message } from '../../models/Message';

interface MessageComponentProps {
    message: Message;
}

const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
    // Format the timestamp
    const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div
            className={`flex my-2 px-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
            key={message.id}
        >
            <div
                className={`max-w-3xl rounded-lg px-4 py-2 ${message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                    }`}
            >
                <div className="message-content whitespace-pre-wrap">
                    {message.content}
                </div>
                <div className={`text-xs mt-1 text-right ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                    {formattedTime}
                </div>
            </div>
        </div>
    );
};

export default MessageComponent;