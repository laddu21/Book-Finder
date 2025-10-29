// Function to report web vitals metrics
const reportWebVitals = onPerfEntry => {

  // Check if onPerfEntry is provided and is a function
  if (onPerfEntry && onPerfEntry instanceof Function) {

    // Dynamically import web-vitals library
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {

      // Call each web vitals metric function with the provided callback
      getCLS(onPerfEntry);

      getFID(onPerfEntry);

      getFCP(onPerfEntry);

      getLCP(onPerfEntry);

      getTTFB(onPerfEntry);

    });

  }

};

// Export the reportWebVitals function as default
export default reportWebVitals;
