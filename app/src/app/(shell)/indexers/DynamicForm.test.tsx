import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DynamicForm } from './DynamicForm';
import { describe, it, expect, vi } from 'vitest';

const mockSchema = [
  {
    name: 'apiKey',
    type: 'text',
    label: 'API Key',
    required: true
  },
  {
    name: 'useSsl',
    type: 'boolean',
    label: 'Use SSL',
    default: true
  }
];

describe('DynamicForm', () => {
  it('renders fields based on schema', () => {
    render(<DynamicForm schema={mockSchema} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Use SSL/i)).toBeInTheDocument();
  });

  it('submits data', async () => {
    const onSubmit = vi.fn();
    render(<DynamicForm schema={mockSchema} onSubmit={onSubmit} />);
    
    // Fill text
    fireEvent.change(screen.getByLabelText(/API Key/i), { target: { value: 'secret' } });
    
    // Submit (assuming button exists)
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        apiKey: 'secret',
        useSsl: false,
      });
    });
  });
});
