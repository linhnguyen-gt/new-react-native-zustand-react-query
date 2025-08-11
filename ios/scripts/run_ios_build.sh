#!/bin/bash

# Simple wrapper script to run set_version.sh before iOS build
echo "=== iOS Build Script Wrapper ==="

# Get environment from command line
ENV=${1:-"development"}
echo "Environment: $ENV"

# Set the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Run set_version script with environment parameter
echo "Running set_version script for environment: $ENV"
bash "$SCRIPT_DIR/set_version.sh" "$ENV"

if [ $? -eq 0 ]; then
    echo "set_version script completed successfully"
else
    echo "Warning: set_version script had issues, but continuing..."
fi

echo "=== iOS Build Script Wrapper Completed ==="
