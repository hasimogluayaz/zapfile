# ZapFile Office API

Server-side Word / Excel / PowerPoint / HTML → PDF with LibreOffice, for the tools in
`src/components/office/OfficeToPdfTool.tsx` (fast mode). Files are converted in a temp directory
and deleted right after; nothing is stored or logged. If the API is unreachable, the site falls back
to the in-browser engine.

- `server.mjs`: dependency-free Node HTTP server (`POST /convert`, `GET /health`). Queue, per-IP rate
  limit, size limit, timeout, CORS allow-list, macros disabled in the LibreOffice profile.
- `Dockerfile`: Ubuntu 24.04 + LibreOffice (no GUI) + fonts compatible with Office documents.
- `docker-compose.yml`: the API on an internal network (no internet access) behind Caddy (HTTPS).
- `setup.sh`: one-time server setup (swap, Docker, firewall, automatic security updates, start).

## Install on a fresh Ubuntu server

1. DNS: add an `A` record `api` → the server's IPv4 (and `AAAA` → IPv6 if you like).
2. On the server (as root):

   ```bash
   curl -fsSL https://raw.githubusercontent.com/hasimogluayaz/zapfile/main/server/office-api/setup.sh | bash -s api.zapfile.xyz main
   ```

3. Check: `curl https://api.zapfile.xyz/health` → `{"ok":true,...}`
4. Vercel → Project → Settings → Environment Variables: `NEXT_PUBLIC_OFFICE_API_URL=https://api.zapfile.xyz`, redeploy.

Update later: run the same command again. Settings: `/opt/zapfile/server/office-api/.env`
(then `docker compose up -d`). Logs: `docker compose logs -f` in that folder.

## Local test

```bash
PORT=8099 node server/office-api/server.mjs   # needs soffice on PATH
curl -H "X-Filename: test.docx" --data-binary @test.docx localhost:8099/convert -o out.pdf
```
