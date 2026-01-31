# Expert Agent Selection

Help the user choose the right expert agent(s) for their issue.

## Steps

1. **Ask the issue** - Ask the user: "What issue are you trying to solve?"

2. **Analyze and recommend** - Based on their response, suggest relevant agents:

## Available Agents

| Agent | Use When |
|-------|----------|
| `svelte-sveltekit-expert` | Svelte 5 runes, components, reactivity, SvelteKit routing, load functions, form actions |
| `supabase-expert` | Database schema, auth, RLS policies, storage, realtime subscriptions, edge functions |
| `typescript-expert` | Type errors, generics, utility types, type-safe patterns, interface design |
| `html-webapi-expert` | Semantic markup, accessibility, DOM APIs, Fetch, localStorage, browser events |
| `css-expert` | Layouts (grid/flexbox), responsive design, custom properties, animations |

## Example Recommendations

- "Component not re-rendering" → `svelte-sveltekit-expert`
- "How to structure my database" → `supabase-expert` + `typescript-expert`
- "Form validation with database" → `svelte-sveltekit-expert` + `supabase-expert`
- "Styling a responsive card grid" → `css-expert` + `html-webapi-expert`
- "Type error in my store" → `typescript-expert` + `svelte-sveltekit-expert`
- "Auth flow with protected routes" → `supabase-expert` + `svelte-sveltekit-expert`

3. **Invoke agents** - Use the Task tool to spawn the recommended agent(s) with the user's issue as context
