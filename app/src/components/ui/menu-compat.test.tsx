
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Trash, Edit, Download } from 'lucide-react';
import { Menu, MenuButton, MenuTrigger, type MenuItem } from './menu-compat';

describe('Menu primitives', () => {
  describe('Menu component', () => {
    it('renders dropdown menu with items', async () => {
      const onClose = vi.fn();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', icon: Edit, onClick: onItemClick },
        { key: 'delete', label: 'Delete', icon: Trash, onClick: onItemClick },
      ];

      render(<Menu isOpen={true} onClose={onClose} items={items} ariaLabel="Actions menu" />);

      // shadcn DropdownMenuContent aligns based on the trigger, which we mocked as a sr-only span
      expect(await screen.findByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(<Menu isOpen={false} onClose={() => {}} items={items} ariaLabel="Hidden menu" />);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('fires item click handler and closes menu', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', onClick: onItemClick },
      ];

      render(<Menu isOpen={true} onClose={onClose} items={items} ariaLabel="Click menu" />);

      const item = await screen.findByRole('menuitem', { name: 'Edit' });
      await user.click(item);

      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders disabled items without click handler', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'delete', label: 'Delete', disabled: true, onClick: onItemClick },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Disabled menu" />);

      const deleteButton = await screen.findByRole('menuitem', { name: 'Delete' });
      expect(deleteButton).toHaveAttribute('aria-disabled', 'true');

      // Radix prevents clicks on disabled items
      await user.click(deleteButton);
      expect(onItemClick).not.toHaveBeenCalled();
    });

    it('renders items with icons', async () => {
      const items: MenuItem[] = [
        { key: 'download', label: 'Download', icon: Download },
        { key: 'edit', label: 'Edit', icon: Edit },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Icon menu" />);

      expect(await screen.findByRole('menuitem', { name: 'Download' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    });

    it('aligns menu to the right when specified', async () => {
      const items: MenuItem[] = [{ key: 'edit', label: 'Edit' }];

      render(
        <Menu isOpen={true} onClose={() => {}} items={items} align="right" ariaLabel="Right menu" />,
      );

      const menu = await screen.findByRole('menu');
      expect(menu).toHaveAttribute('data-align', 'end');
    });
  });

  describe('MenuTrigger component', () => {
    it('renders trigger button with children', () => {
      render(<MenuTrigger>Open Menu</MenuTrigger>);

      expect(screen.getByRole('button', { name: 'Open Menu' })).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<MenuTrigger onClick={onClick}>Trigger</MenuTrigger>);

      await user.click(screen.getByRole('button', { name: 'Trigger' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when disabled prop is true', () => {
      render(<MenuTrigger disabled={true}>Disabled Trigger</MenuTrigger>);

      expect(screen.getByRole('button', { name: 'Disabled Trigger' })).toBeDisabled();
    });
  });

  describe('MenuButton component', () => {
    it('opens menu when trigger button is clicked', async () => {
      const user = userEvent.setup();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', icon: Edit },
      ];

      render(<MenuButton items={items} ariaLabel="Test menu">More Options</MenuButton>);

      // Initially closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click to open
      await user.click(screen.getByRole('button', { name: 'More Options' }));

      // Menu should be open
      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('closes menu when item is clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit', icon: Edit, onClick: onItemClick },
      ];

      render(<MenuButton items={items} ariaLabel="Close test menu">Menu</MenuButton>);

      // Open menu
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      const item = await screen.findByRole('menuitem', { name: 'Edit' });

      // Click item
      await user.click(item);

      // Menu should be closed (Radix removes it from DOM)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(onItemClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Menu accessibility', () => {
    it('has proper ARIA roles', async () => {
      const items: MenuItem[] = [
        { key: 'edit', label: 'Edit' },
      ];

      render(<Menu isOpen={true} onClose={() => {}} items={items} ariaLabel="Accessibility menu" />);

      const menu = await screen.findByRole('menu');
      const menuItems = within(menu).getAllByRole('menuitem');
      expect(menuItems).toHaveLength(1);
    });
  });
});
