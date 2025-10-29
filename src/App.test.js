// Import testing utilities from React Testing Library
import { render, screen } from '@testing-library/react';

// Import the App component to test
import App from './App';

// Test to check if the Book Finder app renders correctly
test('renders Book Finder header', () => {

  // Render the App component
  render(<App />);

  // Find the header element with "Book Finder" text
  const headerElement = screen.getByText(/Book Finder/i);

  // Assert that the header is in the document
  expect(headerElement).toBeInTheDocument();

});
