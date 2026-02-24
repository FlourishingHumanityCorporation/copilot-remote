import { Box, Text, ActionList, Button, Spinner, Label, RelativeTime } from '@primer/react';
import { PlusIcon, SyncIcon } from '@primer/octicons-react';
import type { Session } from '../types';

interface Props {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRefresh: () => void;
}

export function SessionList({ sessions, loading, error, activeId, onSelect, onNew, onRefresh }: Props) {
  const statusColor = (s: Session['status']) => {
    switch (s) {
      case 'running': return 'success.fg';
      case 'idle': return 'attention.fg';
      case 'exited': return 'fg.muted';
    }
  };

  const statusLabel = (s: Session['status']) => {
    switch (s) {
      case 'running': return 'Running';
      case 'idle': return 'Idle';
      case 'exited': return 'Ended';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Text sx={{ fontWeight: 'bold', fontSize: 1, color: 'fg.default', flex: 1 }}>Sessions</Text>
        <Button size="small" leadingVisual={SyncIcon} onClick={onRefresh} variant="invisible" aria-label="Refresh" />
        <Button size="small" leadingVisual={PlusIcon} onClick={onNew} variant="primary">New</Button>
      </Box>

      {loading && <Box sx={{ textAlign: 'center', py: 4 }}><Spinner size="small" /></Box>}
      {error && <Text sx={{ color: 'danger.fg', fontSize: 0 }}>{error}</Text>}

      <ActionList>
        {sessions.map(session => (
          <ActionList.Item
            key={session.id}
            active={session.id === activeId}
            onSelect={() => onSelect(session.id)}
          >
            <ActionList.LeadingVisual>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bg: statusColor(session.status) }} />
            </ActionList.LeadingVisual>
            <Box sx={{ overflow: 'hidden' }}>
              <Text sx={{ fontSize: 1, fontWeight: session.id === activeId ? 'bold' : 'normal', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.summary || session.cwd.split('/').pop() || session.id.slice(0, 8)}
              </Text>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <Label variant={session.status === 'running' ? 'success' : 'secondary'} sx={{ fontSize: 0 }}>
                  {statusLabel(session.status)}
                </Label>
                <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
                  <RelativeTime date={new Date(session.updatedAt)} />
                </Text>
              </Box>
            </Box>
          </ActionList.Item>
        ))}
        {!loading && sessions.length === 0 && (
          <Text sx={{ color: 'fg.muted', fontSize: 1, p: 3, textAlign: 'center', display: 'block' }}>
            No sessions found
          </Text>
        )}
      </ActionList>
    </Box>
  );
}
