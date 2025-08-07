CREATE DATABASE IF NOT EXISTS mbfc;
USE mbfc;

-- MBFC Sources table
CREATE TABLE mbfc_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    mbfc_url VARCHAR(500),
    bias VARCHAR(100),
    country VARCHAR(100),
    factual_reporting VARCHAR(50),
    media_type VARCHAR(100),
    source_url VARCHAR(255),
    credibility VARCHAR(50),
    source_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis Results table
CREATE TABLE analysis_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    community_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    bias_score DECIMAL(3,1),
    confidence DECIMAL(3,2),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signal_breakdown JSON
);

-- Create indexes
CREATE INDEX idx_source_url ON mbfc_sources(source_url);
CREATE INDEX idx_community_platform ON analysis_results(community_name, platform);
