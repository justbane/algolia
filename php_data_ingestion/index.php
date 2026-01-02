<?php
/**
 * PHP Data Ingestion Service
 * ===========================
 * 
 * Fetches product data from PHP/SQL API and uploads to Algolia.
 *  - Respects API constraints: 1000 records/request, 10 req/s max
 */

require_once __DIR__ . '/vendor/autoload.php';

use Algolia\AlgoliaSearch\SearchClient;
use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Dotenv\Dotenv;

/**
 * Rate Limiter for PHP API calls
 */
class RateLimiter {
    private $maxCalls;
    private $period;
    private $calls = [];
    
    /**
     * @param int $maxCalls Maximum number of calls allowed
     * @param float $period Time period in seconds
     */
    public function __construct($maxCalls = 10, $period = 1.0) {
        $this->maxCalls = $maxCalls;
        $this->period = $period;
    }
    
    /**
     * Wait if necessary to respect rate limit
     */
    public function wait() {
        $now = microtime(true);
        
        // Remove old calls outside time window
        $this->calls = array_filter($this->calls, function($callTime) use ($now) {
            return $now - $callTime < $this->period;
        });
        
        // If at limit, sleep
        if (count($this->calls) >= $this->maxCalls) {
            $oldestCall = min($this->calls);
            $sleepTime = $this->period - ($now - $oldestCall);
            if ($sleepTime > 0) {
                echo "[RATE LIMIT] Sleeping for " . round($sleepTime, 2) . "s\n";
                usleep($sleepTime * 1000000);
                $this->calls = [];
            }
        }
        
        // Record this call
        $this->calls[] = microtime(true);
    }
}

/**
 * PHP API Ingestion Service
 */
class PHPAPIIngestion {
    private $httpClient;
    private $algoliaClient;
    private $algoliaIndex;
    private $rateLimiter;
    private $config;
    private $stats = [
        'api_requests' => 0,
        'api_errors' => 0,
        'products_fetched' => 0,
        'products_uploaded' => 0,
        'upload_errors' => 0
    ];
    
    /**
     * Initialize the ingestion service
     */
    public function __construct() {
        // Load environment variables
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
        $dotenv->required(['ALGOLIA_APP_ID', 'ALGOLIA_API_KEY', 'ALGOLIA_INDEX_NAME']);
        
        // Configuration
        $this->config = [
            'php_api_url' => $_ENV['PHP_API_URL'] ?? 'http://internal-api.local',
            'php_api_timeout' => (int)($_ENV['PHP_API_TIMEOUT'] ?? 30),
            'max_results_per_request' => (int)($_ENV['MAX_RESULTS_PER_REQUEST'] ?? 1000),
            'max_requests_per_second' => (int)($_ENV['MAX_REQUESTS_PER_SECOND'] ?? 10),
            'algolia_batch_size' => (int)($_ENV['ALGOLIA_BATCH_SIZE'] ?? 10000),
        ];
        
        // Initialize HTTP client for PHP API
        $this->httpClient = new HttpClient([
            'base_uri' => $this->config['php_api_url'],
            'timeout' => $this->config['php_api_timeout'],
        ]);
        
        // Initialize rate limiter
        $this->rateLimiter = new RateLimiter(
            $this->config['max_requests_per_second'],
            1.0
        );
        
        // Initialize Algolia client
        $this->algoliaClient = SearchClient::create(
            $_ENV['ALGOLIA_APP_ID'],
            $_ENV['ALGOLIA_API_KEY']
        );
        $this->algoliaIndex = $this->algoliaClient->initIndex($_ENV['ALGOLIA_INDEX_NAME']);
        
        echo "PHP API Ingestion Service Initialized\n";
        echo "========================================\n";
        echo "PHP API URL: {$this->config['php_api_url']}\n";
        echo "Rate Limit: {$this->config['max_requests_per_second']} req/s\n";
        echo "Batch Size: {$this->config['max_results_per_request']} records/request\n";
        echo "Algolia Index: {$_ENV['ALGOLIA_INDEX_NAME']}\n";
        echo "========================================\n\n";
    }
    
