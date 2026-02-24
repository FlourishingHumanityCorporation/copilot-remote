import { Box, Text } from '@primer/react';

interface Props {
  connected: boolean;
}

export function ConnectionStatus({ connected }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bg: connected ? 'success.fg' : 'danger.fg',
        }}
      />
      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
        {connected ? 'Connected' : 'Disconnected'}
      </Text>
    </Box>
  );
}
