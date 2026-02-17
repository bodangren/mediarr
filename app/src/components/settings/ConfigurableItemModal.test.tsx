import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurableItemModal } from './ConfigurableItemModal';

interface TestPreset {
  id: string;
  name: string;
  description: string;
}

interface TestFieldValues {
  name: string;
  port: number;
}

const mockPresets: TestPreset[] = [
  {
    id: 'preset-1',
    name: 'Preset One',
    description: 'First preset description',
  },
  {
    id: 'preset-2',
    name: 'Preset Two',
    description: 'Second preset description',
  },
];

const mockFieldValues: TestFieldValues = {
  name: '',
  port: 8080,
};

const mockFieldValuesWithDefaults: TestFieldValues = {
  name: 'Test Client',
  port: 9091,
};

describe('ConfigurableItemModal', () => {
  it('renders with title and preset grid when open', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={(presets, selectedId, onSelect) => (
          <>
            <h3 className="text-sm font-medium text-text-primary">Preset</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelect(preset.id)}
                  className={`rounded-sm border px-3 py-2 text-left text-sm ${
                    preset.id === selectedId
                      ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                      : 'border-border-subtle text-text-secondary'
                  }`}
                  aria-pressed={preset.id === selectedId}
                >
                  <p className="font-medium">{preset.name}</p>
                  <p className="text-xs">{preset.description}</p>
                </button>
              ))}
            </div>
          </>
        )}
        renderFields={(preset, values, onChange) => (
          <div>
            <label htmlFor="field-name">Name</label>
            <input
              id="field-name"
              type="text"
              value={values.name}
              onChange={e => onChange('name', e.target.value)}
            />
            <label htmlFor="field-port">Port</label>
            <input
              id="field-port"
              type="number"
              value={values.port}
              onChange={e => onChange('port', Number.parseInt(e.target.value, 10))}
            />
          </div>
        )}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Add Item' })).toBeInTheDocument();
    expect(screen.getByText('Preset One')).toBeInTheDocument();
    expect(screen.getByText('Preset Two')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen={false}
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onSelectPreset when a preset is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={(presets, selectedId, onSelect) => (
          <div>
            {presets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelect(preset.id)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
        renderFields={() => <div>Fields</div>}
      />,
    );

    fireEvent.click(screen.getByText('Preset Two'));
    expect(onSelectPreset).toHaveBeenCalledWith('preset-2');
  });

  it('calls onFieldChange when field values change', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={(preset, values, onChange) => (
          <>
            <label htmlFor="field-name">Name</label>
            <input
              id="field-name"
              type="text"
              value={values.name}
              onChange={e => onChange('name', e.target.value)}
            />
          </>
        )}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Name' } });
    expect(onFieldChange).toHaveBeenCalledWith('name', 'Test Name');
  });

  it('calls onTestConnection when Test Connection button is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
    expect(onTestConnection).toHaveBeenCalled();
  });

  it('shows "Testing..." when isTesting is true', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        isTesting
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Testing...' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Test Connection' })).not.toBeInTheDocument();
  });

  it('disables all buttons when isSubmitting is true', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        isSubmitting
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Test Connection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables all buttons when isTesting is true', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        isTesting
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Testing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('calls onSave and prevents default form submission when Save is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('displays error message when error prop is provided', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        error="Name is required"
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Name is required');
    expect(errorAlert).toHaveClass('text-status-error');
  });

  it('displays successful test result', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        testResult={{
          success: true,
          message: 'Connection successful',
        }}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.getByText('Connection successful')).toBeInTheDocument();
    expect(screen.getByText('Connection successful')).toHaveClass('text-status-success');
  });

  it('displays failed test result with hints', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        testResult={{
          success: false,
          message: 'Connection failed',
          hints: ['Check your API key', 'Verify host and port'],
        }}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toHaveClass('text-status-error');
    expect(screen.getByText('Check your API key')).toBeInTheDocument();
    expect(screen.getByText('Verify host and port')).toBeInTheDocument();
  });

  it('renders custom preset grid renderer', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={(presets, selectedId, onSelect) => (
          <div data-testid="custom-preset-grid">
            {presets.map(preset => (
              <div key={preset.id}>{preset.name} (ID: {preset.id})</div>
            ))}
          </div>
        )}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.getByTestId('custom-preset-grid')).toBeInTheDocument();
    expect(screen.getByText('Preset One (ID: preset-1)')).toBeInTheDocument();
    expect(screen.getByText('Preset Two (ID: preset-2)')).toBeInTheDocument();
  });

  it('renders custom fields renderer', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={(preset, values, onChange) => (
          <div data-testid="custom-fields">
            <div>Current name: {values.name}</div>
            <div>Current port: {values.port}</div>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId('custom-fields')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'DIV' && content.startsWith('Current name:');
    })).toBeInTheDocument();
    expect(screen.getByText('Current port: 8080')).toBeInTheDocument();
  });

  it('does not display test result section when testResult is null', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        testResult={null}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.queryByText('Connection successful')).not.toBeInTheDocument();
    expect(screen.queryByText('Connection failed')).not.toBeInTheDocument();
  });

  it('does not display error section when error is null', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTestConnection = vi.fn();
    const onSelectPreset = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <ConfigurableItemModal<TestPreset, TestFieldValues>
        isOpen
        title="Add Item"
        presets={mockPresets}
        selectedPresetId="preset-1"
        fieldValues={mockFieldValues}
        error={null}
        onClose={onClose}
        onSave={onSave}
        onTestConnection={onTestConnection}
        onSelectPreset={onSelectPreset}
        onFieldChange={onFieldChange}
        renderPresetGrid={() => <div>Preset Grid</div>}
        renderFields={() => <div>Fields</div>}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
