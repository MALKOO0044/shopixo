// Mock dropdown menu for this test file to avoid Radix complexity
import React from 'react'
jest.mock('@/components/ui/dropdown-menu', () => {
  return {
    __esModule: true,
    DropdownMenu: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DropdownMenuTrigger: ({ asChild, children }: any) => React.cloneElement(children, {}),
    DropdownMenuContent: ({ children }: any) => React.createElement('div', { role: 'menu' }, children),
    DropdownMenuItem: ({ children, onClick }: any) => React.createElement('div', { role: 'menuitem', onClick }, children),
  };
});

// Mock next-themes module and control its return per-test
jest.mock('next-themes', () => ({
  __esModule: true,
  useTheme: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as nextThemes from 'next-themes'
import { ThemeToggle } from '../theme-toggle'

describe('ThemeToggle Component', () => {
  let setTheme: jest.Mock;

  beforeEach(() => {
    setTheme = jest.fn();
    const mockedUseTheme = (nextThemes as any).useTheme as jest.Mock;
    mockedUseTheme.mockReset();
    mockedUseTheme.mockReturnValue({
      setTheme,
      theme: 'light',
      themes: ['light', 'dark', 'system'],
    } as any);
  });

  it('should render the toggle button', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /(?:تبديل السمة|toggle theme)/i })
    expect(button).toBeInTheDocument()
  })

  it('should open the dropdown and show theme options on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /(?:تبديل السمة|toggle theme)/i })
    await user.click(button)

    expect(await screen.findByRole('menuitem', { name: /(?:الوضع الفاتح|light)/i })).toBeInTheDocument()
    expect(await screen.findByRole('menuitem', { name: /(?:الوضع الداكن|dark)/i })).toBeInTheDocument()
    expect(await screen.findByRole('menuitem', { name: /(?:نظام الجهاز|system)/i })).toBeInTheDocument()
  })

  it('should call setTheme with "light" when light option is clicked', async () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /(?:تبديل السمة|toggle theme)/i }))
    const lightItem = await screen.findByRole('menuitem', { name: /(?:الوضع الفاتح|light)/i })
    fireEvent.click(lightItem)

    await waitFor(() => expect(setTheme).toHaveBeenCalledWith('light'))
  })

  it('should call setTheme with "dark" when dark option is clicked', async () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /(?:تبديل السمة|toggle theme)/i }))
    const darkItem = await screen.findByRole('menuitem', { name: /(?:الوضع الداكن|dark)/i })
    fireEvent.click(darkItem)

    await waitFor(() => expect(setTheme).toHaveBeenCalledWith('dark'))
  })

  it('should call setTheme with "system" when system option is clicked', async () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /(?:تبديل السمة|toggle theme)/i }))
    const systemItem = await screen.findByRole('menuitem', { name: /(?:نظام الجهاز|system)/i })
    fireEvent.click(systemItem)

    await waitFor(() => expect(setTheme).toHaveBeenCalledWith('system'))
  })
})
