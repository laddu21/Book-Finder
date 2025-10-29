// Import necessary React hooks and components
import React, { useState, useEffect } from 'react';

import BookGrid from './BookGrid';

import './App.css';

// Main App component for the Book Finder application
function App() {

  // State to hold the current search query
  const [query, setQuery] = useState('');

  // State for AI processed query
  const [aiQuery, setAiQuery] = useState('');

  // State for theme mode (light, dark, reading)
  const [theme, setTheme] = useState('light');

  // State for book filter (all, free, premium)
  const [bookFilter, setBookFilter] = useState('all');

  // State for my shelf
  const [myShelf, setMyShelf] = useState([]);
  const [showShelf, setShowShelf] = useState(false);

  // State for book reader and details (for shelf books)
  const [readingBook, setReadingBook] = useState(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // State for similar books by the same author
  const [similarBooks, setSimilarBooks] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // State for dropdowns
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Mood to genre mapping for AI suggestions
  const moodMap = {
    'happy': 'comedy',
    'sad': 'drama',
    'excited': 'adventure',
    'romantic': 'romance',
    'mysterious': 'mystery',
    'scary': 'horror',
    'funny': 'humor',
    'inspiring': 'motivational',
    'relaxed': 'fiction',
    'adventurous': 'fantasy',
    'angry': 'thriller',
    'curious': 'science',
    'lonely': 'biography',
    'stressed': 'self-help'
  };

  // Keyword to famous English book mapping
  const famousBooksMap = {
    'love': 'pride and prejudice',
    'romance': 'pride and prejudice',
    'adventure': 'the hobbit',
    'fantasy': 'the lord of the rings',
    'mystery': 'sherlock holmes',
    'detective': 'sherlock holmes',
    'thriller': 'gone girl',
    'horror': 'dracula',
    'scary': 'frankenstein',
    'comedy': 'the hitchhiker\'s guide to the galaxy',
    'funny': 'the hitchhiker\'s guide to the galaxy',
    'science fiction': 'dune',
    'sci-fi': 'dune',
    'historical': 'war and peace',
    'biography': 'steve jobs',
    'self-help': 'the power of habit',
    'motivational': 'think and grow rich',
    'philosophy': 'meditations',
    'poetry': 'the waste land',
    'classic': 'to kill a mockingbird',
    'drama': 'hamlet',
    'tragedy': 'romeo and juliet',
    'children': 'alice in wonderland',
    'kids': 'peter pan',
    'young adult': 'the fault in our stars',
    'crime': 'the godfather',
    'war': 'all quiet on the western front',
    'space': 'contact',
    'time': 'the time machine',
    'magic': 'harry potter and the sorcerer\'s stone',
    'wizard': 'harry potter and the sorcerer\'s stone',
    'superhero': 'the dark knight returns',
    'spy': 'james bond',
    'western': 'true grit'
  };

  // Function to detect mood in text
  const detectMood = (text) => {
    const lower = text.toLowerCase();
    for (const [mood, genre] of Object.entries(moodMap)) {
      if (lower.includes(mood)) return genre;
    }
    return null;
  };

  // Function to detect famous book keywords
  const detectFamousBook = (text) => {
    const lower = text.toLowerCase();
    for (const [keyword, book] of Object.entries(famousBooksMap)) {
      if (lower.includes(keyword)) return book;
    }
    return null;
  };

  // Function to handle search input change (only updates display)
  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  // Function to perform search with AI detection
  const performSearch = () => {
    const famousBook = detectFamousBook(query);
    if (famousBook) {
      setAiQuery(famousBook);
    } else {
      const moodGenre = detectMood(query);
      if (moodGenre) {
        setAiQuery(moodGenre);
      } else {
        setAiQuery(query || '');
      }
    }
  };

  // Function to handle key press in search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  // Function to change theme
  const changeTheme = (newTheme) => {

    setTheme(newTheme);

  };

  // My shelf functions
  const addToShelf = (book) => {
    if (!myShelf.find(item => item.key === book.key)) {
      setMyShelf([...myShelf, book]);
    }
  };

  const removeFromShelf = (bookId) => {
    setMyShelf(myShelf.filter(book => book.id !== bookId));
  };

  const isInShelf = (bookId) => {
    return myShelf.some(book => book.id === bookId);
  };

  // Function to open book from shelf (similar to BookGrid's openBookReader)
  const openBookFromShelf = async (book) => {
    if (book.isPremium) {
      // For premium books, show details modal
      setSelectedBook(book);
      // Fetch similar books by the same author
      if (book.author_name && book.author_name.length > 0) {
        fetchSimilarBooks(book.author_name, book.id);
      }
      return;
    }

    setReadingLoading(true);
    setReadingBook(book);

    try {
      if (book.source === 'googlebooks') {
        // For Google Books, try to embed preview in iframe
        if (book.previewLink) {
          // Extract book ID from preview link
          const bookIdMatch = book.previewLink.match(/id=([^&]+)/);
          if (bookIdMatch) {
            const bookId = bookIdMatch[1];
            // Create embeddable Google Books viewer URL
            const embedUrl = `https://books.google.com/books?id=${bookId}&lpg=PP1&pg=PP1&output=embed`;
            setReadingBook({ ...book, embedUrl });
          } else {
            // Fallback to opening in new tab
            window.open(book.previewLink, '_blank');
            setReadingLoading(false);
            setReadingBook(null);
            return;
          }
        } else if (book.infoLink) {
          // If no preview, open info link in new tab
          window.open(book.infoLink, '_blank');
          setReadingLoading(false);
          setReadingBook(null);
          return;
        } else {
          setSelectedBook(book);
          // Fetch similar books by the same author
          if (book.author_name && book.author_name.length > 0) {
            fetchSimilarBooks(book.author_name, book.id);
          }
        }
        setReadingLoading(false);
        return;
      }

      // For Open Library books
      let archiveId = null;
      let embedUrl = null;

      // Check if book has Internet Archive ID
      if (book.ia && book.ia.length > 0) {
        archiveId = book.ia[0];
      } else if (book.key) {
        // Try to find an edition with Internet Archive ID
        const editionsResponse = await fetch(`https://openlibrary.org${book.key}/editions.json?limit=5`);
        const editionsData = await editionsResponse.json();

        if (editionsData.entries && editionsData.entries.length > 0) {
          const editionWithArchive = editionsData.entries.find(edition => edition.ia);
          if (editionWithArchive) {
            archiveId = editionWithArchive.ia;
          }
        }
      }

      if (archiveId) {
        // Set the reading book with archive ID for iframe
        setReadingBook({ ...book, archiveId });
      } else {
        // Try to find other reading options
        if (book.key) {
          try {
            // Check if there's a borrowable copy
            const borrowResponse = await fetch(`https://openlibrary.org${book.key}/borrow.json`);
            if (borrowResponse.ok) {
              const borrowData = await borrowResponse.json();
              if (borrowData && borrowData.url) {
                embedUrl = borrowData.url;
              }
            }
          } catch (borrowError) {
            console.warn('Error checking borrow options:', borrowError);
          }
        }

        if (embedUrl) {
          setReadingBook({ ...book, embedUrl });
        } else {
          // No readable version found, show details
          setSelectedBook(book);
          // Fetch similar books by the same author
          if (book.author_name && book.author_name.length > 0) {
            fetchSimilarBooks(book.author_name, book.id);
          }
        }
      }
    } catch (error) {
      console.error('Error opening book from shelf:', error);
      setSelectedBook(book);
      // Fetch similar books by the same author
      if (book.author_name && book.author_name.length > 0) {
        fetchSimilarBooks(book.author_name, book.id);
      }
    } finally {
      setReadingLoading(false);
    }
  };

  // Function to close book reader modal
  const closeBookReader = () => {
    setReadingBook(null);
  };

  // Function to close book details modal
  const closeBookDetails = () => {
    setSelectedBook(null);
    setSimilarBooks([]);
    setLoadingSimilar(false);
  };

  // Function to fetch similar books by the same author
  const fetchSimilarBooks = async (authorName, currentBookId) => {
    if (!authorName || authorName.length === 0) return [];

    setLoadingSimilar(true);
    try {
      // Search for books by the same author
      const authorQuery = authorName[0]; // Use first author

      // Fetch from multiple APIs
      const allBooks = [];

      try {
        // Fetch from Open Library with title search for more exact results
        const openLibraryResponse = await fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(authorQuery)}&limit=20`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!openLibraryResponse.ok) {
          throw new Error(`Open Library API error: ${openLibraryResponse.status}`);
        }

        const openLibraryData = await openLibraryResponse.json();

        if (openLibraryData.docs) {
          const openLibraryBooks = openLibraryData.docs.map(book => ({
            ...book,
            source: 'openlibrary',
            id: `ol_${book.key}`,
            coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
            rating: Math.floor(Math.random() * 3) + 3, // Random rating 3-5
            isPremium: Math.random() > 0.7 // 30% chance for demo
          }));
          allBooks.push(...openLibraryBooks);
        }
      } catch (error) {
        console.warn('Error fetching from Open Library:', error);
      }

      try {
        // Fetch from Google Books API
        const googleBooksResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(authorQuery)}&maxResults=20&orderBy=relevance`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!googleBooksResponse.ok) {
          throw new Error(`Google Books API error: ${googleBooksResponse.status}`);
        }

        const googleBooksData = await googleBooksResponse.json();

        if (googleBooksData.items) {
          const googleBooks = googleBooksData.items.map(item => {
            const volumeInfo = item.volumeInfo;
            return {
              key: item.id,
              title: volumeInfo.title,
              author_name: volumeInfo.authors || [],
              first_publish_year: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate).getFullYear() : null,
              coverUrl: volumeInfo.imageLinks?.thumbnail ? volumeInfo.imageLinks.thumbnail.replace('http:', 'https:').replace('&edge=curl', '') : null,
              publisher: volumeInfo.publisher ? [volumeInfo.publisher] : [],
              isbn: volumeInfo.industryIdentifiers ? volumeInfo.industryIdentifiers.map(id => id.identifier) : [],
              subject: volumeInfo.categories || [],
              language: volumeInfo.language ? [volumeInfo.language] : [],
              number_of_pages_median: volumeInfo.pageCount,
              edition_count: volumeInfo.editions ? 1 : 1,
              source: 'googlebooks',
              id: `gb_${item.id}`,
              rating: Math.floor(Math.random() * 3) + 3, // Random rating 3-5
              isPremium: Math.random() > 0.7, // 30% chance for demo
              description: volumeInfo.description,
              previewLink: volumeInfo.previewLink,
              infoLink: volumeInfo.infoLink
            };
          });
          allBooks.push(...googleBooks);
        }
      } catch (error) {
        console.warn('Error fetching from Google Books:', error);
      }

      // Remove duplicates based on title and author
      const uniqueBooks = allBooks.filter((book, index, self) =>
        index === self.findIndex(b =>
          b.title?.toLowerCase() === book.title?.toLowerCase() &&
          JSON.stringify(b.author_name?.sort()) === JSON.stringify(book.author_name?.sort())
        )
      );

      // Filter out the current book and limit to 4 similar books
      const filteredSimilar = uniqueBooks
        .filter(book => book.id !== currentBookId)
        .slice(0, 4);

      setSimilarBooks(filteredSimilar);
    } catch (error) {
      console.error('Error fetching similar books:', error);
      setSimilarBooks([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    // Load my shelf from localStorage
    const savedShelf = localStorage.getItem('myBookShelf');
    if (savedShelf) {
      setMyShelf(JSON.parse(savedShelf));
    }
  }, []);

  // Save shelf to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('myBookShelf', JSON.stringify(myShelf));
  }, [myShelf]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.theme-dropdown') && !event.target.closest('.filter-dropdown')) {
        setShowThemeDropdown(false);
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get theme-specific classes
  const getThemeClasses = () => {

    switch (theme) {

      case 'dark':

        return 'min-h-screen bg-gray-900 text-white';

      case 'reading':

        return 'min-h-screen bg-amber-50 text-gray-900';

      default:

        return 'min-h-screen bg-gray-100 text-gray-900';

    }

  };

  // Get card theme classes for My Shelf
  const getCardThemeClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-800 text-white border-gray-700";
      case "reading":
        return "bg-amber-50 text-amber-900 border-amber-200";
      default:
        return "bg-white text-gray-900 border-gray-200";
    }
  };

  // Render the application UI
  return (

    <div className={`${getThemeClasses()} relative`}>

      {/* Fixed background image */}
      <div className="fixed inset-0 z-0">

        <img

          src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"

          alt="Library background"

          className="w-full h-full object-cover"

        />

      </div>

      {/* Content overlay */}
      <div className="relative z-10">

        <header className={`py-3 ${theme === 'dark' ? 'bg-gray-800 text-white' : theme === 'reading' ? 'bg-amber-100 text-gray-900' : 'bg-blue-600 text-white'} bg-opacity-90 backdrop-blur-sm`}>

          <div className="w-full px-4 md:px-4">

            <div className="flex flex-row justify-between items-center">

              <div className="flex flex-col md:flex-col">

                <h1 className="text-2xl md:text-3xl font-bold">Book <span className="hidden md:inline">Finder</span></h1>

                <p className="hidden md:block text-sm">Discover your next great read</p>

              </div>

              {/* Search Form */}
              <form className="flex items-center" onSubmit={(e) => { e.preventDefault(); performSearch(); }}>
                <input
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Search with AI"
                  className={`w-7/10 md:w-80 px-4 py-2 text-sm border rounded-l-lg focus:outline-none focus:ring-2 ${theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white focus:ring-gray-500'
                    : theme === 'reading'
                      ? 'bg-amber-50 border-amber-300 text-gray-900 focus:ring-amber-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                    }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-r-lg focus:outline-none focus:ring-2 bg-white text-gray-700 hover:bg-gray-50 border border-l-0 border-gray-300"
                >
                  🔍
                </button>
              </form>

              {/* Right side buttons - Shelf and Theme */}
              <div className="flex items-center space-x-2">
                {/* My Shelf Button - Desktop */}
                <button
                  onClick={() => setShowShelf(!showShelf)}
                  className={`hidden md:flex md:items-center md:space-x-2 px-3 py-2 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : theme === 'reading' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <span>📚</span>
                  <span>My Shelf ({myShelf.length})</span>
                </button>

                {/* Theme selector dropdown */}
                <div className="relative theme-dropdown">
                  <button
                    onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                    className={`px-3 py-2 rounded flex items-center space-x-2 text-sm ${theme === 'light' ? 'bg-gray-200 text-black' : ''}`}
                  >
                    <span>
                      {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '📖'}
                    </span>
                    <span className="hidden md:inline capitalize">{theme}</span>
                    <span>{showThemeDropdown ? '▲' : '▼'}</span>
                  </button>

                  {/* Dropdown menu */}
                  {showThemeDropdown && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50 bg-black ring-1 ring-gray-600">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            changeTheme('light');
                            setShowThemeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-white hover:bg-gray-700 ${theme === 'light' ? 'bg-gray-600' : ''}`}
                        >
                          <span>☀️</span>
                          <span>Light Mode</span>
                        </button>
                        <button
                          onClick={() => {
                            changeTheme('dark');
                            setShowThemeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-white hover:bg-gray-700 ${theme === 'dark' ? 'bg-gray-600' : ''}`}
                        >
                          <span>🌙</span>
                          <span>Dark Mode</span>
                        </button>
                        <button
                          onClick={() => {
                            changeTheme('reading');
                            setShowThemeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-white hover:bg-gray-700 ${theme === 'reading' ? 'bg-gray-600' : ''}`}
                        >
                          <span>📖</span>
                          <span>Reading Mode</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </header>

        {/* Filter Section */}
        <div className="py-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-end items-center">
              {/* My Shelf Button - Mobile */}
              <button
                onClick={() => setShowShelf(!showShelf)}
                className={`md:hidden px-4 py-2 rounded flex items-center space-x-2 text-sm ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : theme === 'reading' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <span>📚</span>
                <span>My Shelf ({myShelf.length})</span>
              </button>

              {/* Filter Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="px-4 py-2 rounded-lg flex items-center space-x-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                >
                  <span>
                    {bookFilter === 'all' ? '📚' : bookFilter === 'free' ? '🆓' : '💎'}
                  </span>
                  <span className="capitalize">{bookFilter === 'all' ? 'All' : bookFilter}</span>
                  <span>{showFilterDropdown ? '▲' : '▼'}</span>
                </button>

                {/* Filter Dropdown Menu */}
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50 bg-black ring-1 ring-gray-600">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setBookFilter('all');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-white hover:bg-gray-700 ${bookFilter === 'all' ? 'bg-gray-600' : ''}`}
                      >
                        <span>📚</span>
                        <span>All Books</span>
                      </button>
                      <button
                        onClick={() => {
                          setBookFilter('free');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-white hover:bg-gray-700 ${bookFilter === 'free' ? 'bg-gray-600' : ''}`}
                      >
                        <span>🆓</span>
                        <span>Free Books</span>
                      </button>
                      <button
                        onClick={() => {
                          setBookFilter('premium');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-white hover:bg-gray-700 ${bookFilter === 'premium' ? 'bg-gray-600' : ''}`}
                      >
                        <span>💎</span>
                        <span>Premium Books</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="w-full px-2 md:container md:mx-auto md:px-4 py-8">

          {showShelf ? (
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : theme === 'reading' ? 'bg-amber-50' : 'bg-white'} shadow-lg`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">My Shelf</h2>
                <button
                  onClick={() => setShowShelf(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Dropdowns */}
              <div className="flex items-center space-x-4 mb-4">
                {/* Theme selector removed from shelf page */}
              </div>

              {myShelf.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Your shelf is empty. Add some books to get started!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {myShelf.map((book) => (
                    <div
                      key={book.key}
                      className={`${getCardThemeClasses()} rounded-lg shadow-md p-4 flex flex-col items-center border cursor-pointer hover:shadow-lg transition-shadow`}
                      onClick={() => {
                        setSelectedBook(book);
                        if (book.author_name && book.author_name.length > 0) {
                          fetchSimilarBooks(book.author_name, book.id);
                        }
                      }}
                    >
                      <img
                        src={
                          book.coverUrl
                            ? book.coverUrl
                            : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjE5MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg=="
                        }
                        alt={book.title}
                        className="w-24 h-36 object-cover mb-3 rounded"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjE5MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg==";
                        }}
                      />
                      <h3 className="font-semibold text-sm text-center mb-2">{book.title}</h3>
                      <p className="text-xs text-gray-600 text-center mb-3">
                        {book.author_name ? book.author_name.join(", ") : "Unknown Author"}
                      </p>
                      <button
                        onClick={() => removeFromShelf(book.id)}
                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <BookGrid query={aiQuery} theme={theme} filter={bookFilter} onAddToShelf={addToShelf} isInShelf={isInShelf} />
          )}

        </main>

        {/* Book Reader Modal */}
        {readingBook && readingBook.archiveId && (
          <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50`} onClick={closeBookReader}>
            <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : theme === 'reading' ? 'bg-amber-50 text-amber-900' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <div>
                  <h2 className="text-xl font-bold">{readingBook.title}</h2>
                  <p className="text-sm text-gray-600">
                    {readingBook.author_name ? readingBook.author_name.join(", ") : "Unknown Author"}
                  </p>
                </div>
                <button
                  onClick={closeBookReader}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 p-4">
                <iframe
                  src={`https://archive.org/embed/${readingBook.archiveId}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                  className="rounded"
                  title={`Reading ${readingBook.title}`}
                ></iframe>
              </div>
            </div>
          </div>
        )}

        {/* Book Reader Loading */}
        {readingLoading && (
          <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50`}>
            <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : theme === 'reading' ? 'bg-amber-50 text-amber-900' : 'bg-white text-gray-900'} rounded-lg shadow-xl p-8 text-center`}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg">Opening book reader...</p>
              <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
            </div>
          </div>
        )}

        {/* Book Details Modal */}
        {selectedBook && (
          <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50`} onClick={closeBookDetails}>
            <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : theme === 'reading' ? 'bg-amber-50 text-amber-900' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">{selectedBook.title}</h2>
                  <button
                    onClick={closeBookDetails}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <img
                    src={
                      selectedBook.coverUrl
                        ? selectedBook.coverUrl.replace('-M.jpg', '-L.jpg')
                        : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIzMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg=="
                    }
                    alt={selectedBook.title}
                    className="w-full md:w-48 h-72 object-cover rounded"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIzMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg==";
                    }}
                  />

                  <div className="flex-1">
                    {/* Premium Book Notice */}
                    {selectedBook.isPremium && (
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl">💎</span>
                          <span className="font-bold text-purple-800">Premium Book</span>
                        </div>
                        <p className="text-purple-700 text-sm">This is a premium book. Purchase or subscribe to access the full content.</p>
                        <button className="mt-3 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
                          Purchase Book
                        </button>
                      </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="font-semibold">Rating:</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-sm ${star <= (selectedBook.rating || 3) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                        ))}
                        <span className="text-sm text-gray-500 ml-1">({selectedBook.rating || 3})</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <strong>Author(s):</strong> {selectedBook.author_name ? selectedBook.author_name.join(", ") : "Unknown"}
                      </div>
                      <div>
                        <strong>First Published:</strong> {selectedBook.first_publish_year || "N/A"}
                      </div>
                      {selectedBook.publisher && selectedBook.publisher.length > 0 && (
                        <div>
                          <strong>Publisher:</strong> {selectedBook.publisher.join(", ")}
                        </div>
                      )}
                      {selectedBook.isbn && selectedBook.isbn.length > 0 && (
                        <div>
                          <strong>ISBN:</strong> {selectedBook.isbn[0]}
                        </div>
                      )}
                      {selectedBook.subject && selectedBook.subject.length > 0 && (
                        <div>
                          <strong>Subjects:</strong> {selectedBook.subject.slice(0, 5).join(", ")}
                        </div>
                      )}
                      {selectedBook.language && selectedBook.language.length > 0 && (
                        <div>
                          <strong>Language:</strong> {selectedBook.language.join(", ")}
                        </div>
                      )}
                      {selectedBook.number_of_pages_median && (
                        <div>
                          <strong>Pages:</strong> {selectedBook.number_of_pages_median}
                        </div>
                      )}
                      {selectedBook.edition_count && (
                        <div>
                          <strong>Editions:</strong> {selectedBook.edition_count}
                        </div>
                      )}
                      <div>
                        <strong>Source:</strong> {selectedBook.source === 'googlebooks' ? 'Google Books' : 'Open Library'}
                      </div>
                    </div>

                    {/* Description for Google Books */}
                    {selectedBook.description && (
                      <div className="mt-4">
                        <strong>Description:</strong>
                        <p className="text-sm text-gray-600 mt-1">{selectedBook.description.substring(0, 300)}...</p>
                      </div>
                    )}

                    {/* Read Book Button */}
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          const bookToRead = selectedBook; // Store book reference before closing modal
                          closeBookDetails();
                          openBookFromShelf(bookToRead);
                        }}
                        className={`px-6 py-3 rounded-lg font-semibold text-lg flex items-center justify-center space-x-2 w-full ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : theme === 'reading' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        <span>📖</span>
                        <span>Read This Book</span>
                      </button>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-700">
                          <strong>Reading Options:</strong>
                        </p>
                        <ul className="text-sm text-gray-600 mt-1 space-y-1">
                          <li>• <strong>Free Books:</strong> Available directly in our reader</li>
                          <li>• <strong>Google Books:</strong> Preview available in embedded reader</li>
                          <li>• <strong>Premium Books:</strong> Purchase required for full access</li>
                          <li>• <strong>External Links:</strong> Opens in new tab for additional options</li>
                        </ul>
                      </div>
                    </div>

                    {/* AI-Generated Summary */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">🤖</span>
                        <strong className="text-blue-800">AI Summary</strong>
                      </div>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        {selectedBook.title} by {selectedBook.author_name ? selectedBook.author_name.join(", ") : "Unknown Author"}
                        {selectedBook.first_publish_year ? `, published in ${selectedBook.first_publish_year}` : ''}.
                        {selectedBook.description ? ` ${selectedBook.description.substring(0, 200)}...` : ' An insightful work that explores important themes and concepts in its field. Readers will find valuable information and perspectives presented in an engaging manner.'}
                      </p>
                    </div>

                    {/* Similar Books Section */}
                    {selectedBook.author_name && selectedBook.author_name.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <span className="mr-2">📚</span>
                          More by {selectedBook.author_name[0]}
                        </h3>

                        {loadingSimilar ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600">Finding similar books...</span>
                          </div>
                        ) : similarBooks.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {similarBooks.map((book) => (
                              <div
                                key={book.id}
                                className={`${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : theme === 'reading' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-gray-50 text-gray-900 border-gray-200'} rounded-lg p-3 border hover:shadow-md transition-shadow cursor-pointer`}
                                onClick={() => {
                                  setSelectedBook(book);
                                  if (book.author_name && book.author_name.length > 0) {
                                    fetchSimilarBooks(book.author_name, book.id);
                                  }
                                }}
                              >
                                <img
                                  src={
                                    book.coverUrl
                                      ? book.coverUrl
                                      : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg=="
                                  }
                                  alt={book.title}
                                  className="w-16 h-24 object-cover mb-2 rounded mx-auto"
                                  onError={(e) => {
                                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg==";
                                  }}
                                />
                                <h4 className="font-medium text-sm text-center mb-1 line-clamp-2">{book.title}</h4>
                                <div className="flex items-center justify-center space-x-1 mb-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={`text-xs ${star <= (book.rating || 3) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                                  ))}
                                </div>
                                <p className="text-xs text-center text-gray-500">
                                  {book.first_publish_year || "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No similar books found by this author.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>

  );

}

// Export the App component as default
export default App;
