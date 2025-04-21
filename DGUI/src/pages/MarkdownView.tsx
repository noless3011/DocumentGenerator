import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownViewProps {
    fileDir: string;
    className?: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ fileDir, className }) => {
    const content = "# This is a test markdown content";
    const [markdownContent, setMarkdownContent] = useState<string>(content);

    useEffect(() => {
        // Load markdown content from file
        const currentFileDir = fileDir;
        window.myAPI.readFileAsText(currentFileDir)
            .then((data: string) => {
                setMarkdownContent(data);
            })

    }, [fileDir]);

    return (
        <div className={`h-full markdown-view bg-transparent p-6 ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={vscDarkPlus as Record<string, React.CSSProperties>}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {markdownContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownView;