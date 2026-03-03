import { Box, Text, IconButton } from '@primer/react';
import { XIcon, DownloadIcon } from '@primer/octicons-react';

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 2,
        bg: 'accent.subtle',
        borderBottom: '1px solid',
        borderColor: 'accent.muted',
      }}
      role="banner"
      aria-label="Install app"
    >
      <DownloadIcon size={16} />
      <Text sx={{ flex: 1, fontSize: 1, color: 'fg.default' }}>
        Add Copilot Remote to your home screen for the best experience.
      </Text>
      <button
        onClick={onInstall}
        aria-label="Install app"
        style={{
          padding: '4px 12px',
          borderRadius: 6,
          background: '#238636',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        Install
      </button>
      <IconButton
        icon={XIcon}
        aria-label="Dismiss install banner"
        variant="invisible"
        size="small"
        onClick={onDismiss}
      />
    </Box>
  );
}
