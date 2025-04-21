import { useState, useEffect, useRef } from "react";
import ChatWindow from "../components/ChatSideBar/ChatWindow";
import ContextFileList from "../components/ChatSideBar/ContextFileList";
import { Message } from "../models/Message";
import MessageComponent from "../components/ChatSideBar/Messages";




const ChatView = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            content: "Hello! How can I assist you today?",
            sender: "ai",
            timestamp: new Date(),
        },
        {
            id: "2",
            content: "I need help with my project.",
            sender: "user",
            timestamp: new Date(),
        },
        {
            id: "3",
            content: "Sure! What specifically do you need help with?",
            sender: "ai",
            timestamp: new Date(),
        },
        {
            id: "4",
            content: "I have a question about the API.",
            sender: "user",
            timestamp: new Date(),
        },
        {
            id: "1",
            content: "Hello! How can I assist you today?",
            sender: "ai",
            timestamp: new Date(),
        },
        {
            id: "2",
            content: "I need help with my project.",
            sender: "user",
            timestamp: new Date(),
        },
        {
            id: "3",
            content: "Sure! What specifically do you need help with?",
            sender: "ai",
            timestamp: new Date(),
        },
        {
            id: "4",
            content: "I have a question about the API.",
            sender: "user",
            timestamp: new Date(),
        },
        {
            id: "1",
            content: "Hello! How can I assist you today?",
            sender: "ai",
            timestamp: new Date(),
        },
        {
            id: "2",
            content: "I need help with my project.",
            sender: "user",
            timestamp: new Date(),
        },
        {
            id: "3",
            content: "Sure! What specifically do you need help with?",
            sender: "ai",
            timestamp: new Date(),
        },
        {
            id: "4",
            content: "I have a question about the API.",
            sender: "user",
            timestamp: new Date(),
        },
    ]);

    const [isDragging, setIsDragging] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);


    return (
        <div ref={containerRef} className="w-full h-full shadow-sm rounded-lg pb-5 m-3 ml-0 flex flex-col relative">
            {/* Chat history with dynamic height */}
            <div
                className="flex flex-col bg-black/5 w-full overflow-y-auto overflow-x-hidden h-[85%]"
            >
                {messages.map((message, index) => (
                    <MessageComponent key={index} message={message} />
                ))}
            </div>

            <ContextFileList />
            <ChatWindow />
            <div className="h-10 flex flex-row w-full">
                <button
                    className="px-4 py-2 rounded-md hover:bg-black/25 ml-auto mr-2 my-1 flex items-center"
                    title="Send message"
                >
                    <span className="mr-1">Send</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatView;