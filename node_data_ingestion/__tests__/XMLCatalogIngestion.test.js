const fs = require('fs');
const path = require('path');

// Set up environment variables FIRST (before any imports)
process.env.ALGOLIA_APP_ID = 'test_app_id';
process.env.ALGOLIA_API_KEY = 'test_api_key';
process.env.ALGOLIA_INDEX_NAME = 'test_index';
process.env.XML_CATALOG_URL = 'DEMO';

// Mock external dependencies
jest.mock('algoliasearch');
jest.mock('axios');
jest.mock('dotenv');

const algoliasearch = require('algoliasearch');
const axios = require('axios');

// Set up mock Algolia client BEFORE importing module
const mockIndex = {
  saveObjects: jest.fn().mockResolvedValue({
    taskIDs: [12345],
    objectIDs: ['1', '2', '3']
  }),
  waitTask: jest.fn().mockResolvedValue()
};

const mockClient = {
  initIndex: jest.fn().mockReturnValue(mockIndex)
};

algoliasearch.mockReturnValue(mockClient);

// Now require the module
const { XMLCatalogIngestion } = require('../index.js');

describe('XMLCatalogIngestion Tests', () => {
  beforeEach(() => {
    // Clear mock call history
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with correct configuration', () => {
    const instance = new XMLCatalogIngestion();

    expect(instance.config).toBeDefined();
    expect(instance.config.xmlCatalogUrl).toBe('DEMO');
    expect(instance.config.algoliaBatchSize).toBe(10000);
    expect(algoliasearch).toHaveBeenCalled();
    expect(mockClient.initIndex).toHaveBeenCalled();
  });

  test('should throw error if required environment variables are missing', () => {
    delete process.env.ALGOLIA_APP_ID;

    expect(() => {
      new XMLCatalogIngestion();
    }).toThrow('Missing required environment variables');

    // Restore
    process.env.ALGOLIA_APP_ID = 'test_app_id';
  });

  test('should parse XML correctly', () => {
    const instance = new XMLCatalogIngestion();
    
    const xmlData = `<?xml version="1.0"?>
<root>
  <row>
    <name>Test Product</name>
    <objectID>123</objectID>
    <price>99</price>
    <brand>TestBrand</brand>
  </row>
</root>`;

    const products = instance.parseXML(xmlData);

    expect(Array.isArray(products)).toBe(true);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Test Product');
    expect(products[0].objectID).toBe('123'); // Converted to string by transformProduct
    expect(products[0].price).toBe(99);
    expect(products[0].brand).toBe('TestBrand');
  });

  test('should transform hierarchical categories correctly', () => {
    const instance = new XMLCatalogIngestion();
    
    const xmlData = `<?xml version="1.0"?>
<root>
  <row>
    <name>Product</name>
    <objectID>1</objectID>
    <hierarchicalCategories>
      <lvl0>Electronics</lvl0>
      <lvl1>Electronics &gt; Audio</lvl1>
      <lvl2>Electronics &gt; Audio &gt; Headphones</lvl2>
    </hierarchicalCategories>
  </row>
</root>`;

    const products = instance.parseXML(xmlData);

    expect(products[0].hierarchicalCategories).toBeDefined();
    expect(products[0].hierarchicalCategories.lvl0).toBe('Electronics');
    expect(products[0].hierarchicalCategories.lvl1).toBe('Electronics > Audio');
    expect(products[0].hierarchicalCategories.lvl2).toBe('Electronics > Audio > Headphones');
  });

  test('should handle categories as array', () => {
    const instance = new XMLCatalogIngestion();
    
    const xmlData = `<?xml version="1.0"?>
<root>
  <row>
    <name>Product</name>
    <objectID>1</objectID>
    <categories>Cat1</categories>
    <categories>Cat2</categories>
  </row>
</root>`;

    const products = instance.parseXML(xmlData);

    expect(Array.isArray(products[0].categories)).toBe(true);
    expect(products[0].categories.length).toBeGreaterThan(0);
  });

  test('should upload to Algolia in batches', async () => {
    const instance = new XMLCatalogIngestion();
    
    // Create products that exceed batch size
    const products = [];
    for (let i = 0; i < 25000; i++) {
      products.push({
        name: `Product ${i}`,
        objectID: `${i}`
      });
    }

    await instance.uploadToAlgolia(products);

    // Should create 3 batches (10000, 10000, 5000)
    expect(mockIndex.saveObjects).toHaveBeenCalledTimes(3);
    expect(mockIndex.waitTask).toHaveBeenCalledWith(12345);
  });

  test('should handle upload errors gracefully', async () => {
    const instance = new XMLCatalogIngestion();
    
    // Mock Algolia error
    mockIndex.saveObjects.mockRejectedValueOnce(new Error('Algolia API error'));

    const products = [
      { name: 'Product 1', objectID: '1' }
    ];

    await expect(instance.uploadToAlgolia(products)).rejects.toThrow('Algolia API error');
  });

  test('should track statistics correctly', async () => {
    const instance = new XMLCatalogIngestion();
    
    const xmlData = `<?xml version="1.0"?>
<root>
  <row>
    <name>Product 1</name>
    <objectID>1</objectID>
  </row>
  <row>
    <name>Product 2</name>
    <objectID>2</objectID>
  </row>
</root>`;

    const products = instance.parseXML(xmlData);
    await instance.uploadToAlgolia(products);

    expect(instance.stats.productsProcessed).toBe(2);
    expect(instance.stats.productsUploaded).toBe(2);
    expect(instance.stats.errors).toBe(0);
  });

  test('should read from sample file in demo mode', async () => {
    const instance = new XMLCatalogIngestion();
    
    // Check if sample file exists
    const sampleFile = path.join(__dirname, '..', 'xml output.xml');
    if (fs.existsSync(sampleFile)) {
      const xmlData = await instance.fetchXMLCatalog();
      
      expect(xmlData).toBeDefined();
      expect(typeof xmlData).toBe('string');
      expect(xmlData).toContain('<?xml');
    } else {
      // Skip if sample file doesn't exist
      expect(true).toBe(true);
    }
  });

  test('should handle empty XML', () => {
    const instance = new XMLCatalogIngestion();
    
    const xmlData = '<?xml version="1.0"?><root></root>';
    const products = instance.parseXML(xmlData);

    expect(Array.isArray(products)).toBe(true);
    expect(products).toHaveLength(0);
  });

  test('should convert objectID to string', () => {
    const instance = new XMLCatalogIngestion();
    
    const xmlData = `<?xml version="1.0"?>
<root>
  <row>
    <name>Product</name>
    <objectID>12345</objectID>
  </row>
</root>`;

    const products = instance.parseXML(xmlData);

    expect(typeof products[0].objectID).toBe('string');
    expect(products[0].objectID).toBe('12345');
  });

  test('should batch products correctly', async () => {
    const instance = new XMLCatalogIngestion();
    
    const products = [];
    for (let i = 0; i < 150; i++) {
      products.push({ name: `Product ${i}`, objectID: `${i}` });
    }

    await instance.uploadToAlgolia(products);

    // With batch size of 10000, should be 1 batch
    expect(mockIndex.saveObjects).toHaveBeenCalledTimes(1);
    
    const callArg = mockIndex.saveObjects.mock.calls[0][0];
    expect(callArg).toHaveLength(150);
  });
});
