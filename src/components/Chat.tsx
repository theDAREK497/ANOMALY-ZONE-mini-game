import React, { useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success' | 'loot';
}

interface ChatProps {
  messages: ChatMessage[];
}

export function Chat({ messages }: ChatProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getColor = (type: string) => {
    switch (type) {
      case 'danger': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'loot': return 'text-purple-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 font-bold text-gray-200">
        Журнал событий
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-gray-500 italic text-sm text-center mt-4">Событий пока нет...</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`text-sm ${getColor(msg.type)}`}>
              <span className="opacity-50 mr-2">&gt;</span>
              {msg.text}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
