# Release to Main

Merge current feature branch into main. **Never delete branches.**

## Steps

1. **Verify branch** - Check current branch is `frontend` or `supabase`
   - Run `git branch --show-current`
   - If on `main`: STOP and ask user to switch to a feature branch first
   - Save the branch name for later

2. **Clean up locally** - Before committing, ensure clean state
   - Run `git status` to see all changes
   - Review untracked files - remove any build artifacts, temp files
   - Check `.gitignore` covers: `node_modules/`, `.svelte-kit/`, `build/`, `.env`
   - Remove unwanted files manually if needed

3. **Commit changes** - Stage and commit
   - Run `git add <specific-files>` (prefer explicit files over `git add .`)
   - Ask user for a commit message
   - Run `git commit -m "<message>"`

4. **Push feature branch** - Push current branch to remote
   - Run `git push -u origin <branch-name>`

5. **Switch to main** - Checkout and update main
   - Run `git checkout main`
   - Run `git pull origin main`

6. **Merge feature branch** - Merge the feature branch into main
   - Run `git merge <branch-name>`
   - If conflicts: Help user resolve them before continuing

7. **Push main** - Push updated main to remote
   - Run `git push origin main`

8. **Sync feature branch** - Update feature branch with latest main
   - Run `git checkout <branch-name>`
   - Run `git merge main` (keeps feature branch up-to-date)
   - Run `git push origin <branch-name>`
   - **Do NOT delete any branches** - frontend and supabase are permanent

9. **Confirm success** - Report:
   - Local cleanup complete
   - Feature branch merged to main
   - All branches pushed and synced
   - All branches preserved
   - Ready to continue development
