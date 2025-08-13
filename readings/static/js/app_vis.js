// Literature Timeline with vis.js - Simplified approach
if (typeof ReadingTrackerVis === 'undefined') {
    class ReadingTrackerVis {
        constructor() {
            this.authorsData = [];
            this.dictionaryData = [];
            this.selectedAuthor = null;
            this.timeline = null;
            this.groups = new vis.DataSet();
            this.items = new vis.DataSet();
        
        // Reading list data
        this.readingLists = {
            wantToRead: [],
            currentlyReading: [],
            read: []
        };
        
        // Store current search results to avoid JSON parsing issues
        this.currentSearchResults = [];
        
        // Additional dictionary data
        this.greekGodsData = [];
        this.ancientSitesData = [];
        
        // Use external configuration for authors and XML files
        this.config = window.AuthorsConfig;
        this.authorCategories = this.config.authorCategories;
        
        // Initialize data loading
        this.initializeData();
    }

    async initializeData() {
        // Load reading lists from localStorage/database
        await this.loadReadingLists();
        
        // Load main data
        this.loadData();
    }

    async loadData() {
        try {
            console.log('Loading data from database via API...');
            
            // Load author and work data from the Django API
            const response = await fetch('/api/load-xml-data/');
            if (response.ok) {
                const data = await response.json();
                
                // Transform the data to match expected structure (works -> books)
                this.authorsData = (data.authors || []).map(author => ({
                    ...author,
                    books: (author.works || []).map(work => ({
                        title: work.title,
                        year: work.year,
                        description: work.description,
                        characters: work.main_characters || []
                    }))
                }));
                
                console.log(`Loaded ${this.authorsData.length} authors from database`);
                
                // Update the configuration with loaded data
                this.updateConfigFromDatabase();
            } else {
                console.error('Failed to load data from API:', response.status);
                this.showErrorMessage('Failed to load data from database. Please ensure the Django server is running.');
                return;
            }
            
            // Load dictionary data
            await this.loadDictionary();
            
            // Load CSV data
            await this.loadCSVData();
            
        } catch (error) {
            console.error('Error loading data from database:', error);
            this.showErrorMessage('Failed to load data from database. Please check the server connection.');
            return;
        }
        
        this.init();
    }

    updateConfigFromDatabase() {
        // Update the configuration with authors loaded from database
        console.log('Updating configuration from database data...');
        
        // Clear existing categories and countries
        this.config.authorCategories = {};
        this.config.authorCountries = {};
        
        // Update categories and countries based on loaded data
        this.authorsData.forEach(author => {
            // Use author genre from database if available, otherwise determine from works
            let category = 'drama'; // default
            
            // First priority: use author genre from database
            if (author.genre) {
                category = author.genre;
            } else {
                // Fallback: determine category from works if author genre is not set
                if (author.works && author.works.length > 0) {
                    const work = author.works[0];
                    if (work.genre) {
                        switch (work.genre.toLowerCase()) {
                            case 'tragedy':
                                category = 'tragedy';
                                break;
                            case 'comedy':
                                category = 'comedy';
                                break;
                            case 'history':
                                category = 'history';
                                break;
                            case 'philosophy':
                                category = 'philosophy';
                                break;
                            case 'poetry':
                            case 'epic':
                                category = 'poetry';
                                break;
                            default:
                                category = 'drama';
                        }
                    }
                }
            }
            
            // Use determined category
            this.config.authorCategories[author.name] = category;
            this.config.authorCountries[author.name] = author.country || 'Unknown';
        });
        
        console.log('Configuration updated with database data');
    }

    async loadDictionary() {
        try {
            console.log('Loading dictionary data...');
            const response = await fetch('/static/data/Dic/dodson.xml');
            if (response.ok) {
                const xmlText = await response.text();
                this.parseDictionaryData(xmlText);
                console.log(`Dictionary loaded successfully with ${this.dictionaryData.length} entries`);
            } else {
                console.warn('Failed to load dictionary:', response.status);
                // Continue without dictionary data - it's not critical
                this.dictionaryData = [];
                console.log('Using empty dictionary data');
            }
        } catch (error) {
            console.warn('Error loading dictionary:', error);
            // Continue without dictionary data
            this.dictionaryData = [];
        }
    }

    async loadCSVData() {
        try {
            console.log('Loading CSV data...');
            
            // Load Greek Gods data
            const greekGodsResponse = await fetch('/static/data/Dic/greek_gods.csv');
            if (greekGodsResponse.ok) {
                const greekGodsText = await greekGodsResponse.text();
                this.parseGreekGodsData(greekGodsText);
                console.log('Greek gods data loaded:', this.greekGodsData.length, 'entries');
            } else {
                console.warn('Failed to load greek_gods.csv');
                // Continue without Greek gods data
                this.greekGodsData = [];
            }
            
            // Load Ancient Sites data
            const ancientSitesResponse = await fetch('/static/data/Dic/AncientSitesinTurkey.csv');
            if (ancientSitesResponse.ok) {
                const ancientSitesText = await ancientSitesResponse.text();
                this.parseAncientSitesData(ancientSitesText);
                console.log('Ancient sites data loaded:', this.ancientSitesData.length, 'entries');
            } else {
                console.warn('Failed to load AncientSitesinTurkey.csv');
                // Continue without Ancient sites data
                this.ancientSitesData = [];
            }
        } catch (error) {
            console.warn('Error loading CSV data:', error);
            // Set empty arrays for data
            this.greekGodsData = [];
            this.ancientSitesData = [];
        }
    }

    parseGreekGodsData(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        this.greekGodsData = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV line handling quoted fields
            const values = this.parseCSVLine(line);
            if (values.length >= 5) {
                this.greekGodsData.push({
                    englishName: values[0],
                    greekName: values[1],
                    mainType: values[2],
                    subType: values[3],
                    description: values[4]
                });
            }
        }
    }

    parseAncientSitesData(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        this.ancientSitesData = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV line handling quoted fields
            const values = this.parseCSVLine(line);
            if (values.length >= 8) {
                this.ancientSitesData.push({
                    name: values[1],
                    type: values[2],
                    link: values[3],
                    latitude: values[4],
                    longitude: values[5],
                    imageUrl: values[6],
                    description: values[7]
                });
            }
        }
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    parseDictionaryData(xmlText) {
        const parser = new DOMParser();
        const cleanXmlText = xmlText.trim().replace(/^\uFEFF/, '').replace(/^[\r\n\s]*(?=<\?xml)/, '');
        const xmlDoc = parser.parseFromString(cleanXmlText, 'text/xml');
        
        // Check for XML parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parsing error: ' + parserError.textContent);
        }
        
        const entries = xmlDoc.querySelectorAll('entry');
        this.dictionaryData = [];
        
        entries.forEach(entry => {
            const nAttr = entry.getAttribute('n');
            const orthElement = entry.querySelector('orth');
            const briefDef = entry.querySelector('def[role="brief"]');
            const fullDef = entry.querySelector('def[role="full"]');
            
            if (nAttr && orthElement) {
                // Extract the Greek word and number from the n attribute
                const parts = nAttr.split('|');
                const greekWord = parts[0] ? parts[0].trim() : '';
                const number = parts[1] ? parts[1].trim() : '';
                
                this.dictionaryData.push({
                    word: greekWord,
                    number: number,
                    orthographic: orthElement.textContent.trim(),
                    briefDefinition: briefDef ? briefDef.textContent.trim() : '',
                    fullDefinition: fullDef ? fullDef.textContent.trim() : ''
                });
            }
        });
    }

    parseXMLData(xmlText, filename = 'unknown') {
        const parser = new DOMParser();
        
        // Clean the XML text to remove any leading/trailing whitespace or BOM characters
        // Also remove any blank lines before the XML declaration
        const cleanXmlText = xmlText.trim().replace(/^\uFEFF/, '').replace(/^[\r\n\s]*(?=<\?xml)/, '');
        
        const xmlDoc = parser.parseFromString(cleanXmlText, 'text/xml');
        
        // Check for XML parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error(`XML parsing error in ${filename}:`, parserError.textContent);
            console.error('First 200 characters of XML:', xmlText.substring(0, 200));
            throw new Error(`XML parsing error in ${filename}: ` + parserError.textContent);
        }
        
        // Handle different XML structures
        let authors;
        if (xmlDoc.querySelector('reading_tracking')) {
            // Structure: <reading_tracking><authors><author>...</author></authors></reading_tracking>
            authors = xmlDoc.querySelectorAll('author');
        } else if (xmlDoc.querySelector('author')) {
            // Structure: <author>...</author> (single author file)
            authors = [xmlDoc.querySelector('author')];
        } else {
            console.warn(`No authors found in ${filename}`);
            return;
        }
        
        authors.forEach(authorNode => {
            const nameNode = authorNode.querySelector('name') || authorNode.querySelector('n');
            const birthYearNode = authorNode.querySelector('birth_year');
            const deathYearNode = authorNode.querySelector('death_year');
            const countryNode = authorNode.querySelector('country');
            
            // Skip if essential data is missing
            if (!nameNode || !birthYearNode || !deathYearNode) {
                console.warn(`Skipping author with missing essential data in ${filename}`);
                return;
            }
            
            const name = nameNode.textContent.trim();
            const birthYear = parseInt(birthYearNode.textContent);
            const deathYear = parseInt(deathYearNode.textContent);
            const bio = authorNode.querySelector('bio') ? authorNode.querySelector('bio').textContent.trim() : '';
            const country = countryNode ? countryNode.textContent.trim() : this.config.getAuthorCountry(name);
            
            // Validate parsed years
            if (isNaN(birthYear) || isNaN(deathYear)) {
                console.warn(`Skipping author ${name} with invalid year data in ${filename}`);
                return;
            }
            
            const books = [];
            const bookNodes = authorNode.querySelectorAll('book');
            
            bookNodes.forEach(bookNode => {
                const titleNode = bookNode.querySelector('title');
                if (!titleNode) return; // Skip books without titles
                
                const title = titleNode.textContent.trim();
                const yearText = bookNode.querySelector('year') ? bookNode.querySelector('year').textContent.trim() : null;
                const year = yearText ? parseInt(yearText) : null;
                const description = bookNode.querySelector('description') ? bookNode.querySelector('description').textContent.trim() : '';
                
                const characters = [];
                const characterNodes = bookNode.querySelectorAll('main_characters character, character');
                characterNodes.forEach(charNode => {
                    const characterName = charNode.textContent.trim();
                    if (characterName) {
                        characters.push(characterName);
                    }
                });
                
                books.push({
                    title,
                    year: isNaN(year) ? null : year,
                    description,
                    characters
                });
            });
            
            this.authorsData.push({
                name,
                birthYear,
                deathYear,
                bio,
                country,
                books
            });
            
            console.log(`Added author: ${name} (${birthYear} - ${deathYear})`);
        });
        
        console.log(`Parsed ${this.authorsData.length} authors from XML`);
    }

    init() {
        if (this.authorsData.length === 0) {
            console.warn('No authors data available for timeline initialization');
            this.showErrorMessage('No authors data available to display.');
            return;
        }
        
        console.log('Initializing timeline with', this.authorsData.length, 'authors');
        this.createTimelineData();
        console.log('Timeline data created. Items:', this.items.length, 'Groups:', this.groups.length);
        this.createTimeline();
        console.log('Timeline created successfully');
        this.bindEvents();
        this.bindPopupEvents();
        this.bindReadingListEvents();
        this.showInitialMessage();
    }

    createTimelineData() {
        // Clear existing data
        this.groups.clear();
        this.items.clear();
        
        // Create groups from configuration
        const groups = this.config.timelineGroups;
        
        groups.forEach(group => {
            this.groups.add(group);
        });
        
        // Create items for authors
        this.authorsData.forEach((author, index) => {
            const category = this.config.getAuthorCategory(author.name);
            const groupId = this.config.getGroupIdForCategory(category);
            
            // Handle BCE dates properly for vis.js
            const startDate = this.createDateFromYear(author.birthYear, false);
            const endDate = this.createDateFromYear(author.deathYear, true);
            
            this.items.add({
                id: index,
                content: author.name,
                start: startDate,
                end: endDate,
                group: groupId,
                className: category,
                title: `${author.name} (${this.formatYear(author.birthYear)} - ${this.formatYear(author.deathYear)})`
            });
        });
        
        console.log('Created timeline data with', this.items.length, 'items and', this.groups.length, 'groups');
    }

    createTimeline() {
        const container = document.getElementById('timeline');
        
        if (!container) {
            console.error('Timeline container not found!');
            return;
        }
        
        // Options with time limits and zoom restrictions
        const options = {
            stack: true, // Enable stacking to handle overlapping authors
            editable: false,
            showCurrentTime: false,
            orientation: 'top',
            groupOrder: 'value',
            zoomable: true,
            moveable: true,
            selectable: true,
            multiselect: false,
            margin: {
                item: 10,
                axis: 20
            },
            // Set time window limits
            min: (() => {
                const minDate = new Date();
                minDate.setFullYear(-800, 0, 1);
                return minDate;
            })(),
            max: new Date(2100, 11, 31),
            // Zoom restrictions - prevent zooming beyond years level
            zoomMin: 1000 * 60 * 60 * 24 * 365, // 1 year minimum zoom (prevents monthly/daily zoom)
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 2800, // Maximum zoom to show full range (600 BCE to 2100 CE)
            // Time axis formatting to show years only
            format: {
                minorLabels: (date, scale, step) => {
                    // Ensure date is a Date object
                    const dateObj = date instanceof Date ? date : new Date(date);
                    const year = dateObj.getFullYear();
                    if (year < 0) {
                        return `${Math.abs(year)} BCE`;
                    } else {
                        return `${year} CE`;
                    }
                },
                majorLabels: (date, scale, step) => {
                    // Ensure date is a Date object
                    const dateObj = date instanceof Date ? date : new Date(date);
                    const year = dateObj.getFullYear();
                    if (year < 0) {
                        return `${Math.abs(year)} BCE`;
                    } else {
                        return `${year} CE`;
                    }
                }
            },
            tooltip: {
                followMouse: true,
                overflowMethod: 'flip'
            },
            // Initial view to show full timeline
            start: (() => {
                const startDate = new Date();
                startDate.setFullYear(-800, 0, 1);
                return startDate;
            })(),
            end: new Date(2100, 11, 31) 
        };

        try {
            // Create timeline with groups like your example
            this.timeline = new vis.Timeline(container, this.items, this.groups, options);
            console.log('Timeline created successfully');
            
            // Fit the timeline to show all items initially
            this.timeline.fit();
        } catch (error) {
            console.error('Error creating timeline:', error);
            this.showErrorMessage('Error creating timeline: ' + error.message);
            return;
        }
        
        // Handle item selection
        this.timeline.on('select', (event) => {
            if (event.items.length > 0) {
                const authorIndex = event.items[0];
                const clickedAuthor = this.authorsData[authorIndex];
                
                // Check if the same author is already selected
                if (this.selectedAuthor && this.selectedAuthor.name === clickedAuthor.name) {
                    // Same author clicked, do nothing (don't open popup)
                    return;
                }
                
                this.selectedAuthor = clickedAuthor;
                this.displayAuthorDetails();
                this.openPopup();
            }
        });
    }

    formatYear(year) {
        if (year === null || year === undefined || isNaN(year)) {
            return 'Unknown';
        }
        if (year < 0) {
            return `${Math.abs(year)} BCE`;
        } else if (year > 0) {
            return `${year} CE`;
        } else {
            return '1 BCE/CE';
        }
    }

    createDateFromYear(year, isEndDate = false) {
        const date = new Date();
        if (year < 0) {
            // For BCE dates, use setFullYear with the negative year
            date.setFullYear(year, isEndDate ? 11 : 0, isEndDate ? 31 : 1);
            date.setHours(isEndDate ? 23 : 0, isEndDate ? 59 : 0, isEndDate ? 59 : 0, isEndDate ? 999 : 0);
        } else {
            date.setFullYear(year, isEndDate ? 11 : 0, isEndDate ? 31 : 1);
            date.setHours(isEndDate ? 23 : 0, isEndDate ? 59 : 0, isEndDate ? 59 : 0, isEndDate ? 999 : 0);
        }
        return date;
    }

    populateCountryFilter() {
        const countryFilter = document.getElementById('countryFilter');
        if (!countryFilter) return;
        
        // Get all unique countries from loaded authors data
        const countries = new Set();
        this.authorsData.forEach(author => {
            const country = author.country || this.config.getAuthorCountry(author.name);
            if (country && country !== 'Unknown') {
                countries.add(country);
            }
        });
        
        // Sort countries alphabetically
        const sortedCountries = Array.from(countries).sort();
        
        // Clear existing options (except "All Countries")
        countryFilter.innerHTML = '<option value="all">All Countries</option>';
        
        // Add country options
        sortedCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });
    }

    bindEvents() {
        // Get filter elements
        const categoryFilter = document.getElementById('categoryFilter');
        const timeFilter = document.getElementById('timeFilter');
        const countryFilter = document.getElementById('countryFilter');
        const searchInput = document.getElementById('searchInput');
        const resetButton = document.getElementById('resetFilters');
        
        // Populate country filter options
        this.populateCountryFilter();
        
        // Real-time filtering function
        const applyFilters = () => {
            this.applyFilters();
        };
        
        // Add event listeners for real-time filtering
        if (categoryFilter) {
            categoryFilter.addEventListener('change', applyFilters);
        }
        
        if (timeFilter) {
            timeFilter.addEventListener('change', applyFilters);
        }
        
        if (countryFilter) {
            countryFilter.addEventListener('change', applyFilters);
        }
        
        // Search input with debounce
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(applyFilters, 300); // 300ms debounce
            });
        }
        
        // Reset button
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetFilters();
            });
        }
        
        // Dictionary button
        const dictionaryBtn = document.getElementById('dictionaryBtn');
        if (dictionaryBtn) {
            dictionaryBtn.addEventListener('click', () => {
                this.toggleDictionary();
            });
        }

        // Notes button
        const notesBtn = document.getElementById('notesBtn');
        if (notesBtn) {
            notesBtn.addEventListener('click', () => {
                this.toggleNotes();
            });
        }

        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.toggleProfile();
            });
        }

        // Dictionary events
        this.bindDictionaryEvents();
        
        // Notes events
        this.bindNotesEvents();
        
        // Profile events
        this.bindProfileEvents();
        
        // Initialize database-connected panels
        this.initializeDatabasePanels();
        
        // Check authentication status and manage UI elements
        this.checkAuthAndUpdateUI();
    }

    async checkAuthAndUpdateUI() {
        try {
            const response = await fetch('/api/auth/status/');
            const profileBtn = document.getElementById('profileBtn');
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && profileBtn) {
                    // User is logged in, show profile button
                    profileBtn.style.display = 'block';
                } else if (profileBtn) {
                    // User is not logged in, hide profile button
                    profileBtn.style.display = 'none';
                }
            } else if (profileBtn) {
                // Error or not authenticated, hide profile button
                profileBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) {
                profileBtn.style.display = 'none';
            }
        }
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const timeFilter = document.getElementById('timeFilter');
        const countryFilter = document.getElementById('countryFilter');
        const searchInput = document.getElementById('searchInput');
        
        const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
        const selectedTime = timeFilter ? timeFilter.value : 'all';
        const selectedCountry = countryFilter ? countryFilter.value : 'all';
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        console.log('Applying filters:', { 
            category: selectedCategory, 
            time: selectedTime, 
            country: selectedCountry,
            search: searchTerm 
        });
        
        // Clear existing items
        this.items.clear();
        
        let filteredCount = 0;
        
        // Filter and add items based on selected criteria
        this.authorsData.forEach((author, index) => {
            const category = this.config.getAuthorCategory(author.name);
            const country = author.country || this.config.getAuthorCountry(author.name);
            
            // Check category filter
            if (selectedCategory !== 'all' && category !== selectedCategory) {
                return;
            }
            
            // Check country filter
            if (selectedCountry !== 'all' && country !== selectedCountry) {
                return;
            }
            
            // Check time period filter
            if (selectedTime !== 'all') {
                const birthYear = author.birthYear;
                const deathYear = author.deathYear;
                
                let inPeriod = false;
                switch (selectedTime) {
                    case 'ancient':
                        // Ancient period: 600 BCE to 500 CE
                        inPeriod = (birthYear >= -800 && birthYear <= 500) || 
                                 (deathYear >= -800 && deathYear <= 500) ||
                                 (birthYear <= -800 && deathYear >= 500);
                        break;
                    case 'medieval':
                        // Medieval: 500 to 1500 CE
                        inPeriod = (birthYear >= 500 && birthYear <= 1500) || 
                                 (deathYear >= 500 && deathYear <= 1500) ||
                                 (birthYear <= 500 && deathYear >= 1500);
                        break;
                    case 'renaissance':
                        // Renaissance: 1500 to 1700 CE
                        inPeriod = (birthYear >= 1500 && birthYear <= 1700) || 
                                 (deathYear >= 1500 && deathYear <= 1700) ||
                                 (birthYear <= 1500 && deathYear >= 1700);
                        break;
                    case 'modern':
                        // Modern: 1700 to 2100 CE
                        inPeriod = (birthYear >= 1700 && birthYear <= 2100) || 
                                 (deathYear >= 1700 && deathYear <= 2100) ||
                                 (birthYear <= 1700 && deathYear >= 2100);
                        break;
                }
                
                if (!inPeriod) {
                    return;
                }
            }
            
            // Check search filter
            if (searchTerm) {
                const authorName = author.name.toLowerCase();
                const authorBio = (author.bio || '').toLowerCase();
                const books = author.books || author.works || [];
                const bookTitles = books.map(book => book.title.toLowerCase()).join(' ');
                
                const matchesSearch = authorName.includes(searchTerm) || 
                                    authorBio.includes(searchTerm) || 
                                    bookTitles.includes(searchTerm);
                
                if (!matchesSearch) {
                    return;
                }
            }
            
            // Add filtered item using configuration
            const groupId = this.config.getGroupIdForCategory(category);
            
            // Handle BCE dates properly for vis.js (same as in createTimelineData)
            const startDate = this.createDateFromYear(author.birthYear, false);
            const endDate = this.createDateFromYear(author.deathYear, true);
            
            this.items.add({
                id: index,
                content: author.name,
                start: startDate,
                end: endDate,
                group: groupId,
                className: category,
                title: `${author.name} (${this.formatYear(author.birthYear)} - ${this.formatYear(author.deathYear)})`
            });
            
            filteredCount++;
        });
        
        console.log(`Filter applied. Showing ${filteredCount} items out of ${this.authorsData.length}`);
        
        // Update the initial message to show filter results
        this.updateFilterMessage(filteredCount, searchTerm);
        
        // Force timeline to update and fit to show filtered items
        if (this.timeline) {
            console.log('Timeline exists, items count:', this.items.length);
            // Force timeline to redraw with new items
            this.timeline.setItems(this.items);
            
            if (this.items.length > 0) {
                console.log('Fitting timeline to show items');
                this.timeline.fit();
            } else {
                console.log('No items to show after filtering - timeline will be empty');
                // Set timeline to show the full range even if empty
                const startDate = this.createDateFromYear(-600, false);
                this.timeline.setWindow(startDate, new Date(2100, 11, 31));
            }
        } else {
            console.log('Timeline does not exist!');
        }
    }

    resetFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const timeFilter = document.getElementById('timeFilter');
        const countryFilter = document.getElementById('countryFilter');
        const searchInput = document.getElementById('searchInput');
        
        if (categoryFilter) categoryFilter.value = 'all';
        if (timeFilter) timeFilter.value = 'all';
        if (countryFilter) countryFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        
        // Recreate all timeline data
        this.createTimelineData();
        
        console.log('Filters reset. Showing all', this.items.length, 'items');
        
        // Reset to initial message
        this.showInitialMessage();
        
        // Force timeline to update and fit to show all items
        if (this.timeline && this.items.length > 0) {
            this.timeline.fit();
        }
    }

    bindPopupEvents() {
        const popupOverlay = document.getElementById('popupOverlay');
        const popupClose = document.getElementById('popupClose');
        
        // Close popup when clicking close button
        popupClose.addEventListener('click', () => {
            this.closePopup();
        });
        
        // Close popup when clicking overlay
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                this.closePopup();
            }
        });
        
        // Close popup with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popupOverlay.classList.contains('active')) {
                this.closePopup();
            }
        });
    }

    openPopup() {
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closePopup() {
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clear timeline selection
        if (this.timeline) {
            this.timeline.setSelection([]);
        }
        this.selectedAuthor = null;
    }

    // Dictionary functionality
    bindDictionaryEvents() {
        const dictionaryClose = document.getElementById('closeDictionary');
        const dictionarySearch = document.getElementById('dictionarySearch');
        const dictionarySearchBtn = document.getElementById('dictionarySearchBtn');
        const filterTabs = document.querySelectorAll('.filter-tab');
        const categoryItems = document.querySelectorAll('.category-item');
        const resultsSortBy = document.getElementById('resultsSortBy');
        
        // Store current filter state
        this.currentDictionaryFilter = 'all';
        this.currentSearchResults = [];
        this.currentSort = 'relevance';
        
        // Close dictionary events
        if (dictionaryClose) {
            dictionaryClose.addEventListener('click', () => {
                this.closeDictionary();
            });
        }
        
        // Search functionality
        if (dictionarySearch) {
            dictionarySearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performDictionarySearch();
                }
            });
            
            // Auto-search with debounce
            let searchTimeout;
            dictionarySearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (e.target.value.trim()) {
                        this.performDictionarySearch();
                    } else {
                        this.showDictionaryWelcome();
                    }
                }, 300);
            });
        }
        
        if (dictionarySearchBtn) {
            dictionarySearchBtn.addEventListener('click', () => {
                this.performDictionarySearch();
            });
        }
        
        // Filter tab events
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                filterTabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Update current filter
                this.currentDictionaryFilter = tab.getAttribute('data-filter');
                
                // Re-run search with new filter
                const searchInput = document.getElementById('dictionarySearch');
                if (searchInput && searchInput.value.trim()) {
                    this.performDictionarySearch();
                }
            });
        });
        
        // Category item click events
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const category = item.getAttribute('data-category');
                
                // Update filter tab
                filterTabs.forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.getAttribute('data-filter') === category) {
                        tab.classList.add('active');
                    }
                });
                
                this.currentDictionaryFilter = category;
                
                // Focus search input
                const searchInput = document.getElementById('dictionarySearch');
                if (searchInput) {
                    searchInput.focus();
                }
            });
        });
        
        // Sort functionality
        if (resultsSortBy) {
            resultsSortBy.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.displayDictionaryResults(this.currentSearchResults, this.lastSearchTerm);
            });
        }
    }

    toggleDictionary() {
        const dictionaryPanel = document.getElementById('dictionaryPanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (dictionaryPanel && timelineContainer) {
            if (dictionaryPanel.classList.contains('active')) {
                // Close dictionary
                dictionaryPanel.classList.remove('active');
                timelineContainer.classList.remove('dictionary-open');
            } else {
                // Close other panels first
                this.closeNotes();
                this.closeReadingList();
                this.closeProfile();
                
                // Open dictionary
                dictionaryPanel.classList.add('active');
                timelineContainer.classList.add('dictionary-open');
                
                // Focus search input
                const searchInput = document.getElementById('dictionarySearch');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }
        }
    }

    openDictionary() {
        const dictionaryPanel = document.getElementById('dictionaryPanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (dictionaryPanel && timelineContainer) {
            // Close other panels first
            this.closeNotes();
            this.closeReadingList();
            
            dictionaryPanel.classList.add('active');
            timelineContainer.classList.add('dictionary-open');
            
            // Focus search input
            const searchInput = document.getElementById('dictionarySearch');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }

    closeDictionary() {
        const dictionaryPanel = document.getElementById('dictionaryPanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (dictionaryPanel && timelineContainer) {
            dictionaryPanel.classList.remove('active');
            timelineContainer.classList.remove('dictionary-open');
        }
    }

    // Initialize database-connected panels
    initializeDatabasePanels() {
        // Initialize Notes Panel with database connection
        if (window.NotesPanel) {
            this.databaseNotesPanel = new window.NotesPanel('notesList');
        }
        
        // Initialize Reading List Panel with database connection
        if (window.ReadingListPanel) {
            this.databaseReadingListPanel = new window.ReadingListPanel('readingListContent');
        }
        
        // Initialize Profile Panel with database connection
        if (window.ProfilePanel) {
            this.databaseProfilePanel = new window.ProfilePanel('profileContent');
        }
    }

    // Notes functionality
    bindNotesEvents() {
        const notesClose = document.getElementById('closeNotes');
        const addNoteBtn = document.getElementById('addNoteBtn');
        const notesSearch = document.getElementById('notesSearch');
        const filterChips = document.querySelectorAll('.filter-chip');
        
        // Close notes panel
        if (notesClose) {
            notesClose.addEventListener('click', () => {
                this.closeNotes();
            });
        }
        
        // Add note button - use database panel if available
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => {
                if (this.databaseNotesPanel) {
                    this.databaseNotesPanel.showAddNoteForm();
                } else {
                    this.showAddNoteForm();
                }
            });
        }
        
        // Search notes functionality (can be enhanced later)
        if (notesSearch) {
            let searchTimeout;
            notesSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    // TODO: Implement search functionality with database
                    console.log('Search notes:', e.target.value);
                }, 300);
            });
        }
        
        // Filter chips functionality (can be enhanced later)
        if (filterChips.length > 0) {
            filterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    // Remove active class from all chips
                    filterChips.forEach(c => c.classList.remove('active'));
                    
                    // Add active class to clicked chip
                    chip.classList.add('active');
                    
                    // TODO: Implement filtering with database
                    const filter = chip.dataset.filter;
                    console.log('Filter notes by:', filter);
                });
            });
        }
    }

    // Profile functionality
    bindProfileEvents() {
        const profileClose = document.getElementById('closeProfile');
        
        // Close profile panel
        if (profileClose) {
            profileClose.addEventListener('click', () => {
                this.closeProfile();
            });
        }
    }

    toggleNotes() {
        const notesPanel = document.getElementById('notesPanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (notesPanel && timelineContainer) {
            if (notesPanel.classList.contains('active')) {
                // Close notes
                notesPanel.classList.remove('active');
                timelineContainer.classList.remove('notes-open');
            } else {
                // Close other panels first
                this.closeDictionary();
                this.closeReadingList();
                this.closeProfile();
                
                // Open notes
                notesPanel.classList.add('active');
                timelineContainer.classList.add('notes-open');
                
                // Use database panel if available, otherwise fallback to local implementation
                if (this.databaseNotesPanel) {
                    this.databaseNotesPanel.loadNotes();
                } else {
                    this.renderNotes();
                }
            }
        }
    }

    openNotes() {
        const notesPanel = document.getElementById('notesPanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (notesPanel && timelineContainer) {
            // Close other panels first
            this.closeDictionary();
            this.closeReadingList();
            
            notesPanel.classList.add('active');
            timelineContainer.classList.add('notes-open');
            
            // Load notes from database instead of localStorage
            if (this.databaseNotesPanel) {
                this.databaseNotesPanel.loadNotes();
            } else {
                // Fallback to original localStorage method
                this.renderNotes();
            }
        }
    }

    closeNotes() {
        const notesPanel = document.getElementById('notesPanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (notesPanel && timelineContainer) {
            notesPanel.classList.remove('active');
            timelineContainer.classList.remove('notes-open');
        }
    }

    toggleProfile() {
        const profilePanel = document.getElementById('profilePanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (profilePanel && timelineContainer) {
            if (profilePanel.classList.contains('active')) {
                // Close profile
                profilePanel.classList.remove('active');
                timelineContainer.classList.remove('profile-open');
            } else {
                // Close other panels first
                this.closeDictionary();
                this.closeReadingList();
                this.closeNotes();
                
                // Open profile
                profilePanel.classList.add('active');
                timelineContainer.classList.add('profile-open');
                
                // Use database panel if available
                if (this.databaseProfilePanel) {
                    this.databaseProfilePanel.loadProfile();
                }
            }
        }
    }

    closeProfile() {
        const profilePanel = document.getElementById('profilePanel');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (profilePanel && timelineContainer) {
            profilePanel.classList.remove('active');
            timelineContainer.classList.remove('profile-open');
        }
    }

    loadNotes() {
        const saved = localStorage.getItem('literatureNotes');
        return saved ? JSON.parse(saved) : [];
    }

    saveNotes() {
        localStorage.setItem('literatureNotes', JSON.stringify(this.notes));
    }

    showAddNoteForm() {
        const notesList = document.getElementById('notesList');
        
        // Get all books from reading lists for the book relation dropdown
        const allBooks = [
            ...this.readingLists.wantToRead,
            ...this.readingLists.currentlyReading,
            ...this.readingLists.read
        ];
        
        const bookOptions = allBooks.map(book => 
            `<option value="${book.id}">${book.title} by ${book.author}</option>`
        ).join('');
        
        const formHtml = `
            <div class="note-form">
                <div class="form-group">
                    <label for="noteTitle">Title:</label>
                    <input type="text" id="noteTitle" placeholder="Enter note title...">
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
                <div class="form-group">
                    <label for="noteBookRelation">Related Book (optional):</label>
                    <select id="noteBookRelation">
                        <option value="">-- No book relation --</option>
                        ${bookOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="noteTags">Tags (comma separated):</label>
                    <input type="text" id="noteTags" placeholder="author, book, theme...">
                </div>
                <div class="form-actions">
                    <button id="saveNoteBtn" class="save-note-btn">Save Note</button>
                    <button id="cancelNoteBtn" class="cancel-note-btn">Cancel</button>
                </div>
            </div>
        `;
        
        notesList.innerHTML = formHtml;
        
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
                this.renderNotes();
            });
        }
    }

    saveNote(editId = null) {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const tags = document.getElementById('noteTags').value.trim();
        const bookRelation = document.getElementById('noteBookRelation').value;
        const isMarkdown = document.getElementById('enableMarkdown') ? 
            document.getElementById('enableMarkdown').checked : true;
        
        if (!title || !content) {
            alert('Please enter both title and content for the note.');
            return;
        }
        
        // Find the related book if one was selected
        let relatedBook = null;
        if (bookRelation) {
            const allBooks = [
                ...this.readingLists.wantToRead,
                ...this.readingLists.currentlyReading,
                ...this.readingLists.read
            ];
            relatedBook = allBooks.find(book => book.id === bookRelation);
        }
        
        const note = {
            id: editId || Date.now(),
            title: title,
            content: content,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            date: editId ? this.notes.find(n => n.id === editId).date : new Date().toISOString(),
            relatedBook: relatedBook,
            isMarkdown: isMarkdown
        };
        
        if (editId) {
            // Update existing note
            const index = this.notes.findIndex(n => n.id === editId);
            if (index !== -1) {
                this.notes[index] = note;
            }
        } else {
            // Add new note
            this.notes.unshift(note);
        }
        
        this.saveNotes();
        this.renderNotes();
    }

    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        
        const notesList = document.getElementById('notesList');
        
        // Get all books from reading lists for the book relation dropdown
        const allBooks = [
            ...this.readingLists.wantToRead,
            ...this.readingLists.currentlyReading,
            ...this.readingLists.read
        ];
        
        const bookOptions = allBooks.map(book => 
            `<option value="${book.id}" ${note.relatedBook && note.relatedBook.id === book.id ? 'selected' : ''}>${book.title} by ${book.author}</option>`
        ).join('');
        
        const formHtml = `
            <div class="note-form">
                <div class="form-group">
                    <label for="noteTitle">Title:</label>
                    <input type="text" id="noteTitle" value="${note.title}">
                </div>
                <div class="form-group">
                    <label for="noteContent">Content: <span class="markdown-indicator">Markdown ${note.isMarkdown ? 'enabled' : 'disabled'}</span></label>
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
                    <textarea id="noteContent" rows="6">${note.content}</textarea>
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
                    <div class="form-check">
                        <input type="checkbox" id="enableMarkdown" ${note.isMarkdown ? 'checked' : ''}>
                        <label for="enableMarkdown">Use Markdown formatting</label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="noteBookRelation">Related Book (optional):</label>
                    <select id="noteBookRelation">
                        <option value="">-- No book relation --</option>
                        ${bookOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="noteTags">Tags (comma separated):</label>
                    <input type="text" id="noteTags" value="${note.tags.join(', ')}">
                </div>
                <div class="form-actions">
                    <button id="saveNoteBtn" class="save-note-btn">Update Note</button>
                    <button id="cancelNoteBtn" class="cancel-note-btn">Cancel</button>
                </div>
            </div>
        `;
        
        notesList.innerHTML = formHtml;
        
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
                this.saveNote(noteId);
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.renderNotes();
            });
        }
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(n => n.id !== noteId);
            this.saveNotes();
            this.renderNotes();
        }
    }
    
    setupMarkdownTools() {
        const textarea = document.getElementById('noteContent');
        const previewDiv = document.getElementById('markdownPreview');
        const previewToggle = document.querySelector('.md-preview-toggle');
        const mdTools = document.querySelectorAll('.md-tool');
        
        if (!textarea || !previewDiv || !previewToggle) return;
        
        // Set up preview toggle
        previewToggle.addEventListener('click', () => {
            const isPreviewActive = previewDiv.style.display === 'block';
            
            if (isPreviewActive) {
                previewDiv.style.display = 'none';
                textarea.style.display = 'block';
                previewToggle.textContent = 'Preview';
            } else {
                // Update preview with markdown content
                try {
                    previewDiv.innerHTML = marked.parse(textarea.value);
                } catch (e) {
                    previewDiv.innerHTML = '<p class="error">Error parsing Markdown: ' + e.message + '</p>';
                }
                
                previewDiv.style.display = 'block';
                textarea.style.display = 'none';
                previewToggle.textContent = 'Edit';
            }
        });
        
        // Handle markdown toolbar buttons
        mdTools.forEach(button => {
            button.addEventListener('click', () => {
                const mdTemplate = button.dataset.md;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const selectedText = textarea.value.substring(start, end);
                
                let replacement = mdTemplate;
                
                // If text is selected, replace placeholders in the markdown template with selected text
                if (selectedText) {
                    if (mdTemplate.includes('Bold')) {
                        replacement = `**${selectedText}**`;
                    } else if (mdTemplate.includes('Italic')) {
                        replacement = `*${selectedText}*`;
                    } else if (mdTemplate.includes('Heading')) {
                        replacement = `## ${selectedText}`;
                    } else if (mdTemplate.includes('Link')) {
                        replacement = `[${selectedText}](https://example.com)`;
                    } else if (mdTemplate.includes('List')) {
                        replacement = `- ${selectedText}`;
                    } else if (mdTemplate.includes('Blockquote')) {
                        replacement = `> ${selectedText}`;
                    } else if (mdTemplate.includes('code')) {
                        replacement = `\`${selectedText}\``;
                    }
                }
                
                // Insert at cursor position
                textarea.focus();
                document.execCommand('insertText', false, replacement);
                
                // Fallback for browsers that don't support execCommand
                if (textarea.value.substring(start, start + replacement.length) !== replacement) {
                    const beforeText = textarea.value.substring(0, start);
                    const afterText = textarea.value.substring(end);
                    textarea.value = beforeText + replacement + afterText;
                }
            });
        });
        
        // Update markdown preview on input
        textarea.addEventListener('input', () => {
            if (previewDiv.style.display === 'block') {
                try {
                    previewDiv.innerHTML = marked.parse(textarea.value);
                } catch (e) {
                    previewDiv.innerHTML = '<p class="error">Error parsing Markdown: ' + e.message + '</p>';
                }
            }
        });
        
        // Handle enable markdown checkbox
        const enableMarkdownCheckbox = document.getElementById('enableMarkdown');
        if (enableMarkdownCheckbox) {
            enableMarkdownCheckbox.addEventListener('change', () => {
                const markdownToolbar = document.querySelector('.markdown-toolbar');
                const markdownHelp = document.querySelector('.markdown-help');
                const markdownIndicator = document.querySelector('.markdown-indicator');
                
                if (enableMarkdownCheckbox.checked) {
                    markdownToolbar.style.display = 'flex';
                    markdownHelp.style.display = 'block';
                    markdownIndicator.textContent = 'Markdown enabled';
                } else {
                    markdownToolbar.style.display = 'none';
                    markdownHelp.style.display = 'none';
                    markdownIndicator.textContent = 'Markdown disabled';
                    previewDiv.style.display = 'none';
                    textarea.style.display = 'block';
                }
            });
            
            // Trigger the change event to set initial state
            enableMarkdownCheckbox.dispatchEvent(new Event('change'));
        }
    }
    
    viewFullNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        
        // Create a simple modal to display the full note content
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay active';
        
        const content = document.createElement('div');
        content.className = 'popup-content';
        content.style.maxWidth = '600px';
        
        content.innerHTML = `
            <div class="popup-header">
                <h3>${note.title}</h3>
                <span class="popup-close">&times;</span>
            </div>
            <div class="full-note-content">
                ${note.relatedBook ? `
                    <div class="note-book-relation">
                        <span class="note-book-badge">📚 Related to:</span>
                        <span class="note-book-title">${note.relatedBook.title}</span>
                        <span class="note-book-author">by ${note.relatedBook.author}</span>
                    </div>
                ` : ''}
                <div class="full-note-text ${note.isMarkdown ? 'markdown' : ''}">
                    ${note.isMarkdown ? marked.parse(note.content) : note.content}
                </div>
                ${note.tags.length > 0 ? `
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Add close functionality
        const closeBtn = overlay.querySelector('.popup-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    searchNotes(query) {
        if (!query.trim()) {
            this.filterNotes(this.currentFilter);
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filteredNotes = this.notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        
        this.renderNotes(filteredNotes);
    }
    
    filterNotes(filter) {
        if (filter === 'all') {
            this.renderNotes();
            return;
        }
        
        let filteredNotes;
        
        switch (filter) {
            case 'recent':
                // Get notes from the last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                filteredNotes = this.notes.filter(note => new Date(note.date) >= sevenDaysAgo);
                break;
                
            case 'books':
                // Get notes that have a book relation
                filteredNotes = this.notes.filter(note => note.relatedBook !== null && note.relatedBook !== undefined);
                break;
                
            case 'authors':
                // Get notes that have author tags
                filteredNotes = this.notes.filter(note => 
                    note.tags.some(tag => tag.toLowerCase().includes('author')) ||
                    (note.relatedBook && note.relatedBook.author)
                );
                break;
                
            default:
                filteredNotes = this.notes;
        }
        
        this.renderNotes(filteredNotes);
    }

    renderNotes(notesToRender = null) {
        const notesList = document.getElementById('notesList');
        const notes = notesToRender || this.notes;
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-notes">
                    <p>No notes yet. Click "Add Note" to create your first note.</p>
                </div>
            `;
            return;
        }
        
        const notesHtml = notes.map(note => {
            // Limit content to 200 characters with ellipsis if longer
            let truncatedContent = note.content;
            let displayContent;
            
            // For markdown content, strip markdown syntax for length calculation
            const plainTextContent = note.content
                .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
                .replace(/\*(.*?)\*/g, '$1')     // Italic
                .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
                .replace(/#{1,6}\s+/g, '')       // Headings
                .replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // Code
                
            if (plainTextContent.length > 200) {
                truncatedContent = note.content.substring(0, 200) + '...';
            }
            
            // Parse markdown content if enabled
            if (note.isMarkdown) {
                try {
                    displayContent = marked.parse(truncatedContent);
                } catch (e) {
                    displayContent = truncatedContent;
                    console.error('Error parsing markdown:', e);
                }
            } else {
                displayContent = truncatedContent;
            }
                
            return `
            <div class="note-item">
                <div class="note-header">
                    <div>
                        <div class="note-title">${note.title} ${note.isMarkdown ? '<span class="markdown-badge">MD</span>' : ''}</div>
                        <div class="note-date">${new Date(note.date).toLocaleDateString()}</div>
                    </div>
                    <div class="note-actions-compact">
                        <button class="note-action-btn edit" onclick="readingTracker.editNote(${note.id})" title="Edit Note">✏️</button>
                        <button class="note-action-btn delete" onclick="readingTracker.deleteNote(${note.id})" title="Delete Note">🗑️</button>
                    </div>
                </div>
                
                ${note.relatedBook ? `
                    <div class="note-book-relation">
                        <span class="note-book-badge">📚 ${note.relatedBook.title}</span>
                        <span class="note-book-author">by ${note.relatedBook.author}</span>
                    </div>
                ` : ''}
                
                <div class="note-content ${note.isMarkdown ? 'markdown-rendered' : ''}" onclick="readingTracker.viewFullNote(${note.id})">
                    ${note.isMarkdown ? displayContent : displayContent}
                    ${note.content.length > 200 ? '<div class="note-read-more">Click to read more...</div>' : ''}
                </div>
                
                ${note.tags.length > 0 ? `
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `}).join('');
        
        notesList.innerHTML = notesHtml;
    }

    performDictionarySearch() {
        const searchInput = document.getElementById('dictionarySearch');
        const resultsContainer = document.getElementById('dictionaryResults');
        const resultsHeader = document.getElementById('resultsHeader');
        
        if (!searchInput || !resultsContainer) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        this.lastSearchTerm = searchTerm;
        
        if (!searchTerm) {
            this.showDictionaryWelcome();
            resultsHeader.style.display = 'none';
            return;
        }
        
        const results = [];
        
        // Define city/place data for better search results
       
        
        // Search through dictionary data first (Greek words)
        if (this.dictionaryData && this.dictionaryData.length > 0 && 
            (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'words')) {
            this.dictionaryData.forEach(entry => {
                const matchesWord = entry.word.toLowerCase().includes(searchTerm);
                const matchesOrth = entry.orthographic.toLowerCase().includes(searchTerm);
                const matchesBrief = entry.briefDefinition.toLowerCase().includes(searchTerm);
                const matchesFull = entry.fullDefinition.toLowerCase().includes(searchTerm);
                
                if (matchesWord || matchesOrth || matchesBrief || matchesFull) {
                    results.push({
                        type: 'words',
                        title: entry.word,
                        context: `Greek Dictionary Entry ${entry.number}`,
                        orthographic: entry.orthographic,
                        briefDefinition: entry.briefDefinition,
                        fullDefinition: entry.fullDefinition,
                        searchMatch: matchesWord ? 'word' : (matchesOrth ? 'orthographic' : (matchesBrief ? 'brief' : 'full')),
                        relevance: matchesWord ? 100 : (matchesOrth ? 90 : (matchesBrief ? 80 : 70))
                    });
                }
            });
        }
        
        // Search through Greek Gods data
        if (this.greekGodsData && this.greekGodsData.length > 0 && 
            (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'gods')) {
            this.greekGodsData.forEach(god => {
                const matchesEnglish = god.englishName.toLowerCase().includes(searchTerm);
                const matchesGreek = god.greekName.toLowerCase().includes(searchTerm);
                const matchesDesc = god.description.toLowerCase().includes(searchTerm);
                
                if (matchesEnglish || matchesGreek || matchesDesc) {
                    results.push({
                        type: 'gods',
                        title: god.englishName,
                        context: `${god.mainType} (${god.subType})`,
                        greekName: god.greekName,
                        description: god.description,
                        relevance: matchesEnglish ? 90 : (matchesGreek ? 85 : 70)
                    });
                }
            });
        }
        
        // Search through Ancient Sites data
        if (this.ancientSitesData && this.ancientSitesData.length > 0 && 
            (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'sites')) {
            this.ancientSitesData.forEach(site => {
                const matchesName = site.name.toLowerCase().includes(searchTerm);
                const matchesDesc = site.description.toLowerCase().includes(searchTerm);
                
                if (matchesName || matchesDesc) {
                    results.push({
                        type: 'sites',
                        title: site.name,
                        context: `Ancient ${site.type} site`,
                        description: site.description,
                        link: site.link,
                        relevance: matchesName ? 85 : 70
                    });
                }
            });
        }
        
        // Search through cities
        if (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'cities') {
            // Search through predefined ancient cities
            ancientCities.forEach(city => {
                if (city.name.toLowerCase().includes(searchTerm) || 
                    city.description.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'cities',
                        title: city.name,
                        context: 'Ancient City/Place',
                        description: city.description,
                        relevance: city.name.toLowerCase().includes(searchTerm) ? 95 : 75
                    });
                }
            });
            
            // Search through ancient sites data (these are also cities/places)
            if (this.ancientSitesData && this.ancientSitesData.length > 0) {
                this.ancientSitesData.forEach(site => {
                    const matchesName = site.name.toLowerCase().includes(searchTerm);
                    const matchesDescription = site.description.toLowerCase().includes(searchTerm);
                    
                    if (matchesName || matchesDescription) {
                        results.push({
                            type: 'cities',
                            title: site.name,
                            context: `Ancient ${site.type} city/site`,
                            description: site.description,
                            link: site.link,
                            relevance: matchesName ? 90 : 75
                        });
                    }
                });
            }
        }
        
        // Search through concepts
        if (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'concepts') {
            literaryConcepts.forEach(concept => {
                if (concept.name.toLowerCase().includes(searchTerm) || 
                    concept.description.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'concepts',
                        title: concept.name,
                        context: 'Literary Concept',
                        description: concept.description,
                        relevance: concept.name.toLowerCase().includes(searchTerm) ? 95 : 75
                    });
                }
            });
        }
        
        // Search through all authors and their books
        this.authorsData.forEach(author => {
            // Search in author name
            if ((this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'authors') &&
                author.name.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: 'authors',
                    title: author.name,
                    context: `Author (${this.formatYear(author.birthYear)} - ${this.formatYear(author.deathYear)})`,
                    description: author.bio || 'No biography available.',
                    author: author,
                    relevance: 90
                });
            }
            
            // Search in books
            if (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'books') {
                author.books.forEach(book => {
                    // Search in book title
                    if (book.title.toLowerCase().includes(searchTerm)) {
                        results.push({
                            type: 'books',
                            title: book.title,
                            context: `Book by ${author.name}`,
                            description: book.description || 'No description available.',
                            author: author,
                            book: book,
                            relevance: 85
                        });
                    }
                    
                    // Search in book description
                    if (book.description && book.description.toLowerCase().includes(searchTerm)) {
                        results.push({
                            type: 'books',
                            title: book.title,
                            context: `Book by ${author.name}`,
                            description: book.description,
                            author: author,
                            book: book,
                            relevance: 70
                        });
                    }
                });
            }
            
            // Search in characters
            if (this.currentDictionaryFilter === 'all' || this.currentDictionaryFilter === 'characters') {
                author.books.forEach(book => {
                    if (book.characters && book.characters.length > 0) {
                        book.characters.forEach(character => {
                            if (character.toLowerCase().includes(searchTerm)) {
                                results.push({
                                    type: 'characters',
                                    title: character,
                                    context: `Character in "${book.title}" by ${author.name}`,
                                    description: book.description || 'No description available.',
                                    author: author,
                                    book: book,
                                    relevance: 80
                                });
                            }
                        });
                    }
                });
            }
        });
        
        // Store results for sorting
        this.currentSearchResults = results;
        this.displayDictionaryResults(results, searchTerm);
    }

    displayDictionaryResults(results, searchTerm) {
        const resultsContainer = document.getElementById('dictionaryResults');
        
        if (!resultsContainer) return;
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="dictionary-no-results">
                    <p>No results found for "${searchTerm}"</p>
                    <p>Try searching for different terms.</p>
                </div>
            `;
            return;
        }
        
        // Remove duplicates and sort by relevance
        const uniqueResults = results.filter((result, index, self) => 
            index === self.findIndex(r => r.title === result.title && r.context === result.context)
        );
        
        uniqueResults.sort((a, b) => (b.relevance || 50) - (a.relevance || 50));
        
        // Generate simple results HTML
        const resultsHtml = uniqueResults.map(result => {
            const typeIcons = {
                'words': '📝',
                'gods': '⚡',
                'authors': '✍️',
                'books': '📚',
                'characters': '🎭',
                'cities': '🏛️',
                'concepts': '💡'
            };
            
            return `
                <div class="dictionary-result-item" ${result.author ? `data-author="${result.author.name}"` : ''}>
                    <div class="dictionary-result-title">
                        ${typeIcons[result.type] || '📄'} ${result.title}
                    </div>
                    <div class="dictionary-result-context">${result.context}</div>
                    <div class="dictionary-result-description">${result.description}</div>
                </div>
            `;
        }).join('');
        
        resultsContainer.innerHTML = `
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>Found ${uniqueResults.length} result${uniqueResults.length !== 1 ? 's' : ''} for "${searchTerm}"</strong>
            </div>
            ${resultsHtml}
        `;
        
        // Add click events to results (only for items with authors)
        const resultItems = resultsContainer.querySelectorAll('.dictionary-result-item[data-author]');
        resultItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                const authorName = item.dataset.author;
                const author = this.authorsData.find(a => a.name === authorName);
                if (author) {
                    this.closeDictionary();
                    this.selectedAuthor = author;
                    this.openPopup();
                    this.displayAuthorDetails();
                }
            });
        });
    }

    showDictionaryWelcome() {
        const resultsContainer = document.getElementById('dictionaryResults');
        const resultsHeader = document.getElementById('resultsHeader');
        
        if (resultsContainer) {
            resultsHeader.style.display = 'none';
            resultsContainer.innerHTML = `
                <div class="dictionary-welcome">
                    <div class="welcome-header">
                        <h4>Search the Literary Dictionary</h4>
                        <p>Find Greek words, ancient cities, characters, authors, books, and concepts</p>
                    </div>
                    <div class="welcome-categories">
                        <div class="category-grid">
                            <div class="category-item" data-category="words">
                                <div class="category-icon">📝</div>
                                <div class="category-title">Greek Words</div>
                                <div class="category-desc">Ancient Greek terms</div>
                            </div>
                            <div class="category-item" data-category="books">
                                <div class="category-icon">📚</div>
                                <div class="category-title">Books</div>
                                <div class="category-desc">Literary works</div>
                            </div>
                            <div class="category-item" data-category="cities">
                                <div class="category-icon">🏛️</div>
                                <div class="category-title">Cities</div>
                                <div class="category-desc">Ancient places</div>
                            </div>
                            <div class="category-item" data-category="characters">
                                <div class="category-icon">🎭</div>
                                <div class="category-title">Characters</div>
                                <div class="category-desc">Heroes and figures</div>
                            </div>
                            <div class="category-item" data-category="authors">
                                <div class="category-icon">✍️</div>
                                <div class="category-title">Authors</div>
                                <div class="category-desc">Writers and poets</div>
                            </div>
                            <div class="category-item" data-category="concepts">
                                <div class="category-icon">💡</div>
                                <div class="category-title">Concepts</div>
                                <div class="category-desc">Themes and ideas</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Re-bind category item events after creating the welcome screen
            const categoryItems = resultsContainer.querySelectorAll('.category-item');
            const filterTabs = document.querySelectorAll('.filter-tab');
            
            categoryItems.forEach(item => {
                item.addEventListener('click', () => {
                    const category = item.getAttribute('data-category');
                    
                    // Update filter tab
                    filterTabs.forEach(tab => {
                        tab.classList.remove('active');
                        if (tab.getAttribute('data-filter') === category) {
                            tab.classList.add('active');
                        }
                    });
                    
                    this.currentDictionaryFilter = category;
                    
                    // Focus search input
                    const searchInput = document.getElementById('dictionarySearch');
                    if (searchInput) {
                        searchInput.focus();
                    }
                });
            });
        }
    }

    displayAuthorDetails() {
        const authorInfoContainer = document.getElementById('authorInfo');
        const popupHeader = document.querySelector('.popup-header');
        
        if (!authorInfoContainer) {
            console.error('Could not find authorInfo element in DOM');
            return;
        }
        
        if (!this.selectedAuthor) {
            this.showInitialMessage();
            return;
        }
        
        const lifespan = this.selectedAuthor.deathYear - this.selectedAuthor.birthYear;
        const authorCountry = this.config.getAuthorCountry(this.selectedAuthor.name);
        
        // Update popup header with author name and lifetime
        popupHeader.innerHTML = `
            <div class="popup-header-info">
                <div class="popup-author-name">${this.selectedAuthor.name}</div>
                <div class="popup-author-years">
                    ${this.formatYear(this.selectedAuthor.birthYear)} - ${this.formatYear(this.selectedAuthor.deathYear)} 
                    (lived ${lifespan} years)
                </div>
                <div class="popup-author-country">
                    📍 ${authorCountry}
                </div>
            </div>
            <span class="popup-close" id="popupClose">&times;</span>
        `;
        
        // Re-bind close button event after updating header
        const popupClose = document.getElementById('popupClose');
        popupClose.addEventListener('click', () => {
            this.closePopup();
        });
        
        // Safety check for books array - handle both 'books' and 'works' properties
        const books = this.selectedAuthor.books || this.selectedAuthor.works || [];
        
        if (!Array.isArray(books)) {
            console.warn('Books is not an array:', books);
            books = [];
        }
        
        const booksHtml = books.map(book => `
            <div class="book-item">
                <div class="book-title">${book.title}</div>
                <div class="book-year">Published: ${book.year ? this.formatYear(book.year) : 'Unknown'}</div>
                ${book.description ? `<div class="book-description">${book.description}</div>` : ''}
                <div class="book-characters">
                    <strong>Main Characters:</strong> ${book.characters && book.characters.length > 0 ? book.characters.join(', ') : 'No characters listed'}
                </div>
            </div>
        `).join('');
        
        authorInfoContainer.innerHTML = `
            <div class="author-info active">
            <div class="author-content">
            <div class="author-image-section">
            <img src="/static/images/ancient/${this.selectedAuthor.name.toLowerCase().replace(/ /g, '_')}.jpg" 
                 alt="${this.selectedAuthor.name}" 
                 class="author-image"
                 onerror="this.src='/static/images/default-author.svg'; this.onerror=null;">
            </div>
            <div class="author-bio-section">
            ${this.selectedAuthor.bio ? `
            <div class="author-bio">
                <h3>Biography</h3>
                <p>${this.selectedAuthor.bio}</p>
            </div>
            ` : '<div class="author-bio"><h3>Biography</h3><p>No biography available.</p></div>'}
            </div>
            </div>
            
            <div class="books-section">
            <h3>Books Read (${books.length}):</h3>
            ${booksHtml}
            </div>
            </div>
        `;
    }

    updateFilterMessage(filteredCount, searchTerm) {
        const authorInfoContainer = document.getElementById('authorInfo');
        
        if (!authorInfoContainer) {
            console.error('Could not find authorInfo element in DOM for updateFilterMessage');
            return;
        }
        
        let message = `📚 Literature Timeline`;
        if (filteredCount === this.authorsData.length) {
            message += `<br>Showing all <strong>${this.authorsData.length} authors</strong>`;
        } else {
            message += `<br>Showing <strong>${filteredCount}</strong> of <strong>${this.authorsData.length}</strong> authors`;
        }
        
        if (searchTerm) {
            message += `<br>Search: "${searchTerm}"`;
        }
        
        authorInfoContainer.innerHTML = `
            <div class="initial-message">
                <p>${message}</p>
                <p>Click on any author in the timeline to see their books and main characters.</p>
                <p>Use filters above to narrow down results.</p>
            </div>
        `;
    }

    showInitialMessage() {
        const authorInfoContainer = document.getElementById('authorInfo');
        
        if (!authorInfoContainer) {
            console.error('Could not find authorInfo element in DOM for showInitialMessage');
            return;
        }
        
        authorInfoContainer.innerHTML = `
            <div class="initial-message">
                <p>📚 Literature Timeline</p>
                <p>Showing <strong>${this.authorsData.length} authors</strong> from ancient Greece to modern times</p>
                <p>Click on any author in the timeline to see their books and main characters.</p>
                <p>Use mouse wheel to zoom, drag to pan the timeline.</p>
            </div>
        `;
    }

    showErrorMessage(message) {
        const authorInfoContainer = document.getElementById('authorInfo');
        if (authorInfoContainer) {
            authorInfoContainer.innerHTML = `
                <div class="error-message">
                    <p>⚠️ Error: ${message}</p>
                </div>
            `;
        } else {
            // Create a temporary container to show the error if authorInfo doesn't exist
            const timelineContainer = document.getElementById('timeline');
            if (timelineContainer) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `<p>⚠️ Error: ${message}</p>`;
                timelineContainer.appendChild(errorDiv);
            }
            console.error('Could not display error message in UI:', message);
        }
    }

    // Reading List Methods
    async loadReadingLists() {
        try {
            // Try to load from database first
            const response = await fetch('/api/reading-list/');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.readings) {
                    // Convert database readings to the expected format
                    this.readingLists = {
                        wantToRead: data.readings.filter(r => r.status_code === 'to_read'),
                        currentlyReading: data.readings.filter(r => r.status_code === 'reading'),
                        read: data.readings.filter(r => r.status_code === 'completed')
                    };
                    console.log('Reading lists loaded from database');
                    return;
                }
            }
            
            // Fallback to localStorage if not authenticated or no database data
            const saved = localStorage.getItem('readingLists');
            if (saved) {
                this.readingLists = JSON.parse(saved);
                console.log('Reading lists loaded from localStorage');
            }
        } catch (error) {
            console.warn('Error loading reading lists from database, using localStorage:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('readingLists');
            if (saved) {
                this.readingLists = JSON.parse(saved);
            }
        }
    }

    async saveReadingLists() {
        // Always save to localStorage as backup
        localStorage.setItem('readingLists', JSON.stringify(this.readingLists));
        
        // If user is authenticated, we don't need to explicitly save here
        // as database operations are handled through the API endpoints
        console.log('Reading lists saved to localStorage');
    }

    async addBookToReadingList(bookId, status = 'to_read') {
        try {
            // Check if user is authenticated
            const authResponse = await fetch('/api/auth/status/');
            if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.authenticated) {
                    // User is authenticated, add to database
                    const response = await fetch('/api/reading-list/add/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': this.getCSRFToken(),
                        },
                        body: JSON.stringify({
                            work_id: bookId,
                            status: status
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Book added to database reading list:', data.message);
                        // Reload reading lists from database
                        await this.loadReadingLists();
                        return { success: true, message: data.message };
                    } else {
                        throw new Error('Failed to add book to database');
                    }
                }
            }
            
            // Fallback to localStorage for non-authenticated users
            return this.addBookToLocalReadingList(bookId, status);
            
        } catch (error) {
            console.warn('Error adding book to database, using localStorage:', error);
            return this.addBookToLocalReadingList(bookId, status);
        }
    }

    addBookToLocalReadingList(bookId, status = 'to_read') {
        // Find the book in authorsData
        let book = null;
        for (const author of this.authorsData) {
            if (author.books) {
                const foundBook = author.books.find(b => b.id === bookId || b.title === bookId);
                if (foundBook) {
                    book = {
                        ...foundBook,
                        id: bookId,
                        author: author.name
                    };
                    break;
                }
            }
        }
        
        if (!book) {
            return { success: false, message: 'Book not found' };
        }
        
        // Remove from all lists first
        this.removeBookFromAllLists(bookId);
        
        // Add to appropriate list
        switch (status) {
            case 'to_read':
                this.readingLists.wantToRead.push(book);
                break;
            case 'reading':
                this.readingLists.currentlyReading.push(book);
                break;
            case 'completed':
                this.readingLists.read.push(book);
                break;
        }
        
        this.saveReadingLists();
        return { success: true, message: 'Book added to reading list' };
    }

    async removeBookFromReadingList(readingProgressId) {
        try {
            // Check if user is authenticated
            const authResponse = await fetch('/api/auth/status/');
            if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.authenticated) {
                    // User is authenticated, remove from database
                    const response = await fetch('/api/reading-list/remove/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': this.getCSRFToken(),
                        },
                        body: JSON.stringify({
                            reading_progress_id: readingProgressId
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Book removed from database reading list:', data.message);
                        // Reload reading lists from database
                        await this.loadReadingLists();
                        return { success: true, message: data.message };
                    } else {
                        throw new Error('Failed to remove book from database');
                    }
                }
            }
            
            // Fallback to localStorage for non-authenticated users
            return this.removeBookFromLocalReadingList(readingProgressId);
            
        } catch (error) {
            console.warn('Error removing book from database, using localStorage:', error);
            return this.removeBookFromLocalReadingList(readingProgressId);
        }
    }

    removeBookFromLocalReadingList(bookId) {
        this.removeBookFromAllLists(bookId);
        this.saveReadingLists();
        return { success: true, message: 'Book removed from reading list' };
    }

    removeBookFromAllLists(bookId) {
        this.readingLists.wantToRead = this.readingLists.wantToRead.filter(book => book.id !== bookId);
        this.readingLists.currentlyReading = this.readingLists.currentlyReading.filter(book => book.id !== bookId);
        this.readingLists.read = this.readingLists.read.filter(book => book.id !== bookId);
    }

    async updateReadingStatus(readingProgressId, newStatus) {
        try {
            // Check if user is authenticated
            const authResponse = await fetch('/api/auth/status/');
            if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.authenticated) {
                    // User is authenticated, update in database
                    const response = await fetch('/api/reading-list/update/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': this.getCSRFToken(),
                        },
                        body: JSON.stringify({
                            reading_progress_id: readingProgressId,
                            status: newStatus
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Reading status updated in database:', data.message);
                        // Reload reading lists from database
                        await this.loadReadingLists();
                        return { success: true, message: data.message };
                    } else {
                        throw new Error('Failed to update reading status in database');
                    }
                }
            }
            
            // Fallback to localStorage for non-authenticated users
            return this.updateLocalReadingStatus(readingProgressId, newStatus);
            
        } catch (error) {
            console.warn('Error updating reading status in database, using localStorage:', error);
            return this.updateLocalReadingStatus(readingProgressId, newStatus);
        }
    }

    updateLocalReadingStatus(bookId, newStatus) {
        // Find and move book between lists
        let book = null;
        
        // Find the book in any list
        for (const listName of ['wantToRead', 'currentlyReading', 'read']) {
            const index = this.readingLists[listName].findIndex(b => b.id === bookId);
            if (index !== -1) {
                book = this.readingLists[listName].splice(index, 1)[0];
                break;
            }
        }
        
        if (book) {
            // Add to new list
            switch (newStatus) {
                case 'to_read':
                    this.readingLists.wantToRead.push(book);
                    break;
                case 'reading':
                    this.readingLists.currentlyReading.push(book);
                    break;
                case 'completed':
                    this.readingLists.read.push(book);
                    break;
            }
            
            this.saveReadingLists();
            return { success: true, message: 'Reading status updated' };
        }
        
        return { success: false, message: 'Book not found' };
    }

    getCSRFToken() {
        // Try to get CSRF token from meta tag first
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) {
            return csrfMeta.getAttribute('content');
        }
        
        // Fallback to cookie method
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }

    bindReadingListEvents() {
        const readingListBtn = document.getElementById('readingListBtn');
        const closeReadingList = document.getElementById('closeReadingList');
        const bookSearch = document.getElementById('bookSearch');

        if (readingListBtn) {
            readingListBtn.addEventListener('click', () => {
                this.toggleReadingList();
            });
        }

        if (closeReadingList) {
            closeReadingList.addEventListener('click', () => {
                this.closeReadingList();
            });
        }

        if (bookSearch) {
            bookSearch.addEventListener('input', (e) => {
                this.searchBooks(e.target.value);
            });
        }

        // Close reading list when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('readingListPanel');
            const btn = document.getElementById('readingListBtn');
            
            if (panel && panel.classList.contains('active') && 
                !panel.contains(e.target) && 
                !btn.contains(e.target)) {
                this.closeReadingList();
            }
        });
    }

    openReadingList() {
        const panel = document.getElementById('readingListPanel');
        const container = document.querySelector('.timeline-container');
        
        if (panel && container) {
            // Close other panels first
            this.closeDictionary();
            this.closeNotes();
            
            panel.classList.add('active');
            container.classList.add('reading-list-open');
            
            // Load reading list from database instead of localStorage
            if (this.databaseReadingListPanel) {
                this.databaseReadingListPanel.loadReadings();
            } else {
                // Fallback to original localStorage method
                this.renderReadingLists();
            }
        }
    }

    closeReadingList() {
        const panel = document.getElementById('readingListPanel');
        const container = document.querySelector('.timeline-container');
        
        if (panel && container) {
            panel.classList.remove('active');
            container.classList.remove('reading-list-open');
        }
    }

    toggleReadingList() {
        const panel = document.getElementById('readingListPanel');
        const container = document.querySelector('.timeline-container');
        
        if (panel && container) {
            if (panel.classList.contains('active')) {
                // Close the reading list
                panel.classList.remove('active');
                container.classList.remove('reading-list-open');
            } else {
                // Close other panels first
                this.closeDictionary();
                this.closeNotes();
                this.closeProfile();
                
                // Open the reading list
                panel.classList.add('active');
                container.classList.add('reading-list-open');
                
                // Use database panel if available, otherwise fallback to local implementation
                if (this.databaseReadingListPanel) {
                    this.databaseReadingListPanel.loadReadings();
                } else {
                    this.renderReadingLists();
                }
            }
        }
    }

    searchBooks(query) {
        const resultsContainer = document.getElementById('bookSearchResults');
        if (!resultsContainer) return;

        if (!query.trim()) {
            resultsContainer.innerHTML = `
                <div class="search-welcome">
                    <p>Search for books to add to your reading list</p>
                </div>
            `;
            return;
        }

        const results = [];
        const searchTerm = query.toLowerCase();

        // Search through all authors and their books
        this.authorsData.forEach(author => {
            author.books.forEach(book => {
                if (book.title.toLowerCase().includes(searchTerm) ||
                    author.name.toLowerCase().includes(searchTerm)) {
                    
                    // Check if book is already in any reading list
                    const isInList = this.isBookInReadingList(book, author);
                    
                    results.push({
                        book: book,
                        author: author,
                        isInList: isInList
                    });
                }
            });
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-welcome">
                    <p>No books found matching "${query}"</p>
                </div>
            `;
            return;
        }

        // Store search results for later access
        this.currentSearchResults = results;
        
        const resultsHtml = results.map((result, index) => {
            const currentList = this.getBookCurrentList(result.book, result.author);
            let statusText = '';
            let statusColor = '';
            
            if (currentList) {
                switch(currentList) {
                    case 'wantToRead':
                        statusText = '📖 Want to Read';
                        statusColor = '#6c757d';
                        break;
                    case 'currentlyReading':
                        statusText = '📚 Currently Reading';
                        statusColor = '#fd7e14';
                        break;
                    case 'read':
                        statusText = '✅ Read';
                        statusColor = '#28a745';
                        break;
                }
            }
            
            return `
                <div class="book-search-item" data-result-index="${index}">
                    <div class="book-info">
                        <div class="book-search-title">${result.book.title}</div>
                        <div class="book-search-author">by ${result.author.name}</div>
                        <div class="book-search-year">${result.book.year ? this.formatYear(result.book.year) : 'Unknown year'}</div>
                        ${statusText ? `<div style="color: ${statusColor}; font-size: 11px; margin-top: 3px;">${statusText}</div>` : ''}
                    </div>
                    <div class="book-actions-area">
                        <div class="click-to-actions">Click for actions</div>
                        <div class="book-actions-buttons" style="display: none;"></div>
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;

        // Add click events to search results
        const searchItems = resultsContainer.querySelectorAll('.book-search-item');
        searchItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const resultIndex = parseInt(item.getAttribute('data-result-index'));
                const result = this.currentSearchResults[resultIndex];
                if (result) {
                    this.showBookActions(result.book, result.author, item);
                }
            });
        });
    }

    isBookInReadingList(book, author) {
        const bookId = `${author.name}-${book.title}`;
        return this.readingLists.wantToRead.some(b => b.id === bookId) ||
               this.readingLists.currentlyReading.some(b => b.id === bookId) ||
               this.readingLists.read.some(b => b.id === bookId);
    }

    getBookCurrentList(book, author) {
        const bookId = `${author.name}-${book.title}`;
        if (this.readingLists.wantToRead.some(b => b.id === bookId)) {
            return 'wantToRead';
        }
        if (this.readingLists.currentlyReading.some(b => b.id === bookId)) {
            return 'currentlyReading';
        }
        if (this.readingLists.read.some(b => b.id === bookId)) {
            return 'read';
        }
        return null;
    }

    showBookActions(book, author, element) {
        // Remove active class from all other book actions
        const allBookItems = document.querySelectorAll('.book-search-item');
        allBookItems.forEach(item => {
            const clickToActions = item.querySelector('.click-to-actions');
            const buttonsContainer = item.querySelector('.book-actions-buttons');
            if (clickToActions) clickToActions.style.display = 'block';
            if (buttonsContainer) {
                buttonsContainer.style.display = 'none';
                buttonsContainer.innerHTML = '';
            }
        });

        const bookId = `${author.name}-${book.title}`;
        const currentList = this.getBookCurrentList(book, author);
        
        // Find the actions area within this element
        const clickToActions = element.querySelector('.click-to-actions');
        const buttonsContainer = element.querySelector('.book-actions-buttons');
        
        // Hide the click text and show buttons
        clickToActions.style.display = 'none';
        buttonsContainer.style.display = 'flex';
        
        // Clear existing buttons
        buttonsContainer.innerHTML = '';
        
        // Add buttons based on current status
        if (currentList !== 'wantToRead') {
            const btn = document.createElement('button');
            btn.textContent = `${currentList ? 'Move to' : 'Add to'} Want to Read`;
            btn.className = 'action-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToReadingList(author.name, book.title, 'wantToRead');
            });
            buttonsContainer.appendChild(btn);
        }
        
        if (currentList !== 'currentlyReading') {
            const btn = document.createElement('button');
            btn.textContent = `${currentList ? 'Move to' : 'Add to'} Currently Reading`;
            btn.className = 'action-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToReadingList(author.name, book.title, 'currentlyReading');
            });
            buttonsContainer.appendChild(btn);
        }
        
        if (currentList !== 'read') {
            const btn = document.createElement('button');
            btn.textContent = `${currentList ? 'Move to' : 'Add to'} Read`;
            btn.className = 'action-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToReadingList(author.name, book.title, 'read');
            });
            buttonsContainer.appendChild(btn);
        }

        if (currentList) {
            const btn = document.createElement('button');
            btn.textContent = 'Remove from List';
            btn.className = 'action-btn remove-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeBook(bookId, currentList);
            });
            buttonsContainer.appendChild(btn);
        }

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!element.contains(e.target)) {
                    clickToActions.style.display = 'block';
                    buttonsContainer.style.display = 'none';
                    buttonsContainer.innerHTML = '';
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    showBookActionsForReadingList(book, author, element, currentList) {
        // Remove active class from all other book actions
        const allBookItems = document.querySelectorAll('.reading-list-book');
        allBookItems.forEach(item => {
            const clickToActions = item.querySelector('.click-for-actions');
            const buttonsContainer = item.querySelector('.book-actions-buttons');
            if (clickToActions) clickToActions.style.display = 'block';
            if (buttonsContainer) {
                buttonsContainer.style.display = 'none';
                buttonsContainer.innerHTML = '';
            }
        });

        // Find the actions area within this element
        const clickToActions = element.querySelector('.click-for-actions');
        let buttonsContainer = element.querySelector('.book-actions-buttons');
        
        // If buttons container doesn't exist, create it
        if (!buttonsContainer) {
            buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'book-actions-buttons';
            buttonsContainer.style.display = 'none';
            buttonsContainer.style.flexDirection = 'column';
            buttonsContainer.style.gap = '4px';
            buttonsContainer.style.width = '100%';
            buttonsContainer.style.maxWidth = '180px';
            
            // Add it to the actions area
            const actionsArea = element.querySelector('.reading-list-book-actions') || element;
            actionsArea.appendChild(buttonsContainer);
        }
        
        // Hide the click text and show buttons
        if (clickToActions) clickToActions.style.display = 'none';
        buttonsContainer.style.display = 'flex';
        
        // Clear existing buttons
        buttonsContainer.innerHTML = '';
        
        if (currentList !== 'wantToRead') {
            const btn = document.createElement('button');
            btn.textContent = 'Move to Want to Read';
            btn.className = 'action-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveBook(book.id, currentList, 'wantToRead');
            });
            buttonsContainer.appendChild(btn);
        }
        
        if (currentList !== 'currentlyReading') {
            const btn = document.createElement('button');
            btn.textContent = 'Move to Currently Reading';
            btn.className = 'action-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveBook(book.id, currentList, 'currentlyReading');
            });
            buttonsContainer.appendChild(btn);
        }
        
        if (currentList !== 'read') {
            const btn = document.createElement('button');
            btn.textContent = 'Move to Read';
            btn.className = 'action-btn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveBook(book.id, currentList, 'read');
            });
            buttonsContainer.appendChild(btn);
        }

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove from List';
        removeBtn.className = 'action-btn remove-btn';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeBook(book.id, currentList);
        });
        buttonsContainer.appendChild(removeBtn);

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!element.contains(e.target)) {
                    if (clickToActions) clickToActions.style.display = 'block';
                    buttonsContainer.style.display = 'none';
                    buttonsContainer.innerHTML = '';
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    addToReadingList(authorName, bookTitle, listType) {
        const author = this.authorsData.find(a => a.name === authorName);
        const book = author ? author.books.find(b => b.title === bookTitle) : null;
        
        if (!book || !author) return;

        const bookId = `${authorName}-${bookTitle}`;
        const bookData = {
            id: bookId,
            title: bookTitle,
            author: authorName,
            year: book.year,
            description: book.description
        };

        // Remove from other lists first
        this.readingLists.wantToRead = this.readingLists.wantToRead.filter(b => b.id !== bookId);
        this.readingLists.currentlyReading = this.readingLists.currentlyReading.filter(b => b.id !== bookId);
        this.readingLists.read = this.readingLists.read.filter(b => b.id !== bookId);

        // Add to selected list
        this.readingLists[listType].push(bookData);
        
        this.saveReadingLists();
        this.renderReadingLists();
        
        // Refresh search results to update status
        const bookSearch = document.getElementById('bookSearch');
        if (bookSearch && bookSearch.value) {
            this.searchBooks(bookSearch.value);
        }

        // Reset all book actions to default state
        const allBookItems = document.querySelectorAll('.book-search-item');
        allBookItems.forEach(item => {
            const clickToActions = item.querySelector('.click-to-actions');
            const buttonsContainer = item.querySelector('.book-actions-buttons');
            if (clickToActions) clickToActions.style.display = 'block';
            if (buttonsContainer) {
                buttonsContainer.style.display = 'none';
                buttonsContainer.innerHTML = '';
            }
        });
    }

    moveBook(bookId, fromList, toList) {
        const book = this.readingLists[fromList].find(b => b.id === bookId);
        if (!book) return;

        // Remove from current list
        this.readingLists[fromList] = this.readingLists[fromList].filter(b => b.id !== bookId);
        
        // Add to new list
        this.readingLists[toList].push(book);
        
        this.saveReadingLists();
        this.renderReadingLists();
    }

    removeBook(bookId, listType) {
        this.readingLists[listType] = this.readingLists[listType].filter(b => b.id !== bookId);
        this.saveReadingLists();
        this.renderReadingLists();
        
        // Refresh search results to update status
        const bookSearch = document.getElementById('bookSearch');
        if (bookSearch && bookSearch.value) {
            this.searchBooks(bookSearch.value);
        }

        // Reset all book actions to default state
        const allBookItems = document.querySelectorAll('.book-search-item');
        allBookItems.forEach(item => {
            const clickToActions = item.querySelector('.click-to-actions');
            const buttonsContainer = item.querySelector('.book-actions-buttons');
            if (clickToActions) clickToActions.style.display = 'block';
            if (buttonsContainer) {
                buttonsContainer.style.display = 'none';
                buttonsContainer.innerHTML = '';
            }
        });
    }

    renderReadingLists() {
        this.renderReadingList('wantToRead', 'wantToReadList');
        this.renderReadingList('currentlyReading', 'currentlyReadingList');
        this.renderReadingList('read', 'readList');
    }

    renderReadingList(listType, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const books = this.readingLists[listType];
        
        if (books.length === 0) {
            container.innerHTML = '<div class="empty-list">No books added yet</div>';
            return;
        }

        const booksHtml = books.map(book => `
            <div class="reading-list-book clickable-book" data-book-id="${book.id}" data-book-title="${book.title}" data-book-author="${book.author}" data-book-year="${book.year || ''}" data-current-list="${listType}">
                <div class="book-info">
                    <div class="reading-list-book-title">${book.title}</div>
                    <div class="reading-list-book-author">by ${book.author}</div>
                    <div class="reading-list-book-year">${book.year ? this.formatYear(book.year) : 'Unknown year'}</div>
                </div>
                <div class="reading-list-book-actions">
                    <div class="click-for-actions">Click for actions</div>
                    <div class="book-actions-buttons" style="display: none;"></div>
                </div>
            </div>
        `).join('');

        container.innerHTML = booksHtml;

        // Add click events to books for moving between lists
        const bookElements = container.querySelectorAll('.clickable-book');
        bookElements.forEach(bookElement => {
            bookElement.addEventListener('click', (e) => {
                const bookData = {
                    id: bookElement.dataset.bookId,
                    title: bookElement.dataset.bookTitle,
                    author: bookElement.dataset.bookAuthor,
                    year: bookElement.dataset.bookYear
                };
                
                const authorData = {
                    name: bookElement.dataset.bookAuthor
                };
                
                this.showBookActionsForReadingList(bookData, authorData, bookElement, bookElement.dataset.currentList);
            });
        });
    }
    
    // Generate a unique ID for works
    getUniqueId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

    // Make ReadingTrackerVis available globally
    window.ReadingTrackerVis = ReadingTrackerVis;
}

// Initialize the reading tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.readingTrackerVis = new ReadingTrackerVis();
});
