if (typeof ProfilePanel === 'undefined') {
    class ProfilePanel {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.init();
        }

        async init() {
            await this.loadProfile();
            this.setupEventListeners();
        }

        async loadProfile() {
            try {
                const response = await fetch('/api/auth/status/');
                if (response.status === 401 || !response.ok) {
                    // User is not authenticated
                    this.showAuthForm();
                    return;
                }
                
                const data = await response.json();
                if (data.authenticated) {
                    this.renderProfile(data.user);
                } else {
                    this.showAuthForm();
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
                this.container.innerHTML = '<p>Error loading profile: ' + error.message + '</p>';
            }
        }

        renderProfile(user) {
            const profileHtml = `
                <div class="profile-info">
                    <h4>Account Information</h4>
                    <div class="profile-field">
                        <span class="profile-field-label">Username:</span>
                        <span class="profile-field-value">${user.username}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Email:</span>
                        <span class="profile-field-value">${user.email || 'Not provided'}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">First Name:</span>
                        <span class="profile-field-value">${user.first_name || 'Not provided'}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Last Name:</span>
                        <span class="profile-field-value">${user.last_name || 'Not provided'}</span>
                    </div>
                </div>

                <div class="profile-stats">
                    <div class="stat-card">
                        <span class="stat-number" id="notesCount">-</span>
                        <span class="stat-label">Notes</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" id="readingCount">-</span>
                        <span class="stat-label">Reading List</span>
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="profile-btn-action edit-profile-btn" id="editProfileBtn">
                        Edit Profile
                    </button>
                    <button class="profile-btn-action logout-btn" id="logoutBtn">
                        Logout
                    </button>
                </div>
            `;

            this.container.innerHTML = profileHtml;
            this.loadUserStats();
            this.bindProfileActions();
        }

        async loadUserStats() {
            try {
                // Load notes count
                const notesResponse = await fetch('/api/notes/');
                if (notesResponse.ok) {
                    const notesData = await notesResponse.json();
                    const notesCountEl = document.getElementById('notesCount');
                    if (notesCountEl) {
                        notesCountEl.textContent = notesData.notes ? notesData.notes.length : 0;
                    }
                }

                // Load reading list count
                const readingResponse = await fetch('/api/reading-list/');
                if (readingResponse.ok) {
                    const readingData = await readingResponse.json();
                    const readingCountEl = document.getElementById('readingCount');
                    if (readingCountEl) {
                        readingCountEl.textContent = readingData.readings ? readingData.readings.length : 0;
                    }
                }
            } catch (error) {
                console.error('Error loading user stats:', error);
            }
        }

        bindProfileActions() {
            const editProfileBtn = document.getElementById('editProfileBtn');
            const logoutBtn = document.getElementById('logoutBtn');

            if (editProfileBtn) {
                editProfileBtn.addEventListener('click', () => {
                    this.showEditProfileForm();
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.handleLogout();
                });
            }
        }

        showEditProfileForm() {
            // TODO: Implement edit profile form
            alert('Edit profile functionality coming soon!');
        }

        async handleLogout() {
            if (!confirm('Are you sure you want to logout?')) {
                return;
            }

            try {
                const response = await fetch('/api/auth/logout/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken(),
                    }
                });

                if (response.ok) {
                    // Reload the profile panel to show login form
                    this.showAuthForm();
                    
                    // Update main app UI to hide profile button
                    if (window.readingTrackerVis) {
                        window.readingTrackerVis.checkAuthAndUpdateUI();
                    }
                    
                    // Optionally reload other panels
                    if (window.databaseNotesPanel) {
                        window.databaseNotesPanel.loadNotes();
                    }
                    if (window.databaseReadingListPanel) {
                        window.databaseReadingListPanel.loadReadings();
                    }
                } else {
                    alert('Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout failed. Please try again.');
            }
        }

        setupEventListeners() {
            // Handle refresh button if needed
        }

        showAuthForm() {
            const authHtml = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h3>Login Required</h3>
                        <p>Please login or create an account to view your profile</p>
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
            loginForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });

            // Signup form
            const signupBtn = document.getElementById('signupBtn');
            const signupForm = document.getElementById('signupForm');
            
            if (signupBtn) {
                signupBtn.addEventListener('click', () => this.handleSignup());
            }
            
            // Add enter key support for signup
            signupForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSignup();
                }
            });
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
                    this.showMessage(messageDiv, 'Login successful! Loading your profile...', 'success');
                    setTimeout(() => {
                        this.loadProfile(); // Reload profile after successful login
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
                    this.showMessage(messageDiv, 'Account created successfully! Loading your profile...', 'success');
                    setTimeout(() => {
                        this.loadProfile(); // Reload profile after successful signup
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

    // Make ProfilePanel available globally
    window.ProfilePanel = ProfilePanel;
}
