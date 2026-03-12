# RealtorOne Website

This repo deploys the RealtorOne website to the live VPS automatically whenever code is pushed to `main`.

## Local development

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Create a production build locally:

```bash
npm run build
```

## Auto deploy on push

The live deploy flow is defined in `.github/workflows/deploy.yml`.

What happens on each push to `main`:

1. GitHub Actions connects to the VPS over SSH.
2. The VPS pulls the latest repo state.
3. The VPS rebuilds and restarts the `website` container with `docker compose`.

Required GitHub repository secrets:

- `VPS_PASSWORD`: password for the deployment user.

Optional GitHub repository secrets:

- `VPS_HOST`: override the default VPS host.
- `VPS_USER`: override the default SSH user.

Server requirements:

- Docker and Docker Compose plugin installed.
- Port `80` open.
- If another host Nginx is using port `80`, disable it or move the website container to another port.
- The VPS must be able to run `git`, `docker`, and `docker compose`.

Manual server bootstrap, one time only:

```bash
sudo mkdir -p /opt/realtorone-website
sudo chown -R $USER:$USER /opt/realtorone-website
```

After that, pushing to `main` should update the live site automatically.
