if (typeof NotesPanel === 'undefined') {
    class NotesPanel {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.init();
        }

        async init() {
            await this.loadNotes();
            this.setupEventListeners();
        }

        async loadNotes() {
            try {
                const response = await fetch('/api/notes/');
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
                this.renderNotes(data.notes || []);
            } catch (error) {
                console.error('Failed to load notes:', error);
                this.container.innerHTML = '<p>Error loading notes: ' + error.message + '</p>';
            }
        }

        renderNotes(notes) {
            // Show notes toolbar and filter when rendering notes
            const notesToolbar = document.getElementById('notesFilter');
            const addNoteBtn = document.querySelector('.notes-toolbar');
            
            if (notesToolbar) {
                notesToolbar.style.display = 'block';
            }
            if (addNoteBtn) {
                addNoteBtn.style.display = 'flex';
            }
            
            if (!notes || notes.length === 0) {
                this.container.innerHTML = `
                    <div class="empty-notes">
                        <p>No notes yet. Click "Add Note" to create your first note.</p>
                    </div>
                `;
                return;
            }

            const notesHtml = notes.map(note => `
                <div class="note-item" data-id="${note.id}">
                    <div class="note-header">
                        <h4>${note.title || 'Untitled'}</h4>
                        <div class="note-actions">
                            <button class="edit-note-btn" data-id="${note.id}" title="Edit">✏️</button>
                            <button class="delete-note-btn" data-id="${note.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <div class="note-book-relation">
                        <span class="book-info"><strong>${note.work_title}</strong> by ${note.author_name}</span>
                    </div>
                    <div class="note-content">
                        ${this.formatNoteContent(note.content)}
                    </div>
                    <div class="note-dates">
                        <small>
                            Created: ${new Date(note.created_at).toLocaleDateString()}
                            ${note.updated_at !== note.created_at ? ` | Updated: ${new Date(note.updated_at).toLocaleDateString()}` : ''}
                        </small>
                    </div>
                </div>
            `).join('');

            this.container.innerHTML = notesHtml;
        }

        formatNoteContent(content) {
            // Basic markdown-like formatting for display
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }

        showAddNoteForm() {
            const formHtml = `
                <div class="note-form">
                    <div class="form-group">
                        <label for="noteTitle">Title:</label>
                        <input type="text" id="noteTitle" placeholder="Enter note title...">
                    </div>
                    <div class="form-group">
                        <label for="noteAuthor">Author (optional):</label>
                        <input type="text" id="noteAuthor" placeholder="Author name...">
                    </div>
                    <div class="form-group">
                        <label for="noteWork">Work/Book (optional):</label>
                        <input type="text" id="noteWork" placeholder="Book or work title...">
                    </div>
                    <div class="form-group">
                        <label for="noteContent">Content: <span class="markdown-indicator">Markdown enabled</span></label>
                        <div class="markdown-toolbar">
                            <button type="button" class="md-tool" title="Bold" data-md="**Bold**">B</button>
                            <button type="button" class="md-tool" title="Italic" data-md="*Italic*">I</button>
                            <button type="button" class="md-tool" title="Heading" data-md="## Heading">H</button>
                            <button type="button" class="md-tool" title="Link" data-md="[Link text](https://example.com)">🔗</button>
                            <button type="button" class="md-tool" title="List" data-md="- List item">•</button>
                            <button type="button" class="md-tool" title="Quote" data-md="> Blockquote">❞</button>
                            <button type="button" class="md-tool" title="Code" data-md="\`code\`">{ }</button>
                            <button type="button" class="md-preview-toggle">Preview</button>
                        </div>
                        <textarea id="noteContent" rows="6" placeholder="Enter your note content using Markdown formatting..."></textarea>
                        <div id="markdownPreview" class="markdown-preview"></div>
                        <div class="markdown-help">
                            <details>
                                <summary>Markdown Help</summary>
                                <div class="markdown-help-content">
                                    <p><strong>Bold:</strong> **text** or __text__</p>
                                    <p><em>Italic:</em> *text* or _text_</p>
                                    <p><strong>Headings:</strong> # Heading 1, ## Heading 2, ### Heading 3</p>
                                    <p><strong>Links:</strong> [Link text](https://example.com)</p>
                                    <p><strong>Lists:</strong> - Item or 1. Item</p>
                                    <p><strong>Blockquote:</strong> > Quote</p>
                                    <p><strong>Code:</strong> \`code\` or \`\`\`multiline code\`\`\`</p>
                                </div>
                            </details>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button id="saveNoteBtn" class="save-note-btn">Save Note</button>
                        <button id="cancelNoteBtn" class="cancel-note-btn">Cancel</button>
                    </div>
                </div>
            `;

            this.container.innerHTML = formHtml;

            // Focus on title input
            const titleInput = document.getElementById('noteTitle');
            if (titleInput) {
                titleInput.focus();
            }

            // Set up markdown toolbar functionality
            this.setupMarkdownTools();

            // Bind form events
            const saveBtn = document.getElementById('saveNoteBtn');
            const cancelBtn = document.getElementById('cancelNoteBtn');

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveNote();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.loadNotes();
                });
            }
        }

        setupMarkdownTools() {
            const toolbar = document.querySelector('.markdown-toolbar');
            const textarea = document.getElementById('noteContent');
            const previewDiv = document.getElementById('markdownPreview');
            const previewToggle = document.querySelector('.md-preview-toggle');

            if (!toolbar || !textarea) return;

            // Markdown tool buttons
            toolbar.addEventListener('click', (e) => {
                if (e.target.classList.contains('md-tool') && e.target.dataset.md) {
                    const mdText = e.target.dataset.md;
                    this.insertMarkdown(textarea, mdText);
                } else if (e.target.classList.contains('md-preview-toggle')) {
                    this.togglePreview(textarea, previewDiv, e.target);
                }
            });
        }

        insertMarkdown(textarea, markdown) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            
            let newText;
            if (markdown.includes('Link text')) {
                newText = markdown.replace('Link text', selectedText || 'Link text');
            } else if (markdown.includes('Bold')) {
                newText = markdown.replace('Bold', selectedText || 'Bold');
            } else if (markdown.includes('Italic')) {
                newText = markdown.replace('Italic', selectedText || 'Italic');
            } else {
                newText = selectedText ? markdown.replace(markdown.match(/\w+/)[0], selectedText) : markdown;
            }
            
            textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
            textarea.focus();
            
            // Set cursor position
            const newCursorPos = start + newText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }

        togglePreview(textarea, previewDiv, button) {
            if (previewDiv.classList.contains('active')) {
                previewDiv.classList.remove('active');
                button.classList.remove('active');
                button.textContent = 'Preview';
            } else {
                // Use marked.js if available, otherwise basic formatting
                const content = textarea.value;
                if (typeof marked !== 'undefined') {
                    previewDiv.innerHTML = marked.parse(content);
                } else {
                    previewDiv.innerHTML = this.formatNoteContent(content);
                }
                previewDiv.classList.add('active');
                button.classList.add('active');
                button.textContent = 'Edit';
            }
        }

        async saveNote(editId = null) {
            const title = document.getElementById('noteTitle').value.trim();
            const content = document.getElementById('noteContent').value.trim();
            const author = document.getElementById('noteAuthor').value.trim();
            const work = document.getElementById('noteWork').value.trim();

            if (!title || !content) {
                alert('Please enter both title and content for the note.');
                return;
            }

            try {
                const noteData = {
                    title: title,
                    content: content,
                    author_name: author || 'General',
                    work_title: work || title
                };

                // Get CSRF token
                const csrfToken = this.getCSRFToken();

                const response = await fetch('/api/notes/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken,
                    },
                    body: JSON.stringify(noteData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save note');
                }

                const result = await response.json();
                console.log('Note saved successfully:', result);

                // Reload notes to show the new note
                await this.loadNotes();

            } catch (error) {
                console.error('Error saving note:', error);
                alert('Failed to save note: ' + error.message);
            }
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

        async deleteNote(noteId) {
            if (!confirm('Are you sure you want to delete this note?')) {
                return;
            }

            try {
                const csrfToken = this.getCSRFToken();

                const response = await fetch(`/api/notes/delete/${noteId}/`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken,
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete note');
                }

                console.log('Note deleted successfully');
                // Reload notes to remove the deleted note
                await this.loadNotes();

            } catch (error) {
                console.error('Error deleting note:', error);
                alert('Failed to delete note: ' + error.message);
            }
        }

        setupEventListeners() {
            // Handle clicks on edit and delete buttons
            this.container.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-note-btn')) {
                    const noteId = e.target.dataset.id;
                    // TODO: Implement edit functionality
                    console.log('Edit note:', noteId);
                } else if (e.target.classList.contains('delete-note-btn')) {
                    const noteId = e.target.dataset.id;
                    this.deleteNote(noteId);
                }
            });

            // Refresh button functionality is handled by the main app
        }

        showAuthForm() {
            // Hide notes toolbar and filter when showing auth form
            const notesToolbar = document.getElementById('notesFilter');
            const addNoteBtn = document.querySelector('.notes-toolbar');
            
            if (notesToolbar) {
                notesToolbar.style.display = 'none';
            }
            if (addNoteBtn) {
                addNoteBtn.style.display = 'none';
            }
            
            const authHtml = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h3>🔐 Login Required</h3>
                        <p>Please login or create an account to access your notes</p>
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
                    this.showMessage(messageDiv, 'Login successful! Loading your notes...', 'success');
                    setTimeout(() => {
                        this.loadNotes(); // Reload notes after successful login
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
                    this.showMessage(messageDiv, 'Account created successfully! Loading your notes...', 'success');
                    setTimeout(() => {
                        this.loadNotes(); // Reload notes after successful signup
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
    }

    // Make NotesPanel available globally
    window.NotesPanel = NotesPanel;
}
