import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock window.qrcode at the top
(globalThis as Record<string, unknown>).qrcode = vi.fn().mockReturnValue({
  modules: { data: Array(21).fill(Array(21).fill(false)), size: 21 },
});

// Mock the CustomSVGRenderer
vi.mock('../../services/customSvgRenderer', () => ({
  CustomSVGRenderer: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue('<svg><rect/></svg>'),
  })),
}));

// Mock the supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  generateShortCode: vi.fn().mockReturnValue('abc123'),
}));

// Mock the AuthContext
vi.mock('../../lib/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

// Import after mocks
import { DynamicQRForm } from '../../components/dynamic/DynamicQRForm';

describe('DynamicQRForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form when isOpen is true', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Form should be visible - check for heading
    const heading = screen.getByRole('heading', { name: /Create Dynamic QR/i });
    expect(heading).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <DynamicQRForm
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Create Dynamic QR Code')).not.toBeInTheDocument();
  });

  it('should show edit mode when editingQR is provided', () => {
    const editingQR = {
      id: 'qr-1',
      user_id: 'user-1',
      short_code: 'abc123',
      title: 'Existing QR',
      destination_url: 'https://example.com',
      qr_style: {},
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        editingQR={editingQR}
      />
    );

    // In edit mode, the title should contain "Edit"
    expect(screen.getByText(/Edit/i)).toBeInTheDocument();
  });

  it('should have input fields', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Check that form has input elements
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should have Custom Short URL section', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Custom Short URL/i)).toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', async () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should have a submit button', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Look for submit button by role
    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should have preview section', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Look for preview text - use getAllByText since there might be multiple
    const previews = screen.getAllByText(/Preview/i);
    expect(previews.length).toBeGreaterThan(0);
  });
});

describe('Custom Short URL Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Custom Short URL section', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Custom Short URL/i)).toBeInTheDocument();
  });

  it('should show the /r/ prefix text', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // The form should show /r/ prefix for short URLs
    expect(screen.getByText(/\/r\//)).toBeInTheDocument();
  });

  it('should have optional label', () => {
    render(
      <DynamicQRForm
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });
});
