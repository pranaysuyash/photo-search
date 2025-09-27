# Git Workflow Reference - Photo Search Project

## Repository Setup Overview

This document serves as a reference for the Git workflow used in the Photo Search project. It covers the initial setup, branch structure, and procedures for working with the repository.

## Initial Repository Setup

### 1. Repository Initialization
```bash
cd /Users/pranay/Projects/adhoc_projects/photo-search
git init
```

### 2. Branch Creation
Three branches were created to organize the development:

1. **main**: Primary branch containing all project files
2. **classic**: Dedicated branch for the Classic implementation
3. **intent-first**: Dedicated branch for the Intent-First implementation

### 3. Branch Setup Commands
```bash
# Create and switch to main branch
git checkout -b main

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Photo Search project with both Classic and Intent-First implementations"

# Create classic branch
git checkout -b classic

# Switch back to main
git checkout main

# Create intent-first branch
git checkout -b intent-first
```

### 4. Remote Repository Configuration
```bash
# Add remote origin
git remote add origin https://github.com/pranaysuyash/photo-search.git

# Push all branches
git push -u origin main classic intent-first
```

## Branch Structure Details

### Main Branch
- **Purpose**: Contains all project files including both implementations
- **Content**: 
  - Documentation files (README.md, TODO.md, ROADMAP.md, etc.)
  - Both implementation folders (photo-search-classic and photo-search-intent-first)
  - Shared assets (e2e_data, landing pages)
  - Configuration files (docker-compose.yml, pyproject.toml)
  - GitHub workflows (.github/workflows)

### Classic Branch
- **Purpose**: Dedicated development branch for the Classic implementation
- **Content**: 
  - All files from the photo-search-classic directory
  - Shared documentation and assets
  - Configuration files
- **Workflow**: Used for maintenance and development of the Classic version

### Intent-First Branch
- **Purpose**: Dedicated development branch for the Intent-First implementation
- **Content**: 
  - All files from the photo-search-intent-first directory
  - Shared documentation and assets
  - Configuration files
- **Workflow**: Used for development and enhancement of the Intent-First version

## Git Ignore Configuration

The `.gitignore` file includes exclusions for:
- Python cache and compiled files (`__pycache__/`, `*.py[cod]`)
- Virtual environments (`.venv/`, `venv/`, `env/`)
- IDE specific files (`.vscode/`, `.idea/`)
- OS generated files (`.DS_Store`, `Thumbs.db`)
- Project specific ignores (`.photo_index/`, `.thumbs/`)
- Log files and temporary files (`*.log`, `*.tmp`)

## Working with the Repository

### Switching Between Branches
```bash
# Switch to main branch
git checkout main

# Switch to classic branch
git checkout classic

# Switch to intent-first branch
git checkout intent-first
```

### Making Changes
1. Switch to the appropriate branch
2. Make your changes
3. Stage changes: `git add .` or `git add <specific-files>`
4. Commit changes: `git commit -m "Descriptive commit message"`
5. Push to remote: `git push origin <branch-name>`

### Merging Changes
```bash
# Merge classic into main
git checkout main
git merge classic

# Merge intent-first into main
git checkout main
git merge intent-first
```

### Pulling Latest Changes
```bash
# Pull latest from remote branch
git pull origin <branch-name>
```

## Pushing to Remote Repository

### Push Current Branch
```bash
# Push current branch to remote
git push origin HEAD

# Or push specific branch
git push origin <branch-name>
```

### Push All Branches
```bash
# Push all branches
git push origin main classic intent-first
```

### Set Upstream Tracking
```bash
# Set upstream for current branch
git push -u origin <branch-name>
```

## Repository Status Commands

### Check Current Branch
```bash
git branch
```

### Check All Branches (Local and Remote)
```bash
git branch -a
```

### Check Repository Status
```bash
git status
```

### View Commit History
```bash
git log --oneline
```

## Best Practices

1. **Branch Selection**: 
   - Work on `classic` branch for Classic implementation changes
   - Work on `intent-first` branch for Intent-First implementation changes
   - Use `main` for documentation updates and shared assets

2. **Commit Messages**: 
   - Use descriptive, concise commit messages
   - Follow conventional commit format when possible

3. **Regular Syncing**: 
   - Pull latest changes before starting work
   - Push changes frequently to avoid conflicts

4. **Code Reviews**: 
   - Use pull requests for significant changes
   - Review changes before merging to main

## Remote Repository Information

- **URL**: https://github.com/pranaysuyash/photo-search.git
- **Hosting Platform**: GitHub
- **Default Branch**: main
- **Protected Branches**: None (all branches are currently writable)

## Troubleshooting Common Issues

### If Remote Tracking is Lost
```bash
git branch --set-upstream-to=origin/<branch-name> <branch-name>
```

### If There Are Merge Conflicts
```bash
# Resolve conflicts in files
# Add resolved files
git add <resolved-files>
# Complete merge
git commit
```

### If You Need to Reset Local Branch to Match Remote
```bash
git fetch origin
git reset --hard origin/<branch-name>
```

This reference document should be used whenever working with the Git repository to ensure consistent workflows and proper branch management.