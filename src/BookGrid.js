// Import React hooks for state management and side effects
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// BookGrid component that fetches and displays books in a grid layout
const BookGrid = ({ query = "javascript", theme = "light", filter = "all", onAddToShelf, isInShelf }) => {

    // State for storing the list of books
    const [books, setBooks] = useState([]);

    // State for loading indicator
    const [loading, setLoading] = useState(true);

    // State for loading more books
    const [loadingMore, setLoadingMore] = useState(false);

    // State for error messages
    const [error, setError] = useState(null);

    // State for whether we've loaded initial books
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // State for book reader
    const [readingBook, setReadingBook] = useState(null);
    const [readingLoading, setReadingLoading] = useState(false);

    // State for selected book modal (for premium books or details)
    const [selectedBook, setSelectedBook] = useState(null);

    // State for similar books by the same author
    const [similarBooks, setSimilarBooks] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);

    // Function to determine if a book is premium
    const isBookPremium = (book) => {
        // Simulate premium books based on certain criteria
        // In a real app, this would come from your backend/database
        const premiumKeywords = ['advanced', 'professional', 'expert', 'master', 'comprehensive', 'complete guide'];
        const title = book.title?.toLowerCase() || '';
        const hasPremiumKeyword = premiumKeywords.some(keyword => title.includes(keyword));

        // Also consider newer books or books with high edition counts as potentially premium
        const isRecent = book.first_publish_year && book.first_publish_year > 2010;
        const hasManyEditions = book.edition_count && book.edition_count > 5;

        return hasPremiumKeyword || (isRecent && hasManyEditions) || Math.random() > 0.7; // 30% chance for demo
    };

    // Function to generate star rating (1-5 stars)
    const generateStarRating = (book) => {
        // Generate rating based on book properties
        let rating = 3; // base rating

        if (book.first_publish_year) {
            const age = new Date().getFullYear() - book.first_publish_year;
            if (age < 5) rating += 0.5; // newer books get higher rating
            else if (age > 50) rating += 1; // classic books get higher rating
        }

        if (book.edition_count && book.edition_count > 10) rating += 0.5; // popular books
        if (book.author_name && book.author_name.length > 1) rating += 0.5; // multiple authors

        // Add some randomness
        rating += (Math.random() - 0.5) * 0.5;

        return Math.max(1, Math.min(5, Math.round(rating * 2) / 2)); // 1-5 stars, 0.5 increments
    };

    // Function to generate AI-like book summary
    const generateBookSummary = (book) => {
        const title = book.title || 'Unknown Title';
        const authors = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
        const year = book.first_publish_year || 'Unknown Year';
        const subjects = book.subject ? book.subject.slice(0, 3).join(', ') : '';
        const description = book.description || '';

        // Create a summary based on available metadata
        let summary = `${title} by ${authors}`;

        if (year !== 'Unknown Year') {
            summary += `, published in ${year}`;
        }

        summary += '. ';

        if (description) {
            // Use the first 200 characters of description as base
            summary += description.substring(0, 200);
            if (description.length > 200) summary += '...';
        } else if (subjects) {
            // Generate summary from subjects
            summary += `This book covers topics including ${subjects}. `;
            summary += `A comprehensive exploration of ${subjects.split(', ')[0]} and related subjects.`;
        } else {
            // Fallback summary
            summary += `An insightful work that explores important themes and concepts in its field. `;
            summary += `Readers will find valuable information and perspectives presented in an engaging manner.`;
        }

        return summary;
    };

    // Function to fetch books from multiple APIs
    const fetchFromMultipleAPIs = useCallback(async (searchQuery, limit) => {
        const allBooks = [];

        // Detect if this looks like a language/culture query
        const languageCodes = {
            'hindi': 'hin',
            'english': 'eng',
            'spanish': 'spa',
            'french': 'fre',
            'german': 'ger',
            'italian': 'ita',
            'portuguese': 'por',
            'russian': 'rus',
            'japanese': 'jpn',
            'chinese': 'chi',
            'korean': 'kor',
            'arabic': 'ara',
            'sanskrit': 'san',
            'tamil': 'tam',
            'telugu': 'tel',
            'bengali': 'ben',
            'marathi': 'mar',
            'gujarati': 'guj',
            'punjabi': 'pan',
            'urdu': 'urd'
        };

        const cultureKeywords = ['culture', 'language', 'literature', 'tradition', 'history', 'india', 'indian'];
        const lowerQuery = searchQuery.toLowerCase();
        const isLanguageQuery = languageCodes[lowerQuery] || cultureKeywords.some(keyword => lowerQuery.includes(keyword));
        const languageCode = languageCodes[lowerQuery];

        try {
            // Fetch from Open Library with enhanced search logic
            let openLibraryUrl;
            if (isLanguageQuery) {
                if (languageCode) {
                    // Search by language code
                    openLibraryUrl = `https://openlibrary.org/search.json?language=${languageCode}&limit=${limit}`;
                } else {
                    // Search by subject for culture-related queries
                    openLibraryUrl = `https://openlibrary.org/subjects/${encodeURIComponent(searchQuery)}.json?limit=${limit}`;
                }
            } else {
                // Regular title search - use general search for better results
                openLibraryUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
            }

            const openLibraryResponse = await fetch(openLibraryUrl);

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
                    rating: generateStarRating(book),
                    isPremium: isBookPremium(book)
                }));
                allBooks.push(...openLibraryBooks);
            }
        } catch (error) {
            console.warn('Error fetching from Open Library:', error);
            // Continue with Google Books API even if Open Library fails
        }

        try {
            // Fetch from Google Books API with enhanced search logic
            let googleBooksQuery;
            if (isLanguageQuery) {
                if (languageCode) {
                    // Search by language
                    googleBooksQuery = `lang:${languageCode}`;
                } else {
                    // Search by category/subject
                    googleBooksQuery = `subject:${encodeURIComponent(searchQuery)}`;
                }
            } else {
                // Regular title search - use general search for better results
                googleBooksQuery = `${encodeURIComponent(searchQuery)}`;
            }

            const googleBooksResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${googleBooksQuery}&maxResults=${limit}&orderBy=relevance`);

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
                        coverUrl: volumeInfo.imageLinks?.thumbnail ? volumeInfo.imageLinks.thumbnail.replace('http:', 'https:').replace('&edge:curl', '') : null,
                        publisher: volumeInfo.publisher ? [volumeInfo.publisher] : [],
                        isbn: volumeInfo.industryIdentifiers ? volumeInfo.industryIdentifiers.map(id => id.identifier) : [],
                        subject: volumeInfo.categories || [],
                        language: volumeInfo.language ? [volumeInfo.language] : [],
                        number_of_pages_median: volumeInfo.pageCount,
                        edition_count: volumeInfo.editions ? 1 : 1,
                        source: 'googlebooks',
                        id: `gb_${item.id}`,
                        rating: generateStarRating(volumeInfo),
                        isPremium: isBookPremium(volumeInfo),
                        description: volumeInfo.description,
                        previewLink: volumeInfo.previewLink,
                        infoLink: volumeInfo.infoLink
                    };
                });
                allBooks.push(...googleBooks);
            }
        } catch (error) {
            console.warn('Error fetching from Google Books:', error);
            // If both APIs fail, we'll return an empty array
        }

        // Remove duplicates based on title and author
        const uniqueBooks = allBooks.filter((book, index, self) =>
            index === self.findIndex(b =>
                b.title?.toLowerCase() === book.title?.toLowerCase() &&
                JSON.stringify(b.author_name?.sort()) === JSON.stringify(book.author_name?.sort())
            )
        );

        return uniqueBooks;
    }, []);

    // Effect to fetch books when query or filter changes (initial load)
    useEffect(() => {
        // If no query, fetch some default popular books
        const searchQuery = (!query || query.trim() === '' || query.trim().length < 2) ? 'popular fiction' : query;

        // Reset state for new search/filter
        setBooks([]);
        setInitialLoadDone(false);
        setLoading(true);
        setError(null);

        // Fetch initial books
        fetchFromMultipleAPIs(searchQuery, 40) // Fetch more initially to have buffer
            .then(async (allBooks) => {
                // Filter books based on user filter
                const filteredBooksPromises = allBooks.map(async (book) => {
                    // Apply filter
                    if (filter === 'free' && book.isPremium) return null;
                    if (filter === 'premium' && !book.isPremium) return null;
                    return book;
                });

                const filteredBooksResults = await Promise.all(filteredBooksPromises);
                const filteredBooks = filteredBooksResults.filter(book => book !== null);

                // Take only the initial limit
                const initialBooks = filteredBooks.slice(0, 20);

                // Set the books data and stop loading
                setBooks(initialBooks);
                setInitialLoadDone(true);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching books:', err);
                setError('Failed to fetch books. Please try again.');
                setLoading(false);
            });
    }, [query, filter, fetchFromMultipleAPIs]); // Include fetchFromMultipleAPIs since it's used in the effect

    // Function to load more books by fetching additional ones and appending
    const loadMore = async () => {
        if (loadingMore) return; // Prevent multiple simultaneous loads

        setLoadingMore(true);
        try {
            // Use default query if no search query provided
            const searchQuery = (!query || query.trim() === '' || query.trim().length < 2) ? 'popular fiction' : query;

            // Fetch more books (fetch double what we need to account for filtering)
            const additionalBooks = await fetchFromMultipleAPIs(searchQuery, 40);

            // Filter the new books
            const filteredBooksPromises = additionalBooks.map(async (book) => {
                if (filter === 'free' && book.isPremium) return null;
                if (filter === 'premium' && !book.isPremium) return null;
                return book;
            });

            const filteredBooksResults = await Promise.all(filteredBooksPromises);
            const newFilteredBooks = filteredBooksResults.filter(book => book !== null);

            // Remove duplicates with existing books
            const existingIds = new Set(books.map(book => book.id));
            const uniqueNewBooks = newFilteredBooks.filter(book => !existingIds.has(book.id));

            // Take the next batch (20 more books)
            const nextBatch = uniqueNewBooks.slice(0, 20);

            // Append to existing books
            setBooks(prevBooks => [...prevBooks, ...nextBatch]);

        } catch (error) {
            console.error('Error loading more books:', error);
            setError('Failed to load more books');
        } finally {
            setLoadingMore(false);
        }
    };

    // Function to open book reader
    const openBookReader = async (book) => {
        if (book.isPremium) {
            // For premium books, show a purchase modal instead of reader
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
                        // Try to find an edition with reading options
                        const editionsResponse = await fetch(`https://openlibrary.org${book.key}/editions.json?limit=10`);
                        const editionsData = await editionsResponse.json();

                        if (editionsData.entries && editionsData.entries.length > 0) {
                            // Look for editions with Internet Archive ID or other reading options
                            for (const edition of editionsData.entries) {
                                if (edition.ia && edition.ia.length > 0) {
                                    archiveId = edition.ia[0];
                                    break;
                                }
                            }

                            // If still no archive ID, check for other reading links
                            if (!archiveId) {
                                const editionWithLinks = editionsData.entries.find(edition =>
                                    edition.table_of_contents ||
                                    edition.links ||
                                    edition.url ||
                                    edition.wikipedia
                                );
                                if (editionWithLinks) {
                                    // Open external link in new tab
                                    const externalUrl = editionWithLinks.url || editionWithLinks.wikipedia ||
                                        (editionWithLinks.links && editionWithLinks.links[0] && editionWithLinks.links[0].url);
                                    if (externalUrl) {
                                        window.open(externalUrl, '_blank');
                                        setReadingLoading(false);
                                        return;
                                    }
                                }
                            }
                        }
                    } catch (editionError) {
                        console.warn('Error checking edition options:', editionError);
                    }
                }

                if (archiveId) {
                    setReadingBook({ ...book, archiveId });
                } else {
                    // No readable version found, try Google Books or show details
                    if (book.source === 'googlebooks' && book.previewLink) {
                        window.open(book.previewLink, '_blank');
                        setReadingLoading(false);
                        return;
                    } else {
                        // Show book details modal as final fallback
                        setSelectedBook(book);
                        // Fetch similar books by the same author
                        if (book.author_name && book.author_name.length > 0) {
                            fetchSimilarBooks(book.author_name, book.id);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error opening book reader:', error);
            setSelectedBook(book);
            // Fetch similar books by the same author
            if (book.author_name && book.author_name.length > 0) {
                fetchSimilarBooks(book.author_name, book.id);
            }
        } finally {
            setReadingLoading(false);
        }
    };

    // Function to render star ratings
    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 0; i < fullStars; i++) {
            stars.push(<span key={i} className="text-yellow-400">★</span>);
        }

        if (hasHalfStar) {
            stars.push(<span key="half" className="text-yellow-400">☆</span>);
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<span key={`empty-${i}`} className="text-gray-300">☆</span>);
        }

        return stars;
    };

    // Function to fetch similar books by the same author
    const fetchSimilarBooks = useCallback(async (authorName, currentBookId) => {
        if (!authorName || authorName.length === 0) return [];

        setLoadingSimilar(true);
        try {
            // Search for books by the same author
            const authorQuery = authorName[0]; // Use first author
            const similarBooksData = await fetchFromMultipleAPIs(authorQuery, 20);

            // Filter out the current book and limit to 4 similar books
            const filteredSimilar = similarBooksData
                .filter(book => book.id !== currentBookId)
                .slice(0, 4);

            setSimilarBooks(filteredSimilar);
        } catch (error) {
            console.error('Error fetching similar books:', error);
            setSimilarBooks([]);
        } finally {
            setLoadingSimilar(false);
        }
    }, [fetchFromMultipleAPIs]);

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

    // Theme-specific classes
    const getThemeClasses = () => {

        switch (theme) {

            case "dark":

                return {

                    card: "bg-gray-800 text-white border-gray-700",

                    button: "bg-blue-600 hover:bg-blue-700 text-white",

                    modal: "bg-gray-800 text-white",

                    overlay: "bg-black bg-opacity-75"

                };

            case "reading":

                return {

                    card: "bg-amber-50 text-amber-900 border-amber-200",

                    button: "bg-amber-600 hover:bg-amber-700 text-white",

                    modal: "bg-amber-50 text-amber-900",

                    overlay: "bg-amber-900 bg-opacity-50"

                };

            default: // light

                return {

                    card: "bg-white text-gray-900 border-gray-200",

                    button: "bg-blue-600 hover:bg-blue-700 text-white",

                    modal: "bg-white text-gray-900",

                    overlay: "bg-black bg-opacity-50"

                };

        }

    };

    const themeClasses = getThemeClasses();

    // Show loading message while fetching
    if (loading) return <div className="text-center py-8">Loading books...</div>;

    // Show error message if fetch failed
    if (error) return <div className="text-center text-red-500 py-8">{error}</div>;

    // Render the book grid
    return (

        <div>

            {/* Default books header when no search query */}
            {(!query || query.trim() === '' || query.trim().length < 2) && (
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2 text-white">Discover Popular Books</h2>
                    <p className="text-white">Explore our curated selection of popular fiction books. Use the search bar above to find specific titles or authors.</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">

                {books.map((book, index) => (

                    <motion.div

                        key={book.id || book.key}

                        className={`${themeClasses.card} rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-xl transition-shadow cursor-pointer border relative`}

                        onClick={() => openBookReader(book)}

                        initial={{ opacity: 0, y: 20 }}

                        animate={{ opacity: 1, y: 0 }}

                        transition={{ duration: 0.3, delay: index * 0.1 }}

                        whileHover={{ scale: 1.05, y: -5 }}

                        whileTap={{ scale: 0.95 }}

                    >

                        {/* Premium Badge */}
                        {book.isPremium && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center space-x-1">
                                <span>💎</span>
                                <span>Premium</span>
                            </div>
                        )}

                        <img

                            src={

                                book.coverUrl

                                    ? book.coverUrl

                                    : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjE5MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg=="

                            }

                            alt={book.title}

                            className="w-32 h-48 object-cover mb-4 rounded"

                            onError={(e) => {
                                e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjE5MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg==";
                            }}

                        />

                        <h3 className="font-semibold text-lg text-center mb-2">{book.title}</h3>

                        {/* Star Rating */}
                        <div className="flex items-center space-x-1 mb-2">
                            {renderStars(book.rating)}
                            <span className="text-sm text-gray-500 ml-1">({book.rating})</span>
                        </div>

                        <p className="text-gray-600 text-sm text-center mb-2">

                            {book.author_name ? book.author_name.join(", ") : "Unknown Author"}

                        </p>

                        <p className="text-gray-400 text-xs">

                            First published: {book.first_publish_year || "N/A"}

                        </p>

                        {/* Source indicator */}
                        <div className="mt-2 text-xs text-gray-400">
                            {book.source === 'googlebooks' ? '📚 Google Books' : '📖 Open Library'}
                        </div>

                        {/* Add to Shelf Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToShelf(book);
                            }}
                            className={`mt-3 px-3 py-1 text-xs rounded transition-colors ${isInShelf(book.id)
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-gray-500 hover:bg-gray-600 text-white'
                                }`}
                        >
                            {isInShelf(book.id) ? 'Added' : 'Add to Shelf'}
                        </button>

                    </motion.div>

                ))}

            </div>

            {initialLoadDone && books.length >= 20 && (

                <div className="text-center py-4">

                    <button

                        onClick={loadMore}

                        disabled={loadingMore}

                        className={`${themeClasses.button} px-6 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}

                    >

                        {loadingMore ? 'Loading...' : 'Load More'}

                    </button>

                </div>

            )}

            {/* Book Reader Modal */}
            {(readingBook && (readingBook.archiveId || readingBook.embedUrl)) && (
                <div className={`fixed inset-0 ${themeClasses.overlay} flex items-center justify-center p-4 z-50`} onClick={closeBookReader}>
                    <div className={`${themeClasses.modal} rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
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
                            {readingBook.archiveId ? (
                                <iframe
                                    src={`https://archive.org/embed/${readingBook.archiveId}`}
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    allowFullScreen
                                    className="rounded"
                                    title={`Reading ${readingBook.title}`}
                                ></iframe>
                            ) : readingBook.embedUrl ? (
                                <iframe
                                    src={readingBook.embedUrl}
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    allowFullScreen
                                    className="rounded"
                                    title={`Reading ${readingBook.title}`}
                                ></iframe>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Book Reader Loading */}
            {readingLoading && (
                <div className={`fixed inset-0 ${themeClasses.overlay} flex items-center justify-center p-4 z-50`}>
                    <div className={`${themeClasses.modal} rounded-lg shadow-xl p-8 text-center`}>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-lg">Opening book reader...</p>
                        <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
                    </div>
                </div>
            )}

            {/* Book Details Modal */}
            {selectedBook && (
                <div className={`fixed inset-0 ${themeClasses.overlay} flex items-center justify-center p-4 z-50`} onClick={closeBookDetails}>
                    <div className={`${themeClasses.modal} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
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
                                            {renderStars(selectedBook.rating)}
                                            <span className="text-sm text-gray-500 ml-1">({selectedBook.rating})</span>
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
                                                openBookReader(bookToRead);
                                            }}
                                            className={`${themeClasses.button} px-6 py-3 rounded-lg font-semibold text-lg flex items-center justify-center space-x-2 w-full`}
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
                                            {generateBookSummary(selectedBook)}
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
                                                        <motion.div
                                                            key={book.id}
                                                            className={`${themeClasses.card} rounded-lg p-3 border hover:shadow-md transition-shadow cursor-pointer`}
                                                            onClick={() => {
                                                                setSelectedBook(book);
                                                                if (book.author_name && book.author_name.length > 0) {
                                                                    fetchSimilarBooks(book.author_name, book.id);
                                                                }
                                                            }}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <img
                                                                src={
                                                                    book.coverUrl
                                                                        ? book.coverUrl
                                                                        : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gQ292ZXI8L3RleHQ+PC9zdmc+"
                                                                }
                                                                alt={book.title}
                                                                className="w-16 h-24 object-cover mb-2 rounded mx-auto"
                                                                onError={(e) => {
                                                                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gQ292ZXI8L3RleHQ+PC9zdmc+";
                                                                }}
                                                            />
                                                            <h4 className="font-medium text-sm text-center mb-1 line-clamp-2">{book.title}</h4>
                                                            <div className="flex items-center justify-center space-x-1 mb-1">
                                                                {renderStars(book.rating)}
                                                            </div>
                                                            <p className="text-xs text-center text-gray-500">
                                                                {book.first_publish_year || "N/A"}
                                                            </p>
                                                        </motion.div>
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

    );

};

// Export the BookGrid component
export default BookGrid;