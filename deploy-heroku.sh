#!/bin/bash

# Exit on error
set -e

# Check for Heroku CLI
if ! command -v heroku &> /dev/null
then
    echo "Heroku CLI not found. Please install it first."
    exit 1
fi

# Login to Heroku (if not already logged in)
heroku whoami &> /dev/null || heroku login

# Create Procfile if it doesn't exist
if [ ! -f Procfile ]; then
    echo 'web: npx tsx index.ts --transport http --port $PORT' > Procfile
    echo "Created Procfile."
fi

# Set Heroku remote to existing app 'slack-mcp'
heroku git:remote -a slack-mcp

# Ensure Node.js buildpack is set
heroku buildpacks:set heroku/nodejs -a slack-mcp || true

# Commit Procfile if needed
if [ -n "$(git status --porcelain Procfile)" ]; then
    git add Procfile
    git commit -m "Update Procfile for Heroku deployment"
fi

# Commit package.json if needed (for tsx dependency)
if [ -n "$(git status --porcelain package.json)" ]; then
    git add package.json
    git commit -m "Add tsx dependency for TypeScript execution"
fi

# Set the branch to deploy
BRANCH_TO_DEPLOY="separate-transport-per-request"

# Push to Heroku
git push heroku $BRANCH_TO_DEPLOY:main

echo "Deployment to Heroku app 'slack-mcp' initiated."