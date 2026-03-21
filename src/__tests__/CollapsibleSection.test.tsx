import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { Coffee } from 'lucide-react';
import { describe, it, expect } from 'vitest';

describe('CollapsibleSection', () => {
  it('renders title and children when open', () => {
    render(
      <CollapsibleSection title="Test Section" icon={Coffee}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides children when toggled', () => {
    render(
      <CollapsibleSection title="Test Section" icon={Coffee}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('respects defaultOpen=false', () => {
    render(
      <CollapsibleSection title="Test Section" icon={Coffee} defaultOpen={false}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });
});
