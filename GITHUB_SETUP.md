# GitHub Repository Setup Guide

This guide will help you push your VISA Declaration Viewer project to GitHub.

## Steps to Push Your Project to GitHub

### 1. Repository Created

The repository has been created at:

```
https://github.com/ccmanuelf/visa-viewer
```

### 2. Update Remote URL and Push Your Code

Since the repository has been created at a different URL than the current remote, you need to update the remote URL first:

```bash
git remote set-url origin https://github.com/ccmanuelf/visa-viewer.git
```

Then push your code to the repository:

```bash
git push -u origin main
```

This will push your code to the GitHub repository.

## Verification

After pushing your code, visit your GitHub repository at:

```
https://github.com/ccmanuelf/visa-viewer
```

## Notes

- Your `.env` file containing sensitive API keys is already excluded from Git via the `.gitignore` file
- The `.env.example` file will be pushed to GitHub as a template for other users
- All your code, documentation, and configuration files will be available on GitHub