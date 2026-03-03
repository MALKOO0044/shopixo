import { render, screen } from '@testing-library/react'
import Logo from '../logo'
 
describe('Logo Component', () => {
  it('should render the logo text', () => {
    render(<Logo />)
 
    const logoElement = screen.getByText(/Shopixo/i)
    expect(logoElement).toBeInTheDocument()
  })
 
  it('should link to the homepage', () => {
    render(<Logo />)
 
    const linkElement = screen.getByRole('link', { name: /Shopixo/i })
    expect(linkElement).toHaveAttribute('href', '/')
  })
})
