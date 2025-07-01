"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ProcessResponse {
  message: string;
  hash: string;
  total_pages: number;
}

interface QueryResponse {
  query: string;
  keywords: string;
  answer: string;
  total_results: number;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

// Simple markdown renderer component
const MarkdownContent = ({ content }: { content: string }) => {
  const renderMarkdown = (text: string) => {
    // Split by double newlines to handle paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Handle bold text **text**
      let processedText = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Handle italic text *text*
      processedText = processedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Handle inline code `code`
      processedText = processedText.replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
      
      // Handle line breaks within paragraphs
      processedText = processedText.replace(/\n/g, '<br />');
      
      // Check if it's a list item
      if (processedText.trim().match(/^\d+\./)) {
        return (
          <div key={index} className="mb-2">
            <div dangerouslySetInnerHTML={{ __html: processedText }} />
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="mb-4 last:mb-0">
          <span dangerouslySetInnerHTML={{ __html: processedText }} />
        </p>
      );
    });
  };

  return <div className="text-gray-100 leading-relaxed">{renderMarkdown(content)}</div>;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<ProcessResponse | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data: ProcessResponse = await response.json();
      setUploadResponse(data);
      setMessages([{ 
        type: 'assistant', 
        content: `PDF uploaded successfully! I've processed ${data.total_pages} pages. You can now ask me questions about the document.` 
      }]);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!uploadResponse?.hash || !query.trim()) return;

    setIsQuerying(true);
    setError(null);
    const currentQuery = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { type: 'user', content: currentQuery }]);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hash: uploadResponse.hash,
          query: currentQuery,
        }),
      });

      if (!response.ok) {
        throw new Error("Query failed");
      }

      const data: QueryResponse = await response.json();
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: `${data.answer}\n\n**Keywords**: ${data.keywords}` 
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to query");
    } finally {
      setIsQuerying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      {/* Main content area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Messages Section */}
        <div className="flex-1 overflow-y-auto">
          {!uploadResponse ? (
            <div className="h-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
              <div className="max-w-2xl w-full px-4 sm:px-0">
                {/* Welcome Section */}
                <div className="text-center mb-6 sm:mb-8">
                  <div className="mb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">Chat with PDF</h1>
                    <p className="text-gray-400 text-base sm:text-lg px-4 sm:px-0">Upload your PDF and start asking questions</p>
                  </div>
                </div>

                {/* Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 lg:p-12 text-center transition-all duration-300 ${
                    isDragging 
                      ? "border-blue-400 bg-blue-500/10 scale-105" 
                      : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/20"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {!file ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex justify-center">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isDragging ? "bg-blue-500/20 scale-110" : "bg-gray-700/50"
                        }`}>
                          <svg className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${
                            isDragging ? "text-blue-400" : "text-gray-400"
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3 px-2 sm:px-0">
                        <p className="text-lg sm:text-xl font-medium text-gray-200">
                          {isDragging ? "Drop your PDF here" : "Drag and drop your PDF"}
                        </p>
                        <p className="text-gray-400">or</p>
                        <label className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors duration-200 text-sm sm:text-base">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Choose File
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf"
                            onChange={handleFileChange}
        />
                        </label>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-gray-500">
                        <p>Supports PDF files up to 10MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="space-y-3 px-2 sm:px-0">
                        <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-base sm:text-lg font-medium text-gray-200 truncate">{file.name}</p>
                        </div>
                        <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        
                        {!isUploading ? (
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-center px-4 sm:px-0">
                            <button
                              onClick={handleUpload}
                              className="w-full sm:w-auto px-6 py-2 sm:px-8 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                              </svg>
                              <span>Upload PDF</span>
                            </button>
                            <button
                              onClick={() => setFile(null)}
                              className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors duration-200 text-sm sm:text-base"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 px-4 sm:px-0">
                            <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-blue-400">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span className="font-medium text-sm sm:text-base">Processing your PDF...</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center px-2 sm:px-0">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl mx-auto flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-200 text-sm sm:text-base">Fast Processing</h3>
                    <p className="text-xs sm:text-sm text-gray-400">Quick PDF analysis and indexing</p>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl mx-auto flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-200 text-sm sm:text-base">Smart Q&A</h3>
                    <p className="text-xs sm:text-sm text-gray-400">Ask questions in natural language</p>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl mx-auto flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-200 text-sm sm:text-base">Secure</h3>
                    <p className="text-xs sm:text-sm text-gray-400">Your documents are processed securely</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-4 sm:px-8 lg:px-16 xl:px-24 space-y-4 max-w-6xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`flex gap-3 max-w-[80%] sm:max-w-[75%] lg:max-w-[70%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md">
                      {message.type === 'assistant' ? (
                        <div className="bg-gradient-to-br from-green-500 to-green-600 w-full h-full flex items-center justify-center rounded-full">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                          </svg>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-full h-full flex items-center justify-center rounded-full">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex flex-col">
                      <div className={`px-4 py-3 rounded-2xl shadow-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-md' 
                          : 'bg-[#444654] text-gray-100 rounded-bl-md border border-gray-600/50'
                      }`}>
                        <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                          <MarkdownContent content={message.content} />
                        </div>
                      </div>
                      
                      {/* Timestamp and Actions */}
                      <div className={`flex items-center gap-2 mt-2 px-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {/* Message Actions - Only show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button 
                            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded-md transition-all duration-200"
                            title="Copy message"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          {message.type === 'assistant' && (
                            <>
                              <button 
                                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded-md transition-all duration-200"
                                title="Like message"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                              </button>
                              <button 
                                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded-md transition-all duration-200"
                                title="Regenerate response"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isQuerying && (
                <div className="flex justify-start group">
                  <div className="flex gap-3 max-w-[80%] sm:max-w-[75%] lg:max-w-[70%]">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 w-full h-full flex items-center justify-center rounded-full">
                        <svg className="w-4 h-4 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Typing indicator */}
                    <div className="flex flex-col">
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#444654] border border-gray-600/50 shadow-lg">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-2 justify-start">
                        <span className="text-xs text-gray-500">ChatPDF is typing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Section */}
        {uploadResponse && (
          <div className="border-t border-gray-700/50 bg-[#343541] p-4 sm:p-6">
            <div className="max-w-3xl mx-auto px-2 sm:px-0">
              <div className="relative bg-[#40414f] rounded-xl border border-gray-600/50 shadow-lg">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your PDF..."
                  className="w-full p-4 pr-14 bg-transparent border-none rounded-xl resize-none text-gray-100 focus:outline-none placeholder-gray-400 text-sm sm:text-base leading-relaxed"
                  rows={1}
                  style={{
                    minHeight: '52px',
                    maxHeight: '200px'
                  }}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-2">
                  <button
                    onClick={handleQuery}
                    disabled={isQuerying || !query.trim()}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      query.trim() && !isQuerying
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isQuerying ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Press Enter to send, Shift + Enter for new line
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-900/80 text-red-100 px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
