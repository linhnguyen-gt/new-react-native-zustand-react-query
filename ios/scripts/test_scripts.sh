#!/bin/bash

# Test script to verify iOS scripts are working
echo "=== Testing iOS Scripts ==="

# Test set_version.sh directly
echo "Testing set_version.sh..."
bash "$(dirname "$0")/set_version.sh" "development"

echo ""
echo "Testing set_version.sh with staging..."
bash "$(dirname "$0")/set_version.sh" "staging"

echo ""
echo "Testing set_version.sh with production..."
bash "$(dirname "$0")/set_version.sh" "production"

echo ""
echo "=== All tests completed ==="
