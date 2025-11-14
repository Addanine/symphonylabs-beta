#!/bin/bash

# Wrapper script to run the shipping notifications cron job
# This script loads the environment variables and runs the TypeScript script

# Navigate to the project directory
cd /root/symphonylabs

# Load environment variables from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the notification script
npx tsx scripts/send-scheduled-shipping-notifications.ts >> /var/log/shipping-notifications.log 2>&1
