<?php

namespace Tests;

use PHPUnit\Framework\TestCase;

// Define constant to prevent index.php from auto-executing
if (!defined('PHPUNIT_RUNNING')) {
    define('PHPUNIT_RUNNING', true);
}

// Include the RateLimiter class since it's in index.php
require_once __DIR__ . '/../index.php';

class RateLimiterTest extends TestCase
{
    public function testRateLimiterAllowsCallsWithinLimit()
    {
        $rateLimiter = new \RateLimiter(5, 1.0); // 5 calls per second
        
        $startTime = microtime(true);
        
        // Make 5 calls - should not sleep
        for ($i = 0; $i < 5; $i++) {
            $rateLimiter->wait();
        }
        
        $duration = microtime(true) - $startTime;
        
        // Should complete almost instantly (< 0.1 seconds)
        $this->assertLessThan(0.1, $duration, "Rate limiter should not sleep for calls within limit");
    }
    
    public function testRateLimiterEnforcesLimit()
    {
        $rateLimiter = new \RateLimiter(2, 1.0); // 2 calls per second
        
        // Make 2 calls - should be instant
        $rateLimiter->wait();
        $rateLimiter->wait();
        
        $startTime = microtime(true);
        
        // Third call should sleep
        $rateLimiter->wait();
        
        $duration = microtime(true) - $startTime;
        
        // Should have slept for approximately 1 second
        $this->assertGreaterThan(0.9, $duration, "Rate limiter should enforce limit by sleeping");
        $this->assertLessThan(1.2, $duration, "Sleep duration should be approximately 1 second");
    }
    
    public function testRateLimiterTracksCallsCorrectly()
    {
        $rateLimiter = new \RateLimiter(3, 1.0); // 3 calls per second
        
        // Make 3 calls
        for ($i = 0; $i < 3; $i++) {
            $rateLimiter->wait();
        }
        
        // Wait for time window to pass
        sleep(1.1);
        
        $startTime = microtime(true);
        
        // Next 3 calls should be instant since old calls expired
        for ($i = 0; $i < 3; $i++) {
            $rateLimiter->wait();
        }
        
        $duration = microtime(true) - $startTime;
        
        // Should complete almost instantly
        $this->assertLessThan(0.1, $duration, "Rate limiter should reset after time window");
    }
    
    public function testRateLimiterWithCustomPeriod()
    {
        $rateLimiter = new \RateLimiter(5, 0.5); // 5 calls per 0.5 seconds
        
        // Make 5 calls
        for ($i = 0; $i < 5; $i++) {
            $rateLimiter->wait();
        }
        
        $startTime = microtime(true);
        
        // 6th call should sleep for ~0.5 seconds
        $rateLimiter->wait();
        
        $duration = microtime(true) - $startTime;
        
        // Should have slept for approximately 0.5 seconds
        $this->assertGreaterThan(0.4, $duration, "Rate limiter should work with custom period");
        $this->assertLessThan(0.7, $duration, "Sleep duration should match custom period");
    }
    
    public function testRateLimiterDefaultValues()
    {
        $rateLimiter = new \RateLimiter(); // Default: 10 calls per second
        
        $startTime = microtime(true);
        
        // Make 10 calls - should not sleep
        for ($i = 0; $i < 10; $i++) {
            $rateLimiter->wait();
        }
        
        $duration = microtime(true) - $startTime;
        
        // Should complete almost instantly
        $this->assertLessThan(0.1, $duration, "Rate limiter should use default values correctly");
    }
}
