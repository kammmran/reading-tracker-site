// Utility script for managing authors in the reading tracker
// Use this script to easily add new authors and XML files

class AuthorManager {
    constructor(config) {
        this.config = config;
    }

    // Add a new author to the configuration
    addNewAuthor(authorName, category, period, xmlFileName) {
        console.log(`Adding new author: ${authorName}`);
        console.log(`Category: ${category}`);
        console.log(`Period: ${period}`);
        console.log(`XML File: ${xmlFileName}`);
        
        // Validate inputs
        if (!authorName || !category || !period || !xmlFileName) {
            console.error('All parameters are required: authorName, category, period, xmlFileName');
            return false;
        }

        // Check if author already exists
        if (this.config.authorCategories[authorName]) {
            console.warn(`Author ${authorName} already exists with category: ${this.config.authorCategories[authorName]}`);
            return false;
        }

        // Check if XML file already exists in the period
        if (this.config.xmlFiles[period] && this.config.xmlFiles[period].includes(xmlFileName)) {
            console.warn(`XML file ${xmlFileName} already exists in ${period} period`);
            return false;
        }

        // Add the author
        this.config.addAuthor(authorName, category, period, xmlFileName);
        
        console.log('✅ Author added successfully!');
        console.log('Updated configuration:', {
            authorCategories: this.config.authorCategories,
            xmlFiles: this.config.xmlFiles
        });
        
        return true;
    }

    // List all authors by period
    listAuthorsByPeriod() {
        const periods = this.config.getPeriodsWithFiles();
        
        console.log('📚 Authors by Period:');
        console.log('====================');
        
        periods.forEach(period => {
            console.log(`\n${period.toUpperCase()}:`);
            const files = this.config.getXmlFilesByPeriod(period);
            files.forEach(file => {
                const authorName = this.findAuthorByFile(file);
                const category = authorName ? this.config.getAuthorCategory(authorName) : 'unknown';
                console.log(`  • ${file} - ${authorName || 'Unknown'} (${category})`);
            });
        });
    }

    // Find author name by XML file (basic matching)
    findAuthorByFile(xmlFile) {
        const fileName = xmlFile.replace('.xml', '');
        
        // Try to match by similar names
        for (const authorName in this.config.authorCategories) {
            const normalizedAuthor = authorName.toLowerCase().replace(/[^a-z]/g, '');
            const normalizedFile = fileName.toLowerCase().replace(/[^a-z]/g, '');
            
            if (normalizedAuthor.includes(normalizedFile) || normalizedFile.includes(normalizedAuthor)) {
                return authorName;
            }
        }
        
        return null;
    }

    // Generate instructions for adding a new author
    generateAddInstructions(authorName, category, period) {
        const xmlFileName = `${authorName.toLowerCase().replace(/[^a-z]/g, '')}.xml`;
        
        console.log('\n📝 Instructions to add new author:');
        console.log('=================================');
        console.log(`1. Create XML file: /readings/static/data/${period}/${xmlFileName}`);
        console.log(`2. Add author image: /readings/static/images/${period}/${authorName.toLowerCase().replace(/ /g, '_')}.jpg`);
        console.log(`3. Run: authorManager.addNewAuthor('${authorName}', '${category}', '${period}', '${xmlFileName}')`);
        console.log(`4. Refresh the website to see the new author`);
        
        console.log('\n📄 XML File Template:');
        console.log(`
<?xml version="1.0" encoding="UTF-8"?>
<author>
    <name>${authorName}</name>
    <birth_year>YYYY</birth_year>
    <death_year>YYYY</death_year>
    <bio>Biography of ${authorName}...</bio>
    <books>
        <book>
            <title>Book Title</title>
            <year>YYYY</year>
            <description>Description of the work...</description>
            <main_characters>
                <character>Character 1</character>
                <character>Character 2</character>
            </main_characters>
        </book>
    </books>
</author>
        `);
    }

    // List available categories
    listCategories() {
        const categories = Object.values(this.config.authorCategories);
        const uniqueCategories = [...new Set(categories)];
        
        console.log('📋 Available Categories:');
        console.log('======================');
        uniqueCategories.forEach(category => {
            const authors = Object.keys(this.config.authorCategories)
                .filter(author => this.config.authorCategories[author] === category);
            console.log(`${category}: ${authors.join(', ')}`);
        });
    }

    // List available periods
    listPeriods() {
        const periods = Object.keys(this.config.xmlFiles);
        
        console.log('📅 Available Periods:');
        console.log('====================');
        periods.forEach(period => {
            const fileCount = this.config.xmlFiles[period].length;
            console.log(`${period}: ${fileCount} files`);
        });
    }
}

// Create global instance when configuration is available
if (typeof window !== 'undefined' && window.AuthorsConfig) {
    window.authorManager = new AuthorManager(window.AuthorsConfig);
    
    // Log helpful information
    console.log('📚 Author Manager initialized!');
    console.log('Use these commands:');
    console.log('• authorManager.listAuthorsByPeriod() - List all authors');
    console.log('• authorManager.listCategories() - List available categories');
    console.log('• authorManager.listPeriods() - List available periods');
    console.log('• authorManager.generateAddInstructions("Author Name", "category", "period") - Get instructions');
    console.log('• authorManager.addNewAuthor("Name", "category", "period", "file.xml") - Add new author');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthorManager;
}
