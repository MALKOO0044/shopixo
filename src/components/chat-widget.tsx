"use client";

import React, { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages: Msg[] = [...messages, { role: 'user' as const, content: text }];
    setMessages((m) => [...m, { role: 'user' as const, content: text }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok || !data) throw new Error(data?.error || res.statusText);
      const reply = (data.reply as string) || 'An error occurred. Please try again.';
      setMessages((m) => [...m, { role: 'assistant' as const, content: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant' as const, content: 'Unable to get a response right now.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-indigo-600 text-white w-14 h-14 shadow-lg hover:bg-indigo-700"
        aria-label="Open chat"
      >
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 rounded-lg border bg-white shadow-xl flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium">Store Assistant</div>
          <div ref={listRef} className="flex-1 p-3 space-y-2 overflow-auto max-h-96">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === 'assistant' ? '' : 'text-right'}>
                <div className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role === 'assistant' ? 'bg-indigo-50 text-slate-900' : 'bg-slate-100'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs opacity-70">Typing...</div>}
          </div>
          <div className="p-2 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Type your message..."
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button onClick={send} disabled={sending} className="rounded bg-indigo-600 text-white px-3 py-2 text-sm disabled:opacity-50">Send</button>
          </div>
          <div className="px-3 pb-2 text-[10px] text-slate-500">
            Tip: Check your orders on the <a href="/order-tracking" className="underline">order tracking</a> page.
          </div>
        </div>
      )}
    </div>
  );
}
