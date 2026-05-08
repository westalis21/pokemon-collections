import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from './FileUploader';

describe('FileUploader', () => {
  it('calls onFile when the user selects a file', async () => {
    const onFile = vi.fn();
    render(<FileUploader onFile={onFile} label="Upload from file" />);
    const input = screen.getByLabelText(/upload from file/i);
    const file = new File(['{}'], 'team.json', { type: 'application/json' });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect((onFile.mock.calls[0][0] as File).name).toBe('team.json');
  });

  it('renders a custom accept attribute', () => {
    render(<FileUploader onFile={() => {}} label="x" accept="application/json" />);
    expect(screen.getByLabelText('x')).toHaveAttribute('accept', 'application/json');
  });
});
