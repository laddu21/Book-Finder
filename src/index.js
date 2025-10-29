// Import React library
import React from 'react';

// Import ReactDOM for rendering
import ReactDOM from 'react-dom/client';

// Import global CSS styles
import './index.css';

// Import the main App component
import App from './App';

// Import web vitals reporting function
import reportWebVitals from './reportWebVitals';

// Create the root element for React rendering
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component inside StrictMode
root.render(

  <React.StrictMode>

    <App />

  </React.StrictMode>

);

// Report web vitals for performance monitoring
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
