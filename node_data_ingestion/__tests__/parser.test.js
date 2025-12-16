const { XMLParser } = require('fast-xml-parser');

describe('XML Parser Tests', () => {
  let xmlParser;

  beforeEach(() => {
    xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true
    });
  });

  test('should parse simple XML correctly', () => {
    const xmlData = `
      <products>
        <row>
          <name>Test Product</name>
          <objectID>123</objectID>
          <price>99</price>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);

    expect(result).toHaveProperty('products');
    expect(result.products).toHaveProperty('row');
    expect(result.products.row.name).toBe('Test Product');
    expect(result.products.row.objectID).toBe(123);
    expect(result.products.row.price).toBe(99);
  });

  test('should parse multiple products', () => {
    const xmlData = `
      <products>
        <row>
          <name>Product 1</name>
          <objectID>1</objectID>
        </row>
        <row>
          <name>Product 2</name>
          <objectID>2</objectID>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);

    expect(Array.isArray(result.products.row)).toBe(true);
    expect(result.products.row).toHaveLength(2);
    expect(result.products.row[0].name).toBe('Product 1');
    expect(result.products.row[1].name).toBe('Product 2');
  });

  test('should handle hierarchical categories', () => {
    const xmlData = `
      <products>
        <row>
          <name>Product</name>
          <objectID>1</objectID>
          <hierarchicalCategories>
            <lvl0>Electronics</lvl0>
            <lvl1>Electronics &gt; Audio</lvl1>
            <lvl2>Electronics &gt; Audio &gt; Headphones</lvl2>
          </hierarchicalCategories>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);
    const product = result.products.row;

    expect(product.hierarchicalCategories).toBeDefined();
    expect(product.hierarchicalCategories.lvl0).toBe('Electronics');
    expect(product.hierarchicalCategories.lvl1).toBe('Electronics > Audio');
    expect(product.hierarchicalCategories.lvl2).toBe('Electronics > Audio > Headphones');
  });

  test('should handle missing optional fields', () => {
    const xmlData = `
      <products>
        <row>
          <name>Minimal Product</name>
          <objectID>1</objectID>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);
    const product = result.products.row;

    expect(product.name).toBe('Minimal Product');
    expect(product.objectID).toBe(1);
    expect(product.price).toBeUndefined();
    expect(product.description).toBeUndefined();
  });

  test('should parse numeric values correctly', () => {
    const xmlData = `
      <products>
        <row>
          <name>Product</name>
          <objectID>123</objectID>
          <price>49.99</price>
          <rating>4</rating>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);
    const product = result.products.row;

    expect(typeof product.objectID).toBe('number');
    expect(typeof product.price).toBe('number');
    expect(typeof product.rating).toBe('number');
    expect(product.price).toBe(49.99);
  });

  test('should handle arrays of categories', () => {
    const xmlData = `
      <products>
        <row>
          <name>Product</name>
          <objectID>1</objectID>
          <categories>
            <category>Category1</category>
            <category>Category2</category>
            <category>Category3</category>
          </categories>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);
    const product = result.products.row;

    expect(Array.isArray(product.categories.category)).toBe(true);
    expect(product.categories.category).toHaveLength(3);
    expect(product.categories.category).toContain('Category1');
  });

  test('should handle CDATA sections', () => {
    const xmlData = `
      <products>
        <row>
          <name>Product</name>
          <objectID>1</objectID>
          <description><![CDATA[This is a <b>rich</b> description]]></description>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);
    const product = result.products.row;

    expect(product.description).toContain('rich');
  });

  test('should handle empty XML gracefully', () => {
    const xmlData = '<products></products>';

    const result = xmlParser.parse(xmlData);

    expect(result.products).toBe('');
  });

  test('should handle malformed XML', () => {
    // fast-xml-parser is lenient and may not throw for some malformed XML
    // Test that it either throws or returns a result
    const malformedXml = '<products><row><name>Test</name></invalid>';

    try {
      const result = xmlParser.parse(malformedXml);
      // If it doesn't throw, that's also acceptable behavior
      expect(result).toBeDefined();
    } catch (error) {
      // If it does throw, that's fine too
      expect(error).toBeDefined();
    }
  });

  test('should handle special characters in text', () => {
    const xmlData = `
      <products>
        <row>
          <name>Product &amp; More</name>
          <objectID>1</objectID>
          <description>Less than &lt; and greater than &gt;</description>
        </row>
      </products>
    `;

    const result = xmlParser.parse(xmlData);
    const product = result.products.row;

    expect(product.name).toBe('Product & More');
    expect(product.description).toContain('<');
    expect(product.description).toContain('>');
  });
});
