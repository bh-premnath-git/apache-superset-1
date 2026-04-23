import React from 'react';
import { createRoot } from 'react-dom/client';

function ChatbotPlaceholder() {
  return (
    <div style={{ padding: 12, fontFamily: 'sans-serif' }}>
      <h3>Dashboard Chatbot Extension</h3>
      <p>Frontend scaffold loaded. Connect to backend `/ask` endpoint next.</p>
    </div>
  );
}

export function mount(el: HTMLElement) {
  const root = createRoot(el);
  root.render(<ChatbotPlaceholder />);
}
