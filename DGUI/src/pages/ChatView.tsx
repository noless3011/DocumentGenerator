import { useRef } from "react";
import ChatWindow from "../components/ChatSideBar/ChatWindow";
import ContextFileList from "../components/ChatSideBar/ContextFileList";
import MessageComponent from "../components/ChatSideBar/Messages";
import { useChat } from "../provider/ChatProvider";
import { Message } from "../models/Message"; // Added Message import from models

const ChatView = () => {
    const { messages, sendMessage, isGenerating } = useChat();

    const containerRef = useRef<HTMLDivElement>(null); return (
        <div ref={containerRef} className="flex flex-col-reverse flex-1 h-full">
            <div className="flex flex-row w-full">
                <button
                    className={`px-4 py-2 rounded-md ml-auto mr-2 my-1 flex items-center ${isGenerating
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'hover:bg-black/25'
                        }`}
                    title={isGenerating ? "AI is generating response..." : "Send message"}
                    onClick={sendMessage}
                    disabled={isGenerating}
                >
                    <span className="mr-1">{isGenerating ? "Generating..." : "Send"}</span>
                    {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                        </svg>
                    )}
                </button>
            </div>
            <ChatWindow />
            <ContextFileList />
            <div
                className="bg-black/5 w-full overflow-y-scroll overflow-x-hidden flex-1"
            >
                <div className="w-full h-fit">
                    {messages.map((message: Message) => ( // Added Message type to message parameter
                        <MessageComponent key={message.id} message={message} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatView;
