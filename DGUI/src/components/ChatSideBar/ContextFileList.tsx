const ContextFileList = () => {
    return (<div className="flex flex-row h-fit w-full bg-white">
        <span className="pl-3 border-2 rounded-full m-1 flex flex-row items-center hover:bg-blue-600/25">
            File 1
            <button title="close" className="w-fit h-fit ml-4 mr-2 overflow-hidden rounded-full hover:bg-black/25">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" />
                </svg>
            </button>
        </span>

    </div>)


}
export default ContextFileList;