
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ChatSession, Attachment } from '../types';

interface ChatWindowProps {
  session: ChatSession;
  messages: Message[];
  currentUser: User;
  users: User[];
  onSendMessage: (text?: string, attachment?: Attachment) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, messages, currentUser, users, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const isImage = file.type.startsWith('image/');
      onSendMessage(undefined, {
        name: file.name,
        url: url,
        mimeType: file.type,
        size: file.size,
        isImage
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderAttachment = (attachment: Attachment) => {
    if (attachment.isImage) {
      return (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-full">
          <img src={attachment.url} alt={attachment.name} className="max-w-full h-auto block" />
        </div>
      );
    }
    return (
      <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 max-w-full">
        <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold truncate dark:text-gray-200">{attachment.name}</p>
          <p className="text-[9px] sm:text-[10px] text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
        </div>
        <a 
          href={attachment.url} 
          download={attachment.name}
          className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-400 hover:text-primary transition-colors shrink-0"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none pointer-events-none text-center p-4">
            <svg className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const sender = users.find(u => u.id === msg.senderId) || currentUser;
          const isMeSent = msg.senderId === currentUser.id;
          
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMeSent ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="relative flex-shrink-0">
                <img src={sender.avatar} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-100 dark:border-gray-800 object-cover" alt={sender.name} />
                {sender.status === 'online' && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-gray-900 rounded-full"></span>
                )}
              </div>
              
              <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMeSent ? 'items-end' : 'items-start'}`}>
                {session.type === 'group' && !isMeSent && (
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 mb-0.5 ml-1">{sender.name}</span>
                )}
                <div className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-sm text-sm ${
                  isMeSent 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}>
                  {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                  {msg.attachment && renderAttachment(msg.attachment)}
                </div>
                <span className="text-[8px] sm:text-[9px] text-gray-400 mt-1 block px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".jpg,.jpeg,.png,.gif,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.pdf"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors shrink-0"
            title="Attach a file"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white text-sm"
          />
          
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-primary text-white p-2 sm:p-2.5 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20 shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
