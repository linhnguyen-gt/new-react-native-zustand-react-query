#!/bin/bash

# Test environment script
echo "=== Testing Environment Setup ==="

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Error: package.json not found at $PROJECT_ROOT"
    exit 1
fi

echo "✅ Found package.json at $PROJECT_ROOT"

# Check for environment files
echo ""
echo "=== Checking Environment Files ==="

ENV_FILES=(".env" ".env.staging" ".env.production")
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$env_file" ]; then
        echo "✅ Found $env_file"
    else
        echo "❌ Missing $env_file"
    fi
done

# Check for Info.plist
echo ""
echo "=== Checking Info.plist ==="
INFO_PLIST="$PROJECT_ROOT/ios/NewReactNativeZustandRNQ/Info.plist"
if [ -f "$INFO_PLIST" ]; then
    echo "✅ Found Info.plist at $INFO_PLIST"
else
    echo "❌ Missing Info.plist at $INFO_PLIST"
fi

# Create a test .env file if it doesn't exist
echo ""
echo "=== Creating Test Environment File ==="
TEST_ENV_FILE="$PROJECT_ROOT/.env.test"
cat > "$TEST_ENV_FILE" << EOF
# Test environment file
APP_NAME="TestApp"
VERSION_CODE="999"
VERSION_NAME="9.9.9"
EOF

echo "✅ Created test environment file: $TEST_ENV_FILE"

# Test set_version.sh with test environment
echo ""
echo "=== Testing set_version.sh with test environment ==="
export ENV_FILE="$TEST_ENV_FILE"
bash "$SCRIPT_DIR/set_version.sh" "development"

# Clean up test file
rm "$TEST_ENV_FILE"
echo "✅ Cleaned up test environment file"

echo ""
echo "=== Environment Test Completed ==="

