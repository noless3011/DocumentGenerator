const ChatWindow = () => {
    return (<div className="overflow-y-scroll">
        <textarea
            title="chat"
            name="Chat"
            className="w-full h-fit px-3 py-2 overflow-y-scroll bg-white focus:border-none outline-none resize-none max-h-32"
            placeholder="Type your message here..."
            style={{ overflow: 'hidden' }}
            onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;

            }}
        />
    </div>)
}

export default ChatWindow;