    /**
     * Main execution: fetch from PHP API and upload to Algolia
     */
    public function run() {
        $startTime = microtime(true);
        
        try {
            echo "Fetching products from PHP API...\n";
            $products = $this->fetchAllProducts();
            
            echo "Uploading {$this->stats['products_fetched']} products to Algolia...\n";
            $this->uploadToAlgolia($products);
            
            $duration = microtime(true) - $startTime;
            $this->printSummary($duration);
            
        } catch (Exception $e) {
            echo "[ERROR] Ingestion failed: {$e->getMessage()}\n";
            echo "Stack trace:\n{$e->getTraceAsString()}\n";
            exit(1);
        }
    }
    
    /**
     * Fetch all products from PHP API with pagination and rate limiting
     * 
     * @return array List of products
     */
    private function fetchAllProducts() {
        $allProducts = [];
        $offset = 0;
        $page = 1;
        
        while (true) {
            echo "  - Fetching page $page (offset: $offset)...\n";
            
            // Respect rate limit
            $this->rateLimiter->wait();
            
            // Per-page retry logic with exponential backoff
            $maxRetries = 3;
            $retryCount = 0;
            $success = false;
            
            while ($retryCount <= $maxRetries) {
                try {
                    $batch = $this->fetchBatch($offset);
                    $batchCount = count($batch);
                    
                    if ($batchCount === 0) {
                        echo "  - No more results\n";
                        $success = true;
                        break 2; // Break outer while loop
                    }
                    
                    $allProducts = array_merge($allProducts, $batch);
                    $this->stats['products_fetched'] += $batchCount;
                    
                    echo "  - Retrieved $batchCount products (Total: {$this->stats['products_fetched']})\n";
                    
                    // If we got fewer than max, we've reached the end
                    if ($batchCount < $this->config['max_results_per_request']) {
                        echo "  - Received partial batch, end of data\n";
                        $success = true;
                        break 2; // Break outer while loop
                    }
                    
                    // Success - exit retry loop
                    $success = true;
                    break;
                    
                } catch (Exception $e) {
                    $retryCount++;
                    $this->stats['api_errors']++;
                    
                    echo "  - [ERROR] Failed to fetch page $page (attempt $retryCount/" . ($maxRetries + 1) . "): {$e->getMessage()}\n";
                    
                    if ($retryCount > $maxRetries) {
                        throw new Exception("Failed to fetch page $page after " . ($maxRetries + 1) . " attempts");
                    }
                    
                    // EXPONENTIAL BACKOFF: 2^retryCount seconds + random jitter
                    $baseDelay = pow(2, $retryCount); // 2, 4, 8 seconds
                    $jitter = (float)rand(0, 1000) / 1000.0; // 0-1 second random jitter
                    $sleepTime = $baseDelay + $jitter;
                    
                    echo "  - Retrying in " . round($sleepTime, 2) . "s (exponential backoff)...\n";
                    usleep((int)($sleepTime * 1000000));
                }
            }
            
            // Move to next page if successful
            if ($success) {
                $offset += $this->config['max_results_per_request'];
                $page++;
            } else {
                // This shouldn't happen, but just in case
                break;
            }
        }
        
        return $allProducts;
    }
    
    /**
     * Fetch a single batch from PHP API
     * 
     * @param int $offset Starting offset
     * @return array Batch of products
     */
    private function fetchBatch($offset) {
        $this->stats['api_requests']++;
        
        // DEMO/BULK LOAD MODE: Read from sample file
        // In production, replace with actual API call
        if (!isset($_ENV['PHP_API_URL']) || 
            $_ENV['PHP_API_URL'] === 'DEMO' || 
            $_ENV['PHP_API_URL'] === 'PRODUCT_LOAD') {
            return $this->fetchFromSampleFile($offset);
        }
        
        // PRODUCTION: Make actual HTTP request
        try {
            $response = $this->httpClient->get('/api/products', [
                'query' => [
                    'limit' => $this->config['max_results_per_request'],
                    'offset' => $offset
                ]
            ]);
            
            $data = json_decode($response->getBody(), true);
            return $data ?? [];
            
        } catch (GuzzleException $e) {
            throw new Exception("PHP API request failed: {$e->getMessage()}");
        }
    }
    
