/**
 * Node.js Data Ingestion Service
 * ================================
 * 
 * Fetches XML product catalog from Node.js/MongoDB system and uploads to Algolia.
 */

const algoliasearch = require('algoliasearch');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

/**
 * XML Catalog Ingestion Service
 */
class XMLCatalogIngestion {
    constructor() {
        // Validate required environment variables
        const required = ['ALGOLIA_APP_ID', 'ALGOLIA_API_KEY', 'ALGOLIA_INDEX_NAME'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        // Configuration
        this.config = {
            xmlCatalogUrl: process.env.XML_CATALOG_URL || 'DEMO',
            xmlCatalogTimeout: parseInt(process.env.XML_CATALOG_TIMEOUT) || 300000, // 5 minutes
            xmlCatalogAuth: {
                username: process.env.XML_CATALOG_USERNAME,
                password: process.env.XML_CATALOG_PASSWORD
            },
            algoliaBatchSize: parseInt(process.env.ALGOLIA_BATCH_SIZE) || 10000
        };
        
        // Initialize Algolia client
        this.algoliaClient = algoliasearch(
            process.env.ALGOLIA_APP_ID,
            process.env.ALGOLIA_API_KEY
        );
        this.algoliaIndex = this.algoliaClient.initIndex(process.env.ALGOLIA_INDEX_NAME);
        
        // Initialize XML parser
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseTagValue: true,
            parseAttributeValue: true,
            trimValues: true
        });
        
        // Statistics
        this.stats = {
            productsProcessed: 0,
            productsUploaded: 0,
            errors: 0
        };
        
