import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock data
const mockFolders = [
  { id: 'folder-1', name: 'Marketing', color: '#6366f1', user_id: 'user-1' },
  { id: 'folder-2', name: 'Sales', color: '#22c55e', user_id: 'user-1' },
];

const mockQRCodes = [
  { id: 'qr-1', title: 'QR 1', folder_id: 'folder-1', is_active: true, short_code: 'abc' },
  { id: 'qr-2', title: 'QR 2', folder_id: null, is_active: true, short_code: 'def' },
];

// Simple Folder List Component for testing
const FolderList: React.FC<{
  folders: typeof mockFolders;
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: () => void;
}> = ({ folders, selectedFolder, onSelectFolder, onCreateFolder }) => (
  <div data-testid="folder-list">
    <button onClick={onCreateFolder} data-testid="create-folder-btn">
      New Folder
    </button>
    <button
      onClick={() => onSelectFolder(null)}
      data-testid="all-qr-codes"
      className={selectedFolder === null ? 'selected' : ''}
    >
      All QR Codes
    </button>
    {folders.map((folder) => (
      <button
        key={folder.id}
        onClick={() => onSelectFolder(folder.id)}
        data-testid={`folder-${folder.id}`}
        className={selectedFolder === folder.id ? 'selected' : ''}
        style={{ color: folder.color }}
      >
        {folder.name}
      </button>
    ))}
  </div>
);

// Folder Modal Component for testing
const FolderModal: React.FC<{
  isOpen: boolean;
  folderName: string;
  folderColor: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ isOpen, folderName, folderColor, onNameChange, onColorChange, onSave, onClose }) => {
  if (!isOpen) return null;

  return (
    <div data-testid="folder-modal">
      <input
        data-testid="folder-name-input"
        value={folderName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Folder name"
      />
      <div data-testid="color-picker">
        {['#6366f1', '#22c55e', '#ef4444'].map((color) => (
          <button
            key={color}
            data-testid={`color-${color}`}
            onClick={() => onColorChange(color)}
            className={folderColor === color ? 'selected' : ''}
          />
        ))}
      </div>
      <button data-testid="save-folder-btn" onClick={onSave} disabled={!folderName.trim()}>
        Save
      </button>
      <button data-testid="cancel-btn" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
};

describe('Folder List Component', () => {
  it('should render all folders', () => {
    const mockSelectFolder = vi.fn();
    const mockCreateFolder = vi.fn();

    render(
      <FolderList
        folders={mockFolders}
        selectedFolder={null}
        onSelectFolder={mockSelectFolder}
        onCreateFolder={mockCreateFolder}
      />
    );

    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('All QR Codes')).toBeInTheDocument();
  });

  it('should call onSelectFolder when a folder is clicked', async () => {
    const mockSelectFolder = vi.fn();
    const mockCreateFolder = vi.fn();

    render(
      <FolderList
        folders={mockFolders}
        selectedFolder={null}
        onSelectFolder={mockSelectFolder}
        onCreateFolder={mockCreateFolder}
      />
    );

    await userEvent.click(screen.getByTestId('folder-folder-1'));
    expect(mockSelectFolder).toHaveBeenCalledWith('folder-1');
  });

  it('should call onCreateFolder when New Folder button is clicked', async () => {
    const mockSelectFolder = vi.fn();
    const mockCreateFolder = vi.fn();

    render(
      <FolderList
        folders={mockFolders}
        selectedFolder={null}
        onSelectFolder={mockSelectFolder}
        onCreateFolder={mockCreateFolder}
      />
    );

    await userEvent.click(screen.getByTestId('create-folder-btn'));
    expect(mockCreateFolder).toHaveBeenCalled();
  });

  it('should show All QR Codes option to clear folder filter', async () => {
    const mockSelectFolder = vi.fn();
    const mockCreateFolder = vi.fn();

    render(
      <FolderList
        folders={mockFolders}
        selectedFolder="folder-1"
        onSelectFolder={mockSelectFolder}
        onCreateFolder={mockCreateFolder}
      />
    );

    await userEvent.click(screen.getByTestId('all-qr-codes'));
    expect(mockSelectFolder).toHaveBeenCalledWith(null);
  });
});

describe('Folder Modal Component', () => {
  it('should not render when closed', () => {
    render(
      <FolderModal
        isOpen={false}
        folderName=""
        folderColor="#6366f1"
        onNameChange={vi.fn()}
        onColorChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('folder-modal')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <FolderModal
        isOpen={true}
        folderName=""
        folderColor="#6366f1"
        onNameChange={vi.fn()}
        onColorChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('folder-modal')).toBeInTheDocument();
    expect(screen.getByTestId('folder-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('save-folder-btn')).toBeInTheDocument();
  });

  it('should disable save button when name is empty', () => {
    render(
      <FolderModal
        isOpen={true}
        folderName=""
        folderColor="#6366f1"
        onNameChange={vi.fn()}
        onColorChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('save-folder-btn')).toBeDisabled();
  });

  it('should enable save button when name is provided', () => {
    render(
      <FolderModal
        isOpen={true}
        folderName="Test Folder"
        folderColor="#6366f1"
        onNameChange={vi.fn()}
        onColorChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('save-folder-btn')).not.toBeDisabled();
  });

  it('should call onNameChange when typing in input', async () => {
    const mockNameChange = vi.fn();

    render(
      <FolderModal
        isOpen={true}
        folderName=""
        folderColor="#6366f1"
        onNameChange={mockNameChange}
        onColorChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByTestId('folder-name-input');
    await userEvent.type(input, 'New Folder');

    expect(mockNameChange).toHaveBeenCalled();
  });

  it('should call onColorChange when a color is selected', async () => {
    const mockColorChange = vi.fn();

    render(
      <FolderModal
        isOpen={true}
        folderName="Test"
        folderColor="#6366f1"
        onNameChange={vi.fn()}
        onColorChange={mockColorChange}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await userEvent.click(screen.getByTestId('color-#22c55e'));
    expect(mockColorChange).toHaveBeenCalledWith('#22c55e');
  });

  it('should call onClose when cancel is clicked', async () => {
    const mockClose = vi.fn();

    render(
      <FolderModal
        isOpen={true}
        folderName="Test"
        folderColor="#6366f1"
        onNameChange={vi.fn()}
        onColorChange={vi.fn()}
        onSave={vi.fn()}
        onClose={mockClose}
      />
    );

    await userEvent.click(screen.getByTestId('cancel-btn'));
    expect(mockClose).toHaveBeenCalled();
  });
});

describe('QR Code Folder Filtering', () => {
  const filterQRCodesByFolder = (qrCodes: typeof mockQRCodes, folderId: string | null) => {
    if (folderId === null) return qrCodes;
    return qrCodes.filter((qr) => qr.folder_id === folderId);
  };

  it('should return all QR codes when folder is null', () => {
    const result = filterQRCodesByFolder(mockQRCodes, null);
    expect(result).toHaveLength(2);
  });

  it('should return only QR codes in selected folder', () => {
    const result = filterQRCodesByFolder(mockQRCodes, 'folder-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('qr-1');
  });

  it('should return empty array if no QR codes in folder', () => {
    const result = filterQRCodesByFolder(mockQRCodes, 'folder-nonexistent');
    expect(result).toHaveLength(0);
  });
});
