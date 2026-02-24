import { useRef, useEffect, useState, useCallback } from 'react';
import { Box, TextInput, IconButton, Text, Label } from '@primer/react';
import { PaperAirplaneIcon, SquareIcon } from '@primer/octicons-react';
import { MessageBubble } from './MessageBubble';
import { api } from '../lib/api';
import type { Session, ChatMessage } from '../types';

interface Props {
  session: Session;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function ChatView({ session, messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const [historicalMessages, setHistoricalMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load historical messages when session changes
  useEffect(() => {
    api.getSession(session.id)
      .then(data => setHistoricalMessages(data.messages || []))
      .catch(() => setHistoricalMessages([]));
  }, [session.id]);

  // Auto-scroll to bottom on new messages
  const allMessages = [...historicalMessages, ...messages];
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  }, [input, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleKill = useCallback(async () => {
    try {
      await api.killSession(session.id);
    } catch {
      // Ignore
    }
  }, [session.id]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* Session header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'border.default', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Text sx={{ fontWeight: 'bold', fontSize: 1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.summary || session.id.slice(0, 12)}
          </Text>
          <Text sx={{ color: 'fg.muted', fontSize: 0 }}>{session.cwd}</Text>
        </Box>
        <Label variant={session.status === 'running' ? 'success' : 'secondary'}>
          {session.status}
        </Label>
        {session.status === 'running' && (
          <IconButton
            icon={SquareIcon}
            aria-label="Stop session"
            variant="danger"
            size="small"
            onClick={handleKill}
          />
        )}
      </Box>

      {/* Messages area — use overflow-y scroll with explicit constraints */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          py: 3,
        }}
      >
        {allMessages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
              {session.status === 'running' ? 'Waiting for output...' : 'No messages in this session'}
            </Text>
          </Box>
        )}
        {allMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </Box>

      {/* Input area */}
      {session.status === 'running' && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'border.default', display: 'flex', gap: 2 }}>
          <TextInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            sx={{ flex: 1 }}
            autoFocus
          />
          <IconButton
            icon={PaperAirplaneIcon}
            aria-label="Send"
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim()}
          />
        </Box>
      )}
    </Box>
  );
}
