---
name: git-commit-push
description: Commits and pushes staged changes while ensuring AGENT.md is updated to reflect any architectural or functional changes. Use when committing to keep project documentation in sync with the codebase.
---

# Git Commit and Push with Documentation Review

This skill ensures that `AGENT.md` remains a concise and accurate reflection of the current codebase state by reviewing staged changes before committing.

## Workflow

1. **Verify Staged Changes**: Ensure all relevant changes are staged with `git add`.
2. **Review for Impact**: Analyze the staged diff to identify changes that affect:
    - Core technologies or versions.
    - Project architecture or file structure.
    - Development conventions (storage, auth, visual states).
    - Building, running, or testing commands.
3. **Update AGENT.md**: If impacts are found, surgically update `AGENT.md`.
    - **Constraint**: Keep `AGENT.md` short and focused (< 200 lines).
    - **No Change Logs**: Do not append commit history or diffs. Update the *current state* descriptions only.
4. **Stage AGENT.md**: Stage the updated `AGENT.md` itself.
5. **Commit**: Perform a standard commit with a descriptive message.
6. **Push**: Push the changes to the remote repository.

## Implementation Guide

- Use `git diff --staged` to review changes.
- Read `AGENT.md` to identify sections requiring updates.
- Use `replace` or `write_file` to keep `AGENT.md` concise.
- Always stage `AGENT.md` if it was modified before committing.
