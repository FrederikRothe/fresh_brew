---
name: git-commit-push
description: Commits and pushes staged changes while automatically documenting them in AGENT.md. Use when the user wants to commit changes and ensure the project's record is up-to-date.
---

# Git Commit and Push with Documentation

This skill streamlines the workflow of committing and pushing changes, ensuring every commit is documented in `AGENT.md` with the staged diff.

## Workflow

1. **Verify Staged Changes**: Ensure all relevant changes are staged with `git add`.
2. **Update AGENT.md**: Run the documentation script to append staged changes to `AGENT.md`.
3. **Stage AGENT.md**: Stage the updated `AGENT.md` itself.
4. **Commit**: Perform a standard commit with a descriptive message.
5. **Push**: Push the changes to the remote repository.

## Commands

To update the documentation:
```bash
./skills/git-commit-push/scripts/update_agent_md.sh
```

## Implementation Guide

1. Run the script: `./skills/git-commit-push/scripts/update_agent_md.sh`.
2. Run `git add AGENT.md` to include the documentation change in the commit.
3. Use `git commit -m "..."` to commit the changes.
4. Use `git push` to push to the current branch.
