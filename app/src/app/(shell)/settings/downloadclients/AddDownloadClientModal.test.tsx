import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddDownloadClientModal, type DownloadClientPreset } from './AddDownloadClientModal';

const presets: DownloadClientPreset[] = [
  {
    id: 'transmission',
    name: 'Transmission',
    description: 'Popular BitTorrent client',
    protocol: 'torrent',
    implementation: 'Transmission',
    configContract: 'TransmissionSettings',
    fields: [
      { name: 'useSsl', label: 'Use SSL', type: 'boolean', required: true, defaultValue: false },
    ],
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'Free BitTorrent client',
    protocol: 'torrent',
    implementation: 'QBittorrent',
    configContract: 'QBittorrentSettings',
    fields: [
      { name: 'useSsl', label: 'Use SSL', type: 'boolean', required: true, defaultValue: false },
    ],
  },
  {
    id: 'sabnzbd',
    name: 'SABnzbd',
    description: 'Usenet download client',
    protocol: 'usenet',
    implementation: 'Sabnzbd',
    configContract: 'SabnzbdSettings',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
];

describe('AddDownloadClientModal', () => {
  it('renders client type choices and switches fields when selection changes', () => {
    render(
      <AddDownloadClientModal
        isOpen
        presets={presets}
        onClose={() => {}}
        onCreate={() => {}}
        onTestConnection={async () => ({ success: true, message: 'ok', hints: [] })}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Add download client' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transmission/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /qBittorrent/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SABnzbd/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /SABnzbd/ }));

    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
  });

  it('submits payload using selected preset and form values', async () => {
    const onCreate = vi.fn();

    render(
      <AddDownloadClientModal
        isOpen
        presets={presets}
        onClose={() => {}}
        onCreate={onCreate}
        onTestConnection={async () => ({ success: true, message: 'ok', hints: [] })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Client' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: '192.168.1.100' } });
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '9092' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'movies' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Download Client' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Client',
          host: '192.168.1.100',
          port: 9092,
          category: 'movies',
          enabled: true,
          priority: 1,
          protocol: 'torrent',
        }),
      );
    });
  });

  it('shows validation errors when required fields are missing', async () => {
    const onCreate = vi.fn();

    render(
      <AddDownloadClientModal
        isOpen
        presets={presets}
        onClose={() => {}}
        onCreate={onCreate}
        onTestConnection={async () => ({ success: true, message: 'ok', hints: [] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Download Client' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('runs connection test and renders diagnostics', async () => {
    const onTestConnection = vi.fn().mockResolvedValue({
      success: false,
      message: 'Connection failed',
      hints: ['Check host and port', 'Verify credentials'],
    });

    render(
      <AddDownloadClientModal
        isOpen
        presets={presets}
        onClose={() => {}}
        onCreate={() => {}}
        onTestConnection={onTestConnection}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Client' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(onTestConnection).toHaveBeenCalled();
    });

    expect(await screen.findByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('Check host and port')).toBeInTheDocument();
    expect(screen.getByText('Verify credentials')).toBeInTheDocument();
  });

  it('supports optional username and password fields', async () => {
    const onCreate = vi.fn();

    render(
      <AddDownloadClientModal
        isOpen
        presets={presets}
        onClose={() => {}}
        onCreate={onCreate}
        onTestConnection={async () => ({ success: true, message: 'ok', hints: [] })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Secured Client' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'localhost' } });
    fireEvent.change(screen.getByLabelText('Username (optional)'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password (optional)'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Download Client' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          password: 'secret',
        }),
      );
    });
  });

  it('switches default port based on client type', async () => {
    render(
      <AddDownloadClientModal
        isOpen
        presets={presets}
        onClose={() => {}}
        onCreate={() => {}}
        onTestConnection={async () => ({ success: true, message: 'ok', hints: [] })}
      />,
    );

    expect(screen.getByDisplayValue('9091')).toBeInTheDocument(); // Transmission default

    fireEvent.click(screen.getByRole('button', { name: /qBittorrent/ }));
    expect(screen.getByDisplayValue('8080')).toBeInTheDocument(); // qBittorrent default

    fireEvent.click(screen.getByRole('button', { name: /SABnzbd/ }));
    expect(screen.getByDisplayValue('8080')).toBeInTheDocument(); // SABnzbd default
  });
});
