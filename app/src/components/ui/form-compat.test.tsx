import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CheckInput,
  EnhancedSelectInput,
  Form,
  FormGroup,
  SelectInput,
  TagInput,
  TextInput,
} from './form-compat';

describe('Form primitives', () => {
  it('renders form and form group wrappers with submit behavior', () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <Form onSubmit={onSubmit}>
        <FormGroup label="Indexer name" htmlFor="indexerName" hint="Required field">
          <TextInput id="indexerName" value="Prowlarr" onChange={() => {}} />
        </FormGroup>
        <button type="submit">Save</button>
      </Form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('renders text input error messaging', () => {
    render(<TextInput id="apiKey" value="" onChange={() => {}} error="API key is required" />);

    expect(screen.getByRole('textbox', { name: 'apiKey' })).toBeInTheDocument();
    expect(screen.getByText('API key is required')).toBeInTheDocument();
  });

  it('updates value for select input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectInput
        id="protocol"
        label="Protocol"
        value="torrent"
        options={[
          { value: 'torrent', label: 'Torrent' },
          { value: 'usenet', label: 'Usenet' },
        ]}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Protocol' });
    await user.click(trigger);
    const option = await screen.findByRole('option', { name: 'Usenet' });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('usenet');
  });

  it('supports enhanced select option picking', () => {
    const onChange = vi.fn();

    render(
      <EnhancedSelectInput
        id="indexer"
        label="Indexer"
        value="ninjacentral"
        options={[
          { value: 'ninjacentral', label: 'NinjaCentral' },
          { value: 'rarbg', label: 'RARBG' },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Indexer search' }), { target: { value: 'rar' } });
    fireEvent.click(screen.getByRole('button', { name: 'RARBG' }));

    expect(onChange).toHaveBeenCalledWith('rarbg');
  });

  it('updates checked value in check input', () => {
    const onChange = vi.fn();

    render(<CheckInput id="enabled" label="Enabled" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles tags in tag input', () => {
    const onChange = vi.fn();

    render(
      <TagInput
        id="tags"
        label="Tags"
        availableTags={['anime', '4k']}
        selectedTags={['anime']}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '4k' }));
    fireEvent.click(screen.getByRole('button', { name: 'anime' }));

    expect(onChange).toHaveBeenNthCalledWith(1, ['anime', '4k']);
    expect(onChange).toHaveBeenNthCalledWith(2, []);
  });
});
