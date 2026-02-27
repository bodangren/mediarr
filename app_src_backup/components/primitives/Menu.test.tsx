import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MoreVertical, Trash, Edit, Download } from 'lucide-react';
import { Menu, MenuButton, MenuTrigger, type MenuItem } from './Menu';

describe('Menu primitives', () => {
  describe('Menu component', () => {
    it('renders dropdown menu with items and closes on backdrop click', () => {
      const onClose = vi.fn();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', icon: Edit, onClick: onItemClick },
        { key: 'delete', label: 'Delete', icon: Trash, onClick: onItemClick },
      ];

      render(<Menu isOpen={true} onClose={onClose} items={items} ariaLabel="Actions menu" />);

      expect(screen.getByRole('menu', { name: 'Actions menu' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('menu-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render when closed', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<Menu isOpen={false} onClose={() => {}} items={items} ariaLabel="Hidden menu" />);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes on escape key press', () => {
      const onClose = vi.fn();
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<Menu isOpen={true} onClose={onClose} items={items} ariaLabel="Escape menu" />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('fires item click handler and closes menu', () => {
      const onClose = vi.fn();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', onClick: onItemClick },
        { key: 'delete', label: 'Delete', onClick: onItemClick },
      ];

      render(<Menu isOpen={true} onClose={onClose} items={items} ariaLabel="Click menu" />);

      fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders disabled items without click handler', () => {
      const onClose = vi.fn();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', onClick: onItemClick },
        { key: 'delete', label: 'Delete', disabled: true, onClick: onItemClick },
      ];

      render(<Menu isOpen={true} onClose={onClose} items={items} ariaLabel="Disabled menu" />);

      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' });
      expect(deleteButton).toBeDisabled();

      fireEvent.click(deleteButton);
      expect(onItemClick).not.toHaveBeenCalled();
    });

    it('renders dividers between items', () => {
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit' },
        { key: 'divider1', label: '', divider: true },
        { key: 'delete', label: 'Delete' },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Divider menu" />);

      const divider = screen.getByTestId('menu-divider');
      expect(divider).toBeInTheDocument();
    });

    it('renders items with icons', () => {
      const items: MenuItem[] = [
        { key: 'download', label: 'Download', icon: Download },
        { key: 'edit', label: 'Edit', icon: Edit },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Icon menu" />);

      expect(screen.getByRole('menuitem', { name: 'Download' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    });

    it('aligns menu to the right when specified', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      const { container } = render(
        <Menu isOpen={true} onClose={() => {}} items={items} align="right" ariaLabel="Right menu" />,
      );

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('right-0');
      expect(menu).not.toHaveClass('left-0');
    });

    it('aligns menu to the left by default', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      const { container } = render(
        <Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Left menu" />,
      );

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('left-0');
      expect(menu).not.toHaveClass('right-0');
    });

    it('applies custom className to menu', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(
        <Menu isOpen={true} onClose={() => {}} items={items} className="custom-class" ariaLabel="Custom menu" />,
      );

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('custom-class');
    });

    it('renders multiple dividers correctly', () => {
      const items: MenuItem[] = [
        { key: 'item1', label: 'Item 1' },
        { key: 'divider1', label: '', divider: true },
        { key: 'item2', label: 'Item 2' },
        { key: 'divider2', label: '', divider: true },
        { key: 'item3', label: 'Item 3' },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Multi-divider menu" />);

      const dividers = screen.getAllByTestId('menu-divider');
      expect(dividers).toHaveLength(2);
    });

    it('handles empty items array', () => {
      render(<Menu isOpen={true} onClose={() => {}} items={[]} ariaLabel="Empty menu" />);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(within(menu).queryAllByRole('menuitem')).toHaveLength(0);
    });
  });

  describe('MenuTrigger component', () => {
    it('renders trigger button with children', () => {
      render(<MenuTrigger>Open Menu</MenuTrigger>);

      expect(screen.getByRole('button', { name: 'Open Menu' })).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
      const onClick = vi.fn();

      render(<MenuTrigger onClick={onClick}>Trigger</MenuTrigger>);

      fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when disabled prop is true', () => {
      render(<MenuTrigger disabled={true}>Disabled Trigger</MenuTrigger>);

      expect(screen.getByRole('button', { name: 'Disabled Trigger' })).toBeDisabled();
    });

    it('applies custom ariaLabel', () => {
      render(<MenuTrigger ariaLabel="Custom label">Trigger</MenuTrigger>);

      expect(screen.getByRole('button', { name: 'Custom label' })).toBeInTheDocument();
    });
  });

  describe('MenuButton component', () => {
    it('opens menu when trigger button is clicked', () => {
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', icon: Edit },
        { key: 'delete', label: 'Delete', icon: Trash },
      ];

      render(<MenuButton items={items} ariaLabel="Test menu">More Options</MenuButton>);

      // Initially closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(screen.getByRole('button', { name: 'More Options' }));

      // Menu should be open
      expect(screen.getByRole('menu', { name: 'Test menu' })).toBeInTheDocument();
    });

    it('closes menu when item is clicked', () => {
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', icon: Edit, onClick: onItemClick },
      ];

      render(<MenuButton items={items} ariaLabel="Close test menu">Menu</MenuButton>);

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click item
      fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

      // Menu should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(onItemClick).toHaveBeenCalledTimes(1);
    });

    it('closes menu when backdrop is clicked', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<MenuButton items={items} ariaLabel="Backdrop test menu">Menu</MenuButton>);

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click backdrop
      fireEvent.click(screen.getByTestId('menu-backdrop'));

      // Menu should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes menu on escape key', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<MenuButton items={items} ariaLabel="Escape test menu">Menu</MenuButton>);

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Press escape
      fireEvent.keyDown(window, { key: 'Escape' });

      // Menu should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('supports right-aligned menus', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<MenuButton items={items} align="right" ariaLabel="Right aligned menu">Menu</MenuButton>);

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('right-0');
    });
  });

  describe('Menu accessibility', () => {
    it('has proper ARIA roles', () => {
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit' },
        { key: 'delete', label: 'Delete' },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Accessibility menu" />);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Accessibility menu');

      const menuItems = within(menu).getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
    });

    it('has disabled items with proper ARIA', () => {
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', disabled: true },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Disabled ARIA menu" />);

      const menuItem = screen.getByRole('menuitem', { name: 'Edit' });
      expect(menuItem).toBeDisabled();
    });

  it('renders dividers with separator role', () => {
    const items: MenuItem[] = [
      { key: 'item1', label: 'Item 1' },
      { key: 'divider1', label: '', divider: true },
      { key: 'item2', label: 'Item 2' },
    ];

    render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Separator menu" />);

    // Multiple elements have separator role (li and hr), check that at least one exists
    const separators = screen.getAllByRole('separator');
    expect(separators.length).toBeGreaterThan(0);
  });

    it('backdrop has proper aria-label', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Backdrop ARIA menu" />);

      const backdrop = screen.getByTestId('menu-backdrop');
      expect(backdrop).toHaveAttribute('aria-label', 'Close menu');
    });
  });
});
