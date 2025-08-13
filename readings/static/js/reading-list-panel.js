if (typeof ReadingListPanel === 'undefined') {
    class ReadingListPanel {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.searchResults = [];
            this.init();
        }

        async init() {
            await this.loadReadings();
            this.setupEventListeners();
        }

        async loadReadings() {
            try {
                const response = await fetch('/api/reading-list/');
                if (response.status === 401) {
                    // User is not authenticated
                    const data = await response.json();
                    this.showAuthForm();
                    return;
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                this.renderReadings(data.readings || []);
            } catch (error) {
                console.error('Failed to load readings:', error);
                this.container.innerHTML = '<p>Error loading reading list: ' + error.message + '</p>';
            }
        }

        renderReadings(readings) {
            // Group readings by status
            const groupedReadings = {
                'to_read': readings.filter(r => r.status_code === 'to_read'),
                'reading': readings.filter(r => r.status_code === 'reading'),
                'completed': readings.filter(r => r.status_code === 'completed')
            };

            const totalBooks = readings.length;

            this.container.innerHTML = `
                <div class="readings-header">
                    <h2>📚 Reading List (${totalBooks} books)</h2>
                    <button id="refresh-readings">Refresh</button>
                </div>

                <!-- Search Section -->
                <div class="book-search-section">
                    <input type="text" id="bookSearch" placeholder="Search for books to add..." />
                    <div class="book-search-results" id="bookSearchResults">
                        <div class="search-welcome">
                            <p>Start typing to search for books...</p>
                        </div>
                    </div>
                </div>

                <!-- Reading List Sections -->
                <div class="reading-list-sections">
                    <div class="reading-section">
                        <h3 class="section-title">📖 Want to Read (${groupedReadings.to_read.length})</h3>
                        <div class="reading-section-content" id="toReadSection">
                            ${this.renderReadingSection(groupedReadings.to_read)}
                        </div>
                    </div>

                    <div class="reading-section">
                        <h3 class="section-title">📚 Currently Reading (${groupedReadings.reading.length})</h3>
                        <div class="reading-section-content" id="currentlyReadingSection">
                            ${this.renderReadingSection(groupedReadings.reading)}
                        </div>
                    </div>

                    <div class="reading-section">
                        <h3 class="section-title">✅ Completed (${groupedReadings.completed.length})</h3>
                        <div class="reading-section-content" id="completedSection">
                            ${this.renderReadingSection(groupedReadings.completed)}
                        </div>
                    </div>
                </div>
            `;

            this.setupEventListeners();
        }

        renderReadingSection(readings) {
            if (!readings || readings.length === 0) {
                return '<div class="empty-section">No books in this section</div>';
            }

            return readings.map(reading => {
                const statusColor = {
                    'to_read': '#6c757d',
                    'reading': '#007bff', 
                    'completed': '#28a745'
                }[reading.status_code] || '#6c757d';

                const progressBar = reading.progress_percentage > 0 ? `
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${reading.progress_percentage}%; background-color: ${statusColor};"></div>
                        <span class="progress-text">${reading.progress_percentage}%</span>
                    </div>
                ` : '';

                return `
                    <div class="reading-item" data-id="${reading.id}">
                        <div class="reading-item-content">
                            <h4 class="reading-title">${reading.title}</h4>
                            <p class="reading-author">by ${reading.author || 'Unknown'}</p>
                            ${reading.genre ? `<span class="reading-genre">${reading.genre}</span>` : ''}
                            ${reading.year ? `<span class="reading-year">${reading.year}</span>` : ''}
                            ${progressBar}
                            <div class="reading-dates">
                                ${reading.start_date ? `<small>Started: ${new Date(reading.start_date).toLocaleDateString()}</small>` : ''}
                                ${reading.completion_date ? `<small> | Completed: ${new Date(reading.completion_date).toLocaleDateString()}</small>` : ''}
                            </div>
                        </div>
                        <div class="reading-item-actions">
                            <select class="status-selector" data-reading-id="${reading.id}">
                                <option value="to_read" ${reading.status_code === 'to_read' ? 'selected' : ''}>Want to Read</option>
                                <option value="reading" ${reading.status_code === 'reading' ? 'selected' : ''}>Currently Reading</option>
                                <option value="completed" ${reading.status_code === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                            <button class="remove-btn" data-reading-id="${reading.id}">Remove</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async searchBooks(query) {
            if (!query || query.length < 2) {
                document.getElementById('bookSearchResults').innerHTML = `
                    <div class="search-welcome">
                        <p>Start typing to search for books...</p>
                    </div>
                `;
                return;
            }

            try {
                const response = await fetch(`/api/books/search/?q=${encodeURIComponent(query)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                this.searchResults = data.books || [];
                this.renderSearchResults(this.searchResults, query);
            } catch (error) {
                console.error('Failed to search books:', error);
                document.getElementById('bookSearchResults').innerHTML = `
                    <div class="search-error">
                        <p>Error searching books: ${error.message}</p>
                    </div>
                `;
            }
        }

        renderSearchResults(books, query) {
            const resultsContainer = document.getElementById('bookSearchResults');
            
            if (books.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="search-no-results">
                        <p>No books found for "${query}"</p>
                    </div>
                `;
                return;
            }

            const resultsHtml = books.map(book => `
                <div class="book-search-item" data-book-id="${book.id}">
                    <div class="book-info">
                        <div class="book-title">${book.title}</div>
                        <div class="book-author">by ${book.author}</div>
                        <div class="book-details">
                            ${book.year ? `<span class="book-year">${book.year}</span>` : ''}
                            ${book.genre ? `<span class="book-genre">${book.genre}</span>` : ''}
                            ${book.author_period ? `<span class="book-period">${book.author_period}</span>` : ''}
                        </div>
                    </div>
                    <div class="book-actions">
                        <select class="add-status-selector" data-book-id="${book.id}">
                            <option value="">Add to...</option>
                            <option value="to_read">Want to Read</option>
                            <option value="reading">Currently Reading</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
            `).join('');

            resultsContainer.innerHTML = `
                <div class="search-results-header">
                    <h4>Search Results for "${query}" (${books.length} found)</h4>
                </div>
                <div class="search-results-list">
                    ${resultsHtml}
                </div>
            `;
        }

        async addToReadingList(bookId, status) {
            try {
                const response = await fetch('/api/reading-list/add/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        work_id: bookId,
                        status: status
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Show success message
                this.showMessage(data.message, 'success');
                
                // Reload the reading list
                await this.loadReadings();
                
                // Clear search
                document.getElementById('bookSearch').value = '';
                document.getElementById('bookSearchResults').innerHTML = `
                    <div class="search-welcome">
                        <p>Start typing to search for books...</p>
                    </div>
                `;

            } catch (error) {
                console.error('Failed to add book to reading list:', error);
                this.showMessage('Failed to add book to reading list: ' + error.message, 'error');
            }
        }

        async updateReadingStatus(readingId, newStatus) {
            try {
                const response = await fetch('/api/reading-list/update/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        reading_progress_id: readingId,
                        status: newStatus
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Show success message
                this.showMessage(data.message, 'success');
                
                // Reload the reading list
                await this.loadReadings();

            } catch (error) {
                console.error('Failed to update reading status:', error);
                this.showMessage('Failed to update reading status: ' + error.message, 'error');
            }
        }

        async removeFromReadingList(readingId) {
            if (!confirm('Are you sure you want to remove this book from your reading list?')) {
                return;
            }

            try {
                const response = await fetch('/api/reading-list/remove/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        reading_progress_id: readingId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Show success message
                this.showMessage(data.message, 'success');
                
                // Reload the reading list
                await this.loadReadings();

            } catch (error) {
                console.error('Failed to remove book from reading list:', error);
                this.showMessage('Failed to remove book from reading list: ' + error.message, 'error');
            }
        }

        setupEventListeners() {
            // Search functionality
            const searchInput = document.getElementById('bookSearch');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchBooks(e.target.value.trim());
                    }, 300);
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-readings');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.loadReadings();
                });
            }

            // Event delegation for dynamic elements
            this.container.addEventListener('change', (e) => {
                if (e.target.classList.contains('add-status-selector')) {
                    const bookId = e.target.getAttribute('data-book-id');
                    const status = e.target.value;
                    if (status) {
                        this.addToReadingList(bookId, status);
                    }
                } else if (e.target.classList.contains('status-selector')) {
                    const readingId = e.target.getAttribute('data-reading-id');
                    const newStatus = e.target.value;
                    this.updateReadingStatus(readingId, newStatus);
                }
            });

            this.container.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-btn')) {
                    const readingId = e.target.getAttribute('data-reading-id');
                    this.removeFromReadingList(readingId);
                }
            });
        }

        showMessage(message, type = 'info') {
            // Create a temporary message element
            const messageEl = document.createElement('div');
            messageEl.className = `message message-${type}`;
            messageEl.textContent = message;
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            `;

            document.body.appendChild(messageEl);

            // Remove after 3 seconds
            setTimeout(() => {
                messageEl.remove();
            }, 3000);
        }

        showAuthForm() {
            const authHtml = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h3>🔐 Login Required</h3>
                        <p>Please login or create an account to access your reading list</p>
                    </div>
                    
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">Login</button>
                        <button class="auth-tab" data-tab="signup">Sign Up</button>
                    </div>
                    
                    <div class="auth-forms">
                        <!-- Login Form -->
                        <div class="auth-form" id="loginForm">
                            <div class="form-group">
                                <label for="loginUsername">Username:</label>
                                <input type="text" id="loginUsername" placeholder="Enter your username">
                            </div>
                            <div class="form-group">
                                <label for="loginPassword">Password:</label>
                                <input type="password" id="loginPassword" placeholder="Enter your password">
                            </div>
                            <div class="form-actions">
                                <button id="loginBtn" class="auth-btn primary">Login</button>
                            </div>
                            <div class="auth-message" id="loginMessage"></div>
                        </div>
                        
                        <!-- Signup Form -->
                        <div class="auth-form hidden" id="signupForm">
                            <div class="form-group">
                                <label for="signupUsername">Username:</label>
                                <input type="text" id="signupUsername" placeholder="Choose a username">
                            </div>
                            <div class="form-group">
                                <label for="signupEmail">Email:</label>
                                <input type="email" id="signupEmail" placeholder="Enter your email">
                            </div>
                            <div class="form-group">
                                <label for="signupFirstName">First Name (optional):</label>
                                <input type="text" id="signupFirstName" placeholder="Your first name">
                            </div>
                            <div class="form-group">
                                <label for="signupLastName">Last Name (optional):</label>
                                <input type="text" id="signupLastName" placeholder="Your last name">
                            </div>
                            <div class="form-group">
                                <label for="signupPassword">Password:</label>
                                <input type="password" id="signupPassword" placeholder="Choose a password">
                            </div>
                            <div class="form-group">
                                <label for="signupConfirmPassword">Confirm Password:</label>
                                <input type="password" id="signupConfirmPassword" placeholder="Confirm your password">
                            </div>
                            <div class="form-actions">
                                <button id="signupBtn" class="auth-btn primary">Sign Up</button>
                            </div>
                            <div class="auth-message" id="signupMessage"></div>
                        </div>
                    </div>
                </div>
            `;

            this.container.innerHTML = authHtml;
            this.bindAuthEvents();
        }

        bindAuthEvents() {
            // Tab switching
            const tabs = document.querySelectorAll('.auth-tab');
            const forms = document.querySelectorAll('.auth-form');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs and forms
                    tabs.forEach(t => t.classList.remove('active'));
                    forms.forEach(f => f.classList.add('hidden'));
                    
                    // Add active class to clicked tab and corresponding form
                    tab.classList.add('active');
                    const formId = tab.dataset.tab + 'Form';
                    document.getElementById(formId).classList.remove('hidden');
                });
            });

            // Login form
            const loginBtn = document.getElementById('loginBtn');
            const loginForm = document.getElementById('loginForm');
            
            if (loginBtn) {
                loginBtn.addEventListener('click', () => this.handleLogin());
            }
            
            // Add enter key support for login
            if (loginForm) {
                loginForm.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleLogin();
                    }
                });
            }

            // Signup form
            const signupBtn = document.getElementById('signupBtn');
            const signupForm = document.getElementById('signupForm');
            
            if (signupBtn) {
                signupBtn.addEventListener('click', () => this.handleSignup());
            }
            
            // Add enter key support for signup
            if (signupForm) {
                signupForm.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSignup();
                    }
                });
            }
        }

        async handleLogin() {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            const messageDiv = document.getElementById('loginMessage');
            
            if (!username || !password) {
                this.showMessage(messageDiv, 'Please enter both username and password', 'error');
                return;
            }
            
            const loginBtn = document.getElementById('loginBtn');
            const originalText = loginBtn.textContent;
            loginBtn.textContent = 'Logging in...';
            loginBtn.disabled = true;
            
            try {
                const response = await fetch('/api/auth/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken(),
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    this.showMessage(messageDiv, 'Login successful! Loading your reading list...', 'success');
                    setTimeout(() => {
                        this.loadReadings(); // Reload readings after successful login
                        // Update main app UI to show profile button
                        if (window.readingTrackerVis) {
                            window.readingTrackerVis.checkAuthAndUpdateUI();
                        }
                    }, 1000);
                } else {
                    this.showMessage(messageDiv, data.error || 'Login failed', 'error');
                }
            } catch (error) {
                this.showMessage(messageDiv, 'Network error. Please try again.', 'error');
                console.error('Login error:', error);
            } finally {
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
            }
        }

        async handleSignup() {
            const username = document.getElementById('signupUsername').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const firstName = document.getElementById('signupFirstName').value.trim();
            const lastName = document.getElementById('signupLastName').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
            const messageDiv = document.getElementById('signupMessage');
            
            if (!username || !email || !password) {
                this.showMessage(messageDiv, 'Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                this.showMessage(messageDiv, 'Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                this.showMessage(messageDiv, 'Password must be at least 6 characters long', 'error');
                return;
            }
            
            const signupBtn = document.getElementById('signupBtn');
            const originalText = signupBtn.textContent;
            signupBtn.textContent = 'Creating account...';
            signupBtn.disabled = true;
            
            try {
                const response = await fetch('/api/auth/signup/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken(),
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        first_name: firstName,
                        last_name: lastName,
                        password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    this.showMessage(messageDiv, 'Account created successfully! Loading your reading list...', 'success');
                    setTimeout(() => {
                        this.loadReadings(); // Reload readings after successful signup
                        // Update main app UI to show profile button
                        if (window.readingTrackerVis) {
                            window.readingTrackerVis.checkAuthAndUpdateUI();
                        }
                    }, 1000);
                } else {
                    this.showMessage(messageDiv, data.error || 'Signup failed', 'error');
                }
            } catch (error) {
                this.showMessage(messageDiv, 'Network error. Please try again.', 'error');
                console.error('Signup error:', error);
            } finally {
                signupBtn.textContent = originalText;
                signupBtn.disabled = false;
            }
        }

        showMessage(element, message, type) {
            element.textContent = message;
            element.className = `auth-message ${type}`;
            element.style.display = 'block';
        }

        getCSRFToken() {
            // Try to get CSRF token from meta tag first
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            if (csrfMeta) {
                return csrfMeta.getAttribute('content');
            }
            
            // Fallback to cookie method
            const name = 'csrftoken';
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            
            return cookieValue;
        }
    }

    // Make ReadingListPanel available globally
    window.ReadingListPanel = ReadingListPanel;
}
