import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to dark when no theme is saved', () => {
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('respects a saved light theme', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles between dark and light and persists the choice', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /Toggle Dark Mode/i }));
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: /Toggle Dark Mode/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
