import { useChat } from "../../provider/ChatProvider";
import { useEffect } from "react";
const ChatWindow = () => {
    const { inputValue, setInputValue, sendMessage, messages, isGenerating } = useChat();

    const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(event.target.value);
        event.target.style.height = 'auto';
        event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
    };

    useEffect(() => {
        const chatContainer = document.querySelector('.overflow-y-scroll');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]); return (<div className="overflow-y-scroll">
        <textarea
            title="chat"
            name="Chat"
            className={`w-full px-3 py-2 overflow-y-scroll focus:border-none outline-none resize-none max-h-32 ${isGenerating ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                }`}
            placeholder={isGenerating ? "AI is generating response..." : "Type your message here..."}
            value={inputValue}
            style={{ overflow: 'hidden' }}
            onChange={handleTextAreaChange}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                    e.preventDefault();
                    sendMessage();
                }
            }}
            disabled={isGenerating} />
    </div>)
}

export default ChatWindow;