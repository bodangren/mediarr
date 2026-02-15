import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditDownloadClientModal, type EditDownloadClientSource } from './EditDownloadClientModal';

const client: EditDownloadClientSource = {
  id: 1,
  name: 'Transmission Client',
  implementation: 'Transmission',
  configContract: 'TransmissionSettings',
  settings: '{"useSsl":true}',
  protocol: 'torrent',
  host: 'localhost',
  port: 9091,
  category: 'movies',
  priority: 1,
  enabled: true,
};

describe('EditDownloadClientModal', () => {
  it('renders pre-populated values from the client source', () => {
    render(
      <EditDownloadClientModal
        isOpen
        client={client}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Edit download client' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Transmission Client')).toBeInTheDocument();
    expect(screen.getByDisplayValue('localhost')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9091')).toBeInTheDocument();
    expect(screen.getByDisplayValue('movies')).toBeInTheDocument();
  });

  it('submits edited values through save action', async () => {
    const onSave = vi.fn();

    render(
      <EditDownloadClientModal
        isOpen
        client={client}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Client' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: '192.168.1.200' } });
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '9092' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'Updated Client',
          host: '192.168.1.200',
          port: 9092,
        }),
      );
    });
  });

  it('supports editing username and password fields', async () => {
    const onSave = vi.fn();

    render(
      <EditDownloadClientModal
        isOpen
        client={client}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Username (optional)'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password (optional)'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          password: 'secret',
        }),
      );
    });
  });

  it('shows validation errors when required fields are missing', async () => {
    const onSave = vi.fn();

    render(
      <EditDownloadClientModal
        isOpen
        client={client}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes modal when cancel is clicked', () => {
    const onClose = vi.fn();

    render(
      <EditDownloadClientModal
        isOpen
        client={client}
        onClose={onClose}
        onSave={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('toggles enabled checkbox', async () => {
    const onSave = vi.fn();

    render(
      <EditDownloadClientModal
        isOpen
        client={client}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    const enabledCheckbox = screen.getByLabelText('Enabled');
    expect(enabledCheckbox).toBeChecked();

    fireEvent.click(enabledCheckbox);
    expect(enabledCheckbox).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });
});