        console.log('Node.js XML Catalog Ingestion Service Initialized');
        console.log('================================================');
        console.log(`XML Catalog URL: ${this.config.xmlCatalogUrl}`);
        console.log(`Algolia Index: ${process.env.ALGOLIA_INDEX_NAME}`);
        console.log(`Batch Size: ${this.config.algoliaBatchSize}`);
        console.log('================================================\n');
    }
    
    
    /**
     * Main execution: fetch XML and upload to Algolia
     */
    async run() {
        const startTime = Date.now();
        
        try {
            console.log('Fetching XML catalog');
            const xmlData = await this.fetchXMLCatalog();
            
            console.log('Parsing XML');
            const products = this.parseXML(xmlData);
            
            console.log(`Uploading ${products.length} products to Algolia`);
            await this.uploadToAlgolia(products);
            
            const duration = (Date.now() - startTime) / 1000;
            this.printSummary(duration);
            
            process.exit(0);
            
        } catch (error) {
            console.error('\n[ERROR] Ingestion failed:', error.message);
            console.error('Stack trace:', error.stack);
            process.exit(1);
        }
    }
    
    /**
     * Fetch XML catalog from secure URL
     * 
     * @returns {string} XML content
     */
    async fetchXMLCatalog() {
        // DEMO MODE: Read from sample file
        if (this.config.xmlCatalogUrl === 'DEMO') {
            return this.fetchFromSampleFile();
        }
        
        // PRODUCTION: Fetch from URL
        try {
            console.log(`  - Fetching from: ${this.config.xmlCatalogUrl}`);
            
            const response = await axios.get(this.config.xmlCatalogUrl, {
                timeout: this.config.xmlCatalogTimeout,
                auth: this.config.xmlCatalogAuth.username ? {
                    username: this.config.xmlCatalogAuth.username,
                    password: this.config.xmlCatalogAuth.password
                } : undefined,
                responseType: 'text'
            });
            
            console.log(`  - Received ${response.data.length} bytes`);
            return response.data;
            
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('No response received from XML catalog URL');
            } else {
                throw new Error(`Request failed: ${error.message}`);
            }
        }
    }
    
    /**
     * Demo mode: Read from sample file
     * 
     * @returns {string} XML content
     */
    fetchFromSampleFile() {
        const sampleFile = path.join(__dirname, './xml output.xml');
        
        if (!fs.existsSync(sampleFile)) {
            throw new Error(`file not found: ${sampleFile}`);
        }
        
        console.log('  - Reading from sample file');
        const xmlContent = fs.readFileSync(sampleFile, 'utf-8');
        console.log(`  - Read ${xmlContent.length} bytes`);
        
        return xmlContent;
    }
    
    /**
     * Parse XML and transform to Algolia format
     * 
     * @param {string} xmlData Raw XML content
     * @returns {Array} Array of product objects
     */
    parseXML(xmlData) {
        try {
            const parsedXML = this.xmlParser.parse(xmlData);
            
            // Handle single or multiple rows
            let rows = parsedXML.root.row;
            if (!Array.isArray(rows)) {
                rows = rows ? [rows] : [];
            }
            
            console.log(`  - Found ${rows.length} products in XML`);
            
            // Transform to Algolia format
            const products = rows.map((row, index) => {
                try {
                    return this.transformProduct(row);
                } catch (error) {
                    console.error(`  - Error transforming product ${index + 1}:`, error.message);
                    this.stats.errors++;
                    return null;
                }
            }).filter(product => product !== null);
            
            this.stats.productsProcessed = products.length;
            console.log(`  - Successfully transformed ${products.length} products`);
            
            return products;
            
        } catch (error) {
            throw new Error(`XML parsing failed: ${error.message}`);
        }
    }
    
    /**
     * Transform XML row to Algolia product format
     * 
     * @param {Object} row XML row object
     * @returns {Object} Algolia product object
     */
    transformProduct(row) {
        const product = {
            objectID: String(row.objectID) // Ensure objectID is always a string
        };
        
        // Simple fields
        const simpleFields = ['name', 'description', 'brand', 'type', 'image', 'url'];
        simpleFields.forEach(field => {
            if (row[field]) {
                product[field] = row[field];
            }
        });
        
        // Price (convert to number)
        if (row.price) {
            product.price = parseFloat(row.price);
            product.price_range = this.calculatePriceRange(product.price);
        }
        
        // Rating (convert to number)
        if (row.rating) {
            product.rating = parseInt(row.rating);
        }
        
        // Popularity (convert to number)
        if (row.popularity) {
            product.popularity = parseInt(row.popularity);
        }
        
        // Free shipping (convert to boolean)
        if (row.free_shipping !== undefined) {
            product.free_shipping = row.free_shipping === true || 
                                   row.free_shipping === 'true' || 
                                   row.free_shipping === 1;
        }
        
        // Categories (can be string or array)
        if (row.categories) {
            product.categories = Array.isArray(row.categories) ? 
                                row.categories : [row.categories];
        }
        
        // Hierarchical categories
        if (row.hierarchicalCategories) {
            product.hierarchicalCategories = {};
            Object.keys(row.hierarchicalCategories).forEach(key => {
                // Handle HTML entities like &gt;
                product.hierarchicalCategories[key] = 
                    row.hierarchicalCategories[key].replace(/&gt;/g, '>');
            });
        }
        
        // Validate required fields
        if (!product.objectID || !product.name) {
            throw new Error('Missing required fields: objectID or name');
        }
        
        return product;
    }
    
    /**
     * Calculate price range bucket
     * 
     * @param {number} price Product price
     * @returns {string} Price range string
     */
    calculatePriceRange(price) {
        if (price < 50) return '1 - 50';
        if (price < 100) return '50 - 100';
        if (price < 200) return '100 - 200';
        if (price < 500) return '200 - 500';
        if (price < 1000) return '500 - 1000';
        return '1000+';
    }
    
    /**
     * Upload products to Algolia in batches
     * 
     * @param {Array} products Array of products to upload
     */
    async uploadToAlgolia(products) {
        if (products.length === 0) {
            console.log('  - No products to upload');
            return;
        }
        
        try {
            // Split into batches (Algolia supports up to 10,000 per batch)
            const batches = [];
            for (let i = 0; i < products.length; i += this.config.algoliaBatchSize) {
                batches.push(products.slice(i, i + this.config.algoliaBatchSize));
            }
            
            console.log(`  - Uploading in ${batches.length} batch(es)`);
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`  - Uploading batch ${i + 1}/${batches.length} (${batch.length} records)...`);
                
                const response = await this.algoliaIndex.saveObjects(batch);
                this.stats.productsUploaded += batch.length;
                
                // Wait for last batch to complete
                // Response structure: 
                // { 
                //     taskIDs: [...], 
                //     objectIDs: [...],
                //     taskID: ...
                //     objectID: ...
                //     ...
                // }
                if (i === batches.length - 1) {
                    if (response.taskIDs && response.taskIDs.length > 0) {
                        // Wait for the last task
                        await this.algoliaIndex.waitTask(response.taskIDs[response.taskIDs.length - 1]);
                        console.log('  - Indexing complete');
                    }
                }
            }
            
            console.log(`  - Successfully uploaded ${this.stats.productsUploaded} products`);
            
        } catch (error) {
            throw new Error(`Algolia upload failed: ${error.message}`);
        }
    }
    
    /**
     * Print execution summary
     * 
     * @param {number} duration Execution time in seconds
     */
    printSummary(duration) {
        console.log('\n================================================');
        console.log('INGESTION COMPLETE');
        console.log('================================================');
        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Products Processed: ${this.stats.productsProcessed}`);
        console.log(`Products Uploaded: ${this.stats.productsUploaded}`);
        console.log(`Errors: ${this.stats.errors}`);
        console.log('================================================');
    }
}

// Run if called directly (not when imported for testing)
if (require.main === module) {
    (async () => {
        try {
            const service = new XMLCatalogIngestion();
            await service.run();
        } catch (error) {
            console.error('[FATAL ERROR]', error.message);
            process.exit(1);
        }
    })();
}

// Export for testing
module.exports = { XMLCatalogIngestion };
