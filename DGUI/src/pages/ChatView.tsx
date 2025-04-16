const ChatView = () => {
    return (
        <div className="w-1/3 bg-white shadow-sm rounded-lg m-3 ml-0 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800">Chat Assistant</h3>
                <p className="text-sm text-gray-500">Ask questions about your project</p>
            </div>
            <div className="flex-1 p-4 overflow-auto">
                <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p>Ask a question about your document</p>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-gray-200">
                <div className="flex">
                    <input
                        type="text"
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Type your question here..."
                    />
                    <button title="Send" className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
export default ChatView;