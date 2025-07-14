-- shared/database/init.sql
-- This runs when PostgreSQL container starts for the first time

-- Create additional databases if needed
CREATE DATABASE legato_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE legato_dev TO developer;
GRANT ALL PRIVILEGES ON DATABASE legato_test TO developer;

-- Create initial schema (Agent 1 will build on this)
\c legato_dev;

-- Enable extensions in the main database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Set up full text search configuration
CREATE TEXT SEARCH CONFIGURATION legato_search (COPY = english);