    /**
     * Demo mode: Read from sample file
     * 
     * @param int $offset Starting offset
     * @return array Batch of products
     */
    private function fetchFromSampleFile($offset) {
        if ($_ENV['PHP_API_URL'] === 'DEMO') {
            $sampleFile = __DIR__ . '/api response.json';
            $mode = 'DEMO MODE';
        } else if ($_ENV['PHP_API_URL'] === 'PRODUCT_LOAD') {
            $sampleFile = __DIR__ . '/expected algolia payload.json';
            $mode = 'BULK LOAD';
        } else {
            throw new Exception("Invalid PHP_API_URL: " . $_ENV['PHP_API_URL']);
        }
        
        if (!file_exists($sampleFile)) {
            echo "  - [$mode] Sample file not found: $sampleFile\n";
            return [];
        }
        
        $data = json_decode(file_get_contents($sampleFile), true);
        
        if ($data === null) {
            throw new Exception("Failed to parse JSON from: $sampleFile");
        }
        
        // Simulate pagination
        $batch = array_slice($data, $offset, $this->config['max_results_per_request']);
        
        if (!empty($batch)) {
            echo "  - [$mode] Read " . count($batch) . " products from sample file\n";
        }
        
        return $batch;
    }
    
    /**
     * Upload products to Algolia in batches
     * 
     * @param array $products List of products to upload
     */
    private function uploadToAlgolia($products) {
        if (empty($products)) {
            echo "  - No products to upload\n";
            return;
        }
        
        try {
            // Algolia can handle up to 10,000 records per batch
            $batches = array_chunk($products, $this->config['algolia_batch_size']);
            $batchCount = count($batches);
            
            echo "  - Uploading in $batchCount batch(es)\n";
            
            foreach ($batches as $index => $batch) {
                $batchNum = $index + 1;
                echo "  - Uploading batch $batchNum/$batchCount (" . count($batch) . " records)...\n";
                
                $response = $this->algoliaIndex->saveObjects($batch);
                $this->stats['products_uploaded'] += count($batch);
                
                // Wait for indexing to complete (optional, for demo purposes)
                // Response structure: array with 'objectIDs' and 'taskID' keys
                if ($batchNum === $batchCount) {
                    // Handle different response structures (v3.x returns array with multiple responses)
                    if (is_array($response)) {
                        // Get taskID from response (could be direct or nested)
                        $taskId = isset($response['taskID']) ? $response['taskID'] : null;
                        
                        // If response is array of responses, get last one
                        if (!$taskId && isset($response[0]['taskID'])) {
                            $taskId = end($response)['taskID'];
                        }
                        
                        if ($taskId) {
                            $this->algoliaIndex->waitTask($taskId);
                            echo "  - Indexing complete\n";
                        }
                    }
                }
            }
            
            echo "  - Successfully uploaded {$this->stats['products_uploaded']} products\n";
            
        } catch (Exception $e) {
            $this->stats['upload_errors']++;
            throw new Exception("Algolia upload failed: {$e->getMessage()}");
        }
    }
    
    /**
     * Print execution summary
     * 
     * @param float $duration Execution time in seconds
     */
    private function printSummary($duration) {
        echo "\n========================================\n";
        echo "INGESTION COMPLETE\n";
        echo "========================================\n";
        echo "Duration: " . round($duration, 2) . "s\n";
        echo "API Requests: {$this->stats['api_requests']}\n";
        echo "API Errors: {$this->stats['api_errors']}\n";
        echo "Products Fetched: {$this->stats['products_fetched']}\n";
        echo "Products Uploaded: {$this->stats['products_uploaded']}\n";
        echo "Upload Errors: {$this->stats['upload_errors']}\n";
        
        if ($this->stats['products_fetched'] > 0) {
            $avgReqPerSec = $this->stats['api_requests'] / $duration;
            echo "Avg Request Rate: " . round($avgReqPerSec, 2) . " req/s\n";
        }
        
        echo "========================================\n";
    }
}

// Run the service only if this file is executed directly (not included for testing)
if (!defined('PHPUNIT_RUNNING')) {
    try {
        $service = new PHPAPIIngestion();
        $service->run();
        exit(0);
    } catch (Exception $e) {
        echo "\n[FATAL ERROR] {$e->getMessage()}\n";
        exit(1);
    }
}
