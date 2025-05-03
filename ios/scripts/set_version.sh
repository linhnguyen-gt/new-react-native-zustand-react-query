# Get the environment from configuration name
echo "Debug: Raw CONFIGURATION value: ${CONFIGURATION}"

if [[ "${CONFIGURATION}" == *"Product"* ]]; then
  ENV_FILE="${SRCROOT}/../.env.production"
  echo "Debug: Matched Product configuration"
elif [[ "${CONFIGURATION}" == *"Staging"* ]]; then
  ENV_FILE="${SRCROOT}/../.env.staging"
  echo "Debug: Matched Staging configuration"
else
  ENV_FILE="${SRCROOT}/../.env"
  echo "Debug: Using default configuration"
fi

# Ensure INFOPLIST_FILE is set
if [ -z "$INFOPLIST_FILE" ]; then
    echo "Error: INFOPLIST_FILE not set"
    exit 0
fi

INFO_PLIST="${SRCROOT}/${INFOPLIST_FILE}"

echo "=== Environment Setup ==="
echo "CONFIGURATION: ${CONFIGURATION}"
echo "Using env file: ${ENV_FILE}"
echo "Info.plist path: ${INFO_PLIST}"

# Default values in case env file is missing
VERSION_CODE="1"
VERSION_NAME="1.0.0"
APP_NAME=""

# Try to read from env file if it exists
if [ -f "$ENV_FILE" ]; then
    echo "Reading from env file..."
    
    # Read VERSION_CODE
    VERSION_CODE_LINE=$(grep "^VERSION_CODE=" "$ENV_FILE" || echo "")
    if [ ! -z "$VERSION_CODE_LINE" ]; then
        VERSION_CODE=$(echo "$VERSION_CODE_LINE" | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
    fi
    
    # Read VERSION_NAME
    VERSION_NAME_LINE=$(grep "^VERSION_NAME=" "$ENV_FILE" || echo "")
    if [ ! -z "$VERSION_NAME_LINE" ]; then
        VERSION_NAME=$(echo "$VERSION_NAME_LINE" | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
    fi

    # Read APP_NAME 
    APP_NAME_LINE=$(grep "^APP_NAME=" "$ENV_FILE" || echo "")
    if [ ! -z "$APP_NAME_LINE" ]; then
        APP_NAME=$(echo "$APP_NAME_LINE" | sed 's/^APP_NAME=//' | sed 's/^"//' | sed 's/"$//')
    fi

else
    echo "Warning: Environment file not found, using default values"
fi

echo "Using versions - Code: $VERSION_CODE, Name: $VERSION_NAME, App Name: $APP_NAME"

# Update Info.plist if it exists
if [ -f "$INFO_PLIST" ]; then
    echo "Updating Info.plist..."
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION_CODE" "$INFO_PLIST" || true
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION_NAME" "$INFO_PLIST" || true
    if [ ! -z "$APP_NAME" ]; then
        /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$INFO_PLIST" || true
    fi
    echo "Info.plist update completed"
else
    echo "Warning: Info.plist not found at $INFO_PLIST"
fi 