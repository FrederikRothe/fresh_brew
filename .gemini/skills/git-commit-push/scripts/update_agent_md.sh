#!/bin/bash

# Get the staged changes
staged_diff=$(git diff --staged)

if [ -z "$staged_diff" ]; then
  echo "No staged changes to document."
  exit 0
fi

# Create a entry with timestamp
echo -e "\n## Commit $(date '+%Y-%m-%d %H:%M:%S')\n" >> AGENT.md
echo '```diff' >> AGENT.md
echo "$staged_diff" >> AGENT.md
echo '```' >> AGENT.md

echo "Successfully updated AGENT.md with staged changes."
