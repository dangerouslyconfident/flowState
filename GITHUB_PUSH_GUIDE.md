# 🐙 FlowState — GitHub Push & Repository Guide

A comprehensive, beginner-friendly guide to initializing, committing, and pushing the **FlowState** project to GitHub from your local machine.

---

## 📋 Table of Contents
1. [Pre-Push Security & Cleanliness Checklist](#-pre-push-security--cleanliness-checklist)
2. [⚡ Quick Push Command Cheat Sheet](#-quick-push-command-cheat-sheet)
3. [Step-by-Step: First-Time Push to GitHub](#-step-by-step-first-time-push-to-github)
   - [Step 1: Create a New Repository on GitHub](#step-1-create-a-new-repository-on-github)
   - [Step 2: Configure Git User Credentials](#step-2-configure-git-user-credentials)
   - [Step 3: Stage and Commit All Changes](#step-3-stage-and-commit-all-changes)
   - [Step 4: Set the Default Branch](#step-4-set-the-default-branch)
   - [Step 5: Link Local Repo to GitHub (Remote Origin)](#step-5-link-local-repo-to-github-remote-origin)
   - [Step 6: Push Code to GitHub](#step-6-push-code-to-github)
4. [GitHub Authentication (PAT, SSH, GitHub CLI)](#-github-authentication)
   - [Option A: Personal Access Token (PAT) — Recommended](#option-a-personal-access-token-pat)
   - [Option B: GitHub CLI (`gh`) — Easiest](#option-b-github-cli-gh)
   - [Option C: SSH Key](#option-c-ssh-key)
5. [Day-to-Day Git Workflow (Future Changes)](#-day-to-day-git-workflow)
6. [Troubleshooting Common Git & GitHub Errors](#-troubleshooting-common-git--github-errors)

---

## 🛡️ Pre-Push Security & Cleanliness Checklist

Before pushing code to any public or private GitHub repository, verify that sensitive credentials and build artifacts are ignored:

1. **Check Ignored Files**:
   Run:
   ```bash
   git status --ignored
   ```
   Confirm that the following are listed under **Ignored files** (and NOT staged):
   - `server/.env` (contains your private JWT secret and local database URIs)
   - `client/node_modules/` and `server/node_modules/`
   - `client/dist/` (build artifacts)
   - `*.log` (temporary task logs)

2. **Verify Tests Pass**:
   ```bash
   npm test
   ```
   Ensure all 32 automated tests pass before committing.

---

## ⚡ Quick Push Command Cheat Sheet

If you already have a GitHub repository created at `https://github.com/<YOUR_USERNAME>/flowstate.git`:

```powershell
# 1. Stage all changes
git add .

# 2. Create commit
git commit -m "feat: complete FlowState platform with inFlowState atmosphere and deployment guides"

# 3. Ensure branch is named main
git branch -M main

# 4. Link your GitHub remote (replace with your actual GitHub username)
git remote add origin https://github.com/<YOUR_USERNAME>/flowstate.git

# 5. Push to GitHub
git push -u origin main
```

---

## 🚀 Step-by-Step: First-Time Push to GitHub

### Step 1: Create a New Repository on GitHub
1. Open your browser and navigate to [github.com/new](https://github.com/new).
2. Enter the repository details:
   - **Repository name**: `flowstate`
   - **Description**: `FlowState — MERN Productivity Platform, Daily Quota Engine, Focus Guardian & inFlowState Atmosphere`
   - **Visibility**: Choose **Public** or **Private**.
   - ⚠️ **IMPORTANT**: **Do NOT** check *"Add a README file"*, *"Add .gitignore"*, or *"Choose a license"*. (Your project already contains all of these!)
3. Click the green **Create repository** button.
4. Copy your repository HTTPS URL (e.g. `https://github.com/your-username/flowstate.git`).

---

### Step 2: Configure Git User Credentials
If this is your first time using Git on this machine, configure your identity:
```bash
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
```
*(Use the same email address associated with your GitHub account so your commits link to your profile).*

---

### Step 3: Stage and Commit All Changes
Stage all tracked and newly created files:
```powershell
git add .
```
Verify the staged files:
```powershell
git status
```
Create your commit:
```powershell
git commit -m "feat: complete FlowState MERN productivity platform with inFlowState atmosphere"
```

---

### Step 4: Set the Default Branch
Rename your branch to `main` (modern standard):
```powershell
git branch -M main
```

---

### Step 5: Link Local Repo to GitHub (Remote Origin)
Add your GitHub repository as the remote destination:
```powershell
git remote add origin https://github.com/<YOUR_USERNAME>/flowstate.git
```
*(Replace `<YOUR_USERNAME>` with your GitHub username).*

To verify the remote was added:
```powershell
git remote -v
```
You should see:
```text
origin  https://github.com/<YOUR_USERNAME>/flowstate.git (fetch)
origin  https://github.com/<YOUR_USERNAME>/flowstate.git (push)
```

> 💡 **Already added the wrong URL?** Update it anytime with:
> ```powershell
> git remote set-url origin https://github.com/<YOUR_USERNAME>/flowstate.git
> ```

---

### Step 6: Push Code to GitHub
Push your commits to the `main` branch:
```powershell
git push -u origin main
```

If prompted for credentials, follow the [GitHub Authentication](#-github-authentication) section below.

---

## 🔐 GitHub Authentication

GitHub no longer accepts your standard account password when pushing over HTTPS. Use one of these three simple options:

### Option A: Personal Access Token (PAT) — Recommended

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) (or click your profile picture > **Settings > Developer Settings > Personal access tokens > Tokens (classic)**).
2. Click **Generate new token > Generate new token (classic)**.
3. Note: `FlowState Push Token`.
4. Expiration: Choose `90 days` or `No expiration`.
5. Check the **`repo`** scope (Full control of private repositories).
6. Click **Generate token**.
7. **Copy the token immediately** (it starts with `ghp_...`).
8. When running `git push`:
   - **Username**: Your GitHub username.
   - **Password**: Paste your **Personal Access Token** (`ghp_...`).
   *(Git Credential Manager on Windows will securely save this so you only enter it once).*

---

### Option B: GitHub CLI (`gh`) — Easiest

If you have the GitHub CLI installed:
```powershell
# 1. Login interactively
gh auth login

# 2. Select: GitHub.com > HTTPS > Yes (authenticate with GitHub credentials) > Login with a web browser
# 3. Enter the one-time code shown in terminal into your browser
# 4. Now push seamlessly with zero password prompts:
git push -u origin main
```

---

### Option C: SSH Key

If you prefer SSH keys:
1. Generate an SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
2. Copy your public key:
   - Windows PowerShell:
     ```powershell
     Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
     ```
   - macOS:
     ```bash
     pbcopy < ~/.ssh/id_ed25519.pub
     ```
3. Go to [github.com/settings/keys](https://github.com/settings/keys) > click **New SSH key** > paste your key.
4. Set remote URL to SSH:
   ```bash
   git remote set-url origin git@github.com:<YOUR_USERNAME>/flowstate.git
   git push -u origin main
   ```

---

## 🔄 Day-to-Day Git Workflow

Whenever you make improvements, add features, or update documentation:

```powershell
# 1. Check what changed
git status

# 2. Stage changes
git add .

# 3. Commit with a clear message
git commit -m "docs: update deployment and feature notes"

# 4. Push to GitHub
git push
```

If collaborating with others or working across devices:
```powershell
# Pull latest changes from GitHub before starting work
git pull origin main
```

---

## 🛠️ Troubleshooting Common Git & GitHub Errors

### 1. `Support for password authentication was removed`
- **Cause**: You entered your GitHub account password instead of a Personal Access Token.
- **Fix**: Generate a Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` scope, and paste that token into the password prompt.

### 2. `fatal: remote origin already exists`
- **Cause**: A remote named `origin` is already assigned.
- **Fix**: Update the URL instead of adding:
  ```powershell
  git remote set-url origin https://github.com/<YOUR_USERNAME>/flowstate.git
  ```

### 3. `error: failed to push some refs to ... (Updates were rejected)`
- **Cause**: GitHub repository was initialized with a README or license that doesn't exist locally.
- **Fix**: Pull and rebase the remote changes first:
  ```powershell
  git pull --rebase origin main
  git push origin main
  ```

### 4. `fatal: refusing to merge unrelated histories`
- **Fix**: Force integration of initial commits:
  ```powershell
  git pull origin main --allow-unrelated-histories
  git push origin main
  ```

### 5. Accidental Commit of Secret or Large File
If you ever need to unstage a file before pushing:
```powershell
# Unstage a specific file while keeping your edits:
git restore --staged server/.env

# Or undo the last commit while keeping code:
git reset --soft HEAD~1
```
