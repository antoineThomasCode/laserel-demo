# Deploy laserel-demo to production

Deploy the app to laserel.cohorte.tech (Hostinger VPS with Docker + Traefik).

## How it works

The VPS container does a `git clone` from GitHub on startup. So deploying = push to GitHub + restart the container.

## Steps

1. **Commit & push** any uncommitted changes to `origin/main` (ask user for commit message if needed)
2. **Restart the Docker project** on the VPS using the Hostinger MCP tool:
   - VPS ID: `1108058`
   - Project name: `traefik`
   - Use `mcp__hostinger-cohorte__VPS_restartProjectV1` with `virtualMachineId: 1108058` and `projectName: "traefik"`
3. **Verify** the restart action was accepted (check the action state is "sent")
4. Tell the user the deploy is in progress and the site will be live in ~30 seconds at https://laserel.cohorte.tech

## Important notes

- The project `traefik` contains BOTH the Traefik reverse proxy AND the laserel-demo container. Restarting the project restarts both.
- The container runs `git clone https://github.com/antoineThomasCode/laserel-demo.git` then `npm install && node server.js`
- Data is persisted in a Docker volume `laserel-data` mounted at `/app/data` - it survives restarts
- Domain: `laserel.cohorte.tech` (HTTPS via Let's Encrypt)
