import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageToolbar, PageToolbarSection } from './PageToolbar';
import * as Icons from 'lucide-react';

describe('PageToolbar', () => {
  it('renders PageToolbar with children', () => {
    render(
      <PageToolbar>
        <span>Test content</span>
      </PageToolbar>,
    );

    const toolbar = screen.getByText('Test content');
    expect(toolbar).toBeInTheDocument();
  });

  it('applies correct CSS classes to PageToolbar', () => {
    const { container } = render(
      <PageToolbar>
        <span>Content</span>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toHaveClass('flex');
    expect(toolbar).toHaveClass('flex-wrap');
    expect(toolbar).toHaveClass('items-center');
    expect(toolbar).toHaveClass('justify-between');
    expect(toolbar).toHaveClass('gap-2');
    expect(toolbar).toHaveClass('rounded-md');
    expect(toolbar).toHaveClass('border');
    expect(toolbar).toHaveClass('border-border-subtle');
    expect(toolbar).toHaveClass('bg-surface-1');
    expect(toolbar).toHaveClass('px-3');
    expect(toolbar).toHaveClass('py-2');
  });

  it('renders multiple children correctly', () => {
    render(
      <PageToolbar>
        <span>First</span>
        <span>Second</span>
        <span>Third</span>
      </PageToolbar>,
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('renders complex nested content', () => {
    render(
      <PageToolbar>
        <div>
          <span>Nested content</span>
        </div>
        <button type="button">Action</button>
      </PageToolbar>,
    );

    expect(screen.getByText('Nested content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('has semantic HTML structure', () => {
    const { container } = render(
      <PageToolbar>
        <span>Content</span>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.tagName).toBe('DIV');
  });
});

describe('PageToolbarSection', () => {
  it('renders PageToolbarSection with children', () => {
    render(
      <PageToolbarSection>
        <span>Section content</span>
      </PageToolbarSection>,
    );

    const section = screen.getByText('Section content');
    expect(section).toBeInTheDocument();
  });

  it('renders PageToolbarSection with left alignment (default)', () => {
    const { container } = render(
      <PageToolbarSection>
        <span>Left aligned</span>
      </PageToolbarSection>,
    );

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveClass('flex');
    expect(section).toHaveClass('flex-wrap');
    expect(section).toHaveClass('items-center');
    expect(section).toHaveClass('gap-2');
    expect(section).toHaveClass('justify-start');
  });

  it('renders PageToolbarSection with right alignment', () => {
    const { container } = render(
      <PageToolbarSection align="right">
        <span>Right aligned</span>
      </PageToolbarSection>,
    );

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveClass('flex');
    expect(section).toHaveClass('flex-wrap');
    expect(section).toHaveClass('items-center');
    expect(section).toHaveClass('gap-2');
    expect(section).toHaveClass('justify-end');
  });

  it('does not have justify-start when align is right', () => {
    const { container } = render(
      <PageToolbarSection align="right">
        <span>Right</span>
      </PageToolbarSection>,
    );

    const section = container.firstChild as HTMLElement;
    expect(section.className).not.toContain('justify-start');
  });

  it('does not have justify-end when align is left', () => {
    const { container } = render(
      <PageToolbarSection align="left">
        <span>Left</span>
      </PageToolbarSection>,
    );

    const section = container.firstChild as HTMLElement;
    expect(section.className).not.toContain('justify-end');
  });

  it('does not have justify-end when align is not specified (default left)', () => {
    const { container } = render(
      <PageToolbarSection>
        <span>Default</span>
      </PageToolbarSection>,
    );

    const section = container.firstChild as HTMLElement;
    expect(section.className).not.toContain('justify-end');
  });

  it('renders multiple children in section', () => {
    render(
      <PageToolbarSection>
        <button type="button" aria-label="First">First</button>
        <button type="button" aria-label="Second">Second</button>
        <button type="button" aria-label="Third">Third</button>
      </PageToolbarSection>,
    );

    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Third' })).toBeInTheDocument();
  });

  it('has semantic HTML structure', () => {
    const { container } = render(
      <PageToolbarSection>
        <span>Content</span>
      </PageToolbarSection>,
    );

    const section = container.firstChild as HTMLElement;
    expect(section.tagName).toBe('DIV');
  });
});

describe('PageToolbar and PageToolbarSection integration', () => {
  it('combines PageToolbar and PageToolbarSection correctly', () => {
    const { container } = render(
      <PageToolbar>
        <PageToolbarSection>
          <span>Left section</span>
        </PageToolbarSection>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText('Left section')).toBeInTheDocument();
  });

  it('renders multiple sections in toolbar', () => {
    const { container } = render(
      <PageToolbar>
        <PageToolbarSection align="left">
          <span>Left content</span>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          <span>Right content</span>
        </PageToolbarSection>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText('Left content')).toBeInTheDocument();
    expect(screen.getByText('Right content')).toBeInTheDocument();
  });

  it('maintains flex layout between toolbar and sections', () => {
    const { container } = render(
      <PageToolbar>
        <PageToolbarSection align="left">
          <span>Left</span>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          <span>Right</span>
        </PageToolbarSection>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain('justify-between');
  });

  it('handles nested toolbar content with multiple sections', () => {
    render(
      <PageToolbar>
        <PageToolbarSection align="left">
          <button type="button" aria-label="Filter">Filter</button>
          <button type="button" aria-label="Sort">Sort</button>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          <button type="button" aria-label="Add">Add</button>
          <button type="button" aria-label="Refresh">Refresh</button>
        </PageToolbarSection>
      </PageToolbar>,
    );

    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('supports icons in sections', () => {
    render(
      <PageToolbar>
        <PageToolbarSection>
          <Icons.Search data-testid="search-icon" />
        </PageToolbarSection>
      </PageToolbar>,
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('renders realistic toolbar with multiple elements', () => {
    render(
      <PageToolbar>
        <PageToolbarSection align="left">
          <button type="button" aria-label="Search">
            <Icons.Search data-testid="search" />
            <span>Search</span>
          </button>
          <button type="button" aria-label="Filter">
            <Icons.Filter data-testid="filter" />
            <span>Filter</span>
          </button>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          <button type="button" aria-label="Add New">
            <Icons.Plus data-testid="plus" />
            <span>Add New</span>
          </button>
          <button type="button" aria-label="View Options">
            <Icons.MoreHorizontal data-testid="more" />
          </button>
        </PageToolbarSection>
      </PageToolbar>,
    );

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Options' })).toBeInTheDocument();
    expect(screen.getByTestId('search')).toBeInTheDocument();
    expect(screen.getByTestId('filter')).toBeInTheDocument();
    expect(screen.getByTestId('plus')).toBeInTheDocument();
    expect(screen.getByTestId('more')).toBeInTheDocument();
  });

  it('wraps content on small screens with flex-wrap', () => {
    const { container } = render(
      <PageToolbar>
        <PageToolbarSection align="left">
          <button type="button" aria-label="Button 1">Button 1</button>
          <button type="button" aria-label="Button 2">Button 2</button>
          <button type="button" aria-label="Button 3">Button 3</button>
          <button type="button" aria-label="Button 4">Button 4</button>
        </PageToolbarSection>
        <PageToolbarSection align="right">
          <button type="button" aria-label="Button 5">Button 5</button>
        </PageToolbarSection>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    const sections = container.querySelectorAll('div > div');
    expect(toolbar.className).toContain('flex-wrap');
    sections.forEach((section) => {
      expect(section).toHaveClass('flex-wrap');
    });
  });

  it('applies gap spacing between sections', () => {
    const { container } = render(
      <PageToolbar>
        <PageToolbarSection>
          <span>Section 1</span>
        </PageToolbarSection>
        <PageToolbarSection>
          <span>Section 2</span>
        </PageToolbarSection>
      </PageToolbar>,
    );

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain('gap-2');
  });

  it('applies gap spacing within sections', () => {
    const { container } = render(
      <PageToolbar>
        <PageToolbarSection>
          <button type="button" aria-label="Button 1">Button 1</button>
          <button type="button" aria-label="Button 2">Button 2</button>
        </PageToolbarSection>
      </PageToolbar>,
    );

    const section = container.querySelector('div > div') as HTMLElement;
    expect(section.className).toContain('gap-2');
  });
});
