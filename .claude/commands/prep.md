# Prepare Development Environment

Execute these steps in order:

1. **Clear terminal** - Run `clear`

2. **Read project context** - Read the PROJECT_GUIDE.md file to understand the project structure, tech stack, and current phase

3. **Check dev server status** - Check if anything is running on port 5173:
   - Run `lsof -i :5173` to see if the port is in use

4. **Ensure dev server is running**:
   - If port 5173 is NOT in use: Start the dev server with `npm run dev`
   - If port 5173 IS in use but not by our Vite server: Kill the process and restart with `npm run dev`
   - If already running correctly: Confirm it's ready

5. **Report status** - Confirm the environment is ready with:
   - Dev server URL: http://localhost:5173
   - Project context loaded
   - Ready for development

6. **Select branch** - Ask the user which branch they want to work on:
   - `frontend` - UI components, routes, styling
   - `supabase` - Database, auth, backend integration

   Switch to the selected branch with `git checkout <branch>`
