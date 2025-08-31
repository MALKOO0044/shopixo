import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../theme-toggle'
import * as nextThemes from 'next-themes'

// Mock the useTheme hook
// Mock the full return value of useTheme
jest.mock('next-themes', () => ({
  useTheme: () => ({ 
    setTheme: jest.fn(),
    theme: 'light',
    themes: ['light', 'dark', 'system'],
  }),
}));

describe('ThemeToggle Component', () => {
  // We can now directly get the mocked hook
  const { setTheme } = nextThemes.useTheme();

  beforeEach(() => {
    // Clear mock calls before each test
    (setTheme as jest.Mock).mockClear();
  });

  it('should render the toggle button', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
  })

  it('should open the dropdown and show theme options on click', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    fireEvent.click(button)

    expect(screen.getByText(/light/i)).toBeInTheDocument()
    expect(screen.getByText(/dark/i)).toBeInTheDocument()
    expect(screen.getByText(/system/i)).toBeInTheDocument()
  })

  it('should call setTheme with "light" when light option is clicked', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    fireEvent.click(screen.getByText(/light/i))

    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('should call setTheme with "dark" when dark option is clicked', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    fireEvent.click(screen.getByText(/dark/i))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('should call setTheme with "system" when system option is clicked', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    fireEvent.click(screen.getByText(/system/i))

    expect(setTheme).toHaveBeenCalledWith('system')
  })
})
