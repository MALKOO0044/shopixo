// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock next/link to a standard anchor for unit tests
import React from 'react';
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children, ...rest }: any) => React.createElement('a', { href, ...rest }, children),
  };
});

// Mock next/image to a standard img for unit tests
jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      const { fill, priority, quality, ...rest } = props || {};
      return React.createElement('img', { ...rest });
    },
  };
});

// Radix UI dropdowns render their content in a Portal by default.
// Mock Portal to render children inline for jsdom tests.
jest.mock('@radix-ui/react-portal', () => {
  return {
    __esModule: true,
    Root: ({ children }: any) => children,
  };
});

// Mock our Radix UI dropdown wrappers to simplify interactions in tests
jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  return {
    __esModule: true,
    DropdownMenu: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DropdownMenuTrigger: ({ asChild, children }: any) => {
      // pass through without portals/complex logic
      return React.cloneElement(children, {});
    },
    DropdownMenuContent: ({ children }: any) => React.createElement('div', { role: 'menu' }, children),
    DropdownMenuItem: ({ children, onClick }: any) => React.createElement('div', { role: 'menuitem', onClick }, children),
  };
});
