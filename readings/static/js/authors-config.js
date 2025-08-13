// Authors Configuration File
// This file contains all XML filenames and author categories for the reading tracker

if (typeof AuthorsConfig === 'undefined') {
    const AuthorsConfig = {
    // XML Files by Period
    xmlFiles: {
        ancient: [
            'sophocles.xml',
            'aeschylus.xml',
            'euripides.xml',
            'aristophanes.xml',
            'herodotus.xml',
            'thucydides.xml',
            'plato.xml',
            'aristotle.xml',
            'homer.xml',
            'phrynichus.xml',
            'thespis.xml'
        ],
        renaissance: [
            'moliere.xml',
            'goldoni.xml',
            'rabelais.xml',
            'beaumarchais.xml'
        ],
        medieval: [
            // Add medieval XML files here as needed
            // Example: 'dante.xml', 'chaucer.xml'
            'rabelais.xml' 
        ],
        modern: [
            // Add modern XML files here as needed
            // Example: 'shakespeare.xml', 'cervantes.xml'
        ]
    },

    // Author Categories for Timeline Grouping and Color Coding
    authorCategories: {
        // Ancient Authors
        'Sophocles': 'tragedy',
        'Aeschylus': 'tragedy', 
        'Euripides': 'tragedy',
        'Aristophanes': 'comedy',
        'Herodotus': 'history',
        'Thucydides': 'history',
        'Plato': 'philosophy',
        'Aristotle': 'philosophy',
        'Homer': 'poetry',
        'Phrynichus': 'tragedy',
        'Thespis': 'tragedy',
        
        // Renaissance Authors
        'Molière': 'comedy',
        'Carlo Goldoni': 'comedy',
        'Pierre‑Augustin Caron de Beaumarchais': 'comedy',
        'François Rabelais': 'comedy',
        
        // Medieval Authors (add as needed)
        // 'Dante Alighieri': 'poetry',
        // 'Geoffrey Chaucer': 'poetry',
        
        // Modern Authors (add as needed)
        // 'William Shakespeare': 'drama',
        // 'Miguel de Cervantes': 'novel'
    },

    // Author Countries/Regions
    authorCountries: {
        // Ancient Authors (Greek)
        'Sophocles': 'Ancient Greece',
        'Aeschylus': 'Ancient Greece',
        'Euripides': 'Ancient Greece',
        'Aristophanes': 'Ancient Greece',
        'Herodotus': 'Ancient Greece',
        'Thucydides': 'Ancient Greece',
        'Plato': 'Ancient Greece',
        'Aristotle': 'Ancient Greece',
        'Homer': 'Ancient Greece',
        'Phrynichus': 'Ancient Greece',
        'Thespis': 'Ancient Greece',
        
        // Renaissance Authors
        'Molière': 'France',
        'Carlo Goldoni': 'Italy',
        'Pierre‑Augustin Caron de Beaumarchais': 'France',
        'François Rabelais': 'France',
        
        // Medieval Authors (add as needed)
        // 'Dante Alighieri': 'Italy',
        // 'Geoffrey Chaucer': 'England',
        
        // Modern Authors (add as needed)
        // 'William Shakespeare': 'England',
        // 'Miguel de Cervantes': 'Spain'
    },

    // Timeline Groups Configuration
    timelineGroups: [
        { id: 1, content: 'Tragedies' },
        { id: 2, content: 'Comedies' },
        { id: 3, content: 'Poetry' },
        { id: 4, content: 'Histories' },
        { id: 5, content: 'Philosophy' },
        { id: 6, content: 'Drama' },
        { id: 7, content: 'Novels' }
    ],

    // Category to Group ID Mapping
    categoryToGroupMap: {
        'tragedy': 1,
        'comedy': 2,
        'poetry': 3,
        'history': 4,
        'philosophy': 5,
        'drama': 6,
        'novel': 7
    },

    // Helper Methods
    getAllXmlFiles() {
        return [
            ...this.xmlFiles.ancient,
            ...this.xmlFiles.renaissance,
            ...this.xmlFiles.medieval,
            ...this.xmlFiles.modern
        ];
    },

    getXmlFilesByPeriod(period) {
        return this.xmlFiles[period] || [];
    },

    getAuthorCategory(authorName) {
        return this.authorCategories[authorName] || 'drama'; // default category
    },

    getAuthorCountry(authorName) {
        return this.authorCountries[authorName] || 'Unknown'; // default country
    },

    getAllCountries() {
        const countries = [...new Set(Object.values(this.authorCountries))];
        return countries.sort();
    },

    getAuthorsByCountry(country) {
        return Object.keys(this.authorCountries).filter(author => 
            this.authorCountries[author] === country
        );
    },

    getGroupIdForCategory(category) {
        return this.categoryToGroupMap[category] || 1; // default to tragedies
    },

    // Method to add new author
    addAuthor(authorName, category, period, xmlFileName, country = 'Unknown') {
        // Add to author categories
        this.authorCategories[authorName] = category;
        
        // Add to author countries
        this.authorCountries[authorName] = country;
        
        // Add XML file to appropriate period
        if (this.xmlFiles[period] && !this.xmlFiles[period].includes(xmlFileName)) {
            this.xmlFiles[period].push(xmlFileName);
        }
    },

    // Method to get all periods with files
    getPeriodsWithFiles() {
        return Object.keys(this.xmlFiles).filter(period => 
            this.xmlFiles[period].length > 0
        );
    },

    // Helper method to get XML template for new authors
    getXMLTemplate(authorName, birthYear, deathYear, country, bio = '', category = 'drama') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<author>
    <n>${authorName}</n>
    <birth_year>${birthYear}</birth_year>
    <death_year>${deathYear}</death_year>
    <country>${country}</country>
    <bio>${bio}</bio>
    <books>
        <book>
            <title>Example Work</title>
            <year>${Math.floor((birthYear + deathYear) / 2)}</year>
            <description>Add description here...</description>
            <main_characters>
                <character>Character 1</character>
                <character>Character 2</character>
            </main_characters>
        </book>
    </books>
</author>`;
    },

    // Method to bulk update XML files with country information
    getMissingCountryAuthors() {
        const allAuthors = Object.keys(this.authorCategories);
        const authorsWithCountries = Object.keys(this.authorCountries);
        return allAuthors.filter(author => !authorsWithCountries.includes(author));
    }
    };

    // Export for use in other files
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AuthorsConfig;
    } else if (typeof window !== 'undefined') {
        window.AuthorsConfig = AuthorsConfig;
    }
}
