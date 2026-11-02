# Oracle image storage setup

Vercel continues to host the Next.js site and admin API. Oracle stores public image files and the live `paintings.csv` and private `sold.csv` files, with Google Drive backups. Routine painting edits and sales no longer create GitHub commits. The repository CSVs remain as a seed copy for builds and migration recovery.

## 1. Set up the image hostname

Use a dedicated hostname such as `images.reenart.com`. In GoDaddy DNS, add an `A` record named `images` pointing to the Oracle instance's public IPv4 address. Allow inbound ports 80 and 443 in the Oracle network rules and instance firewall. Keep port 8080 bound to localhost; Caddy will terminate HTTPS and forward this hostname to Nginx.

Add this site block to the existing Caddy configuration (keep the existing Stremio site block):

```caddyfile
images.reenart.com {
    reverse_proxy 127.0.0.1:8080
}
```

Install `oracle-image-server/nginx.conf` as an Nginx site on the Oracle instance. It serves `/images/<filename>` from `/var/www/reenart-images` and proxies authenticated uploads and deletions to the local Node service. Validate and reload Nginx after confirming no other site already uses `127.0.0.1:8080`.

## 2. Give Oracle write access to the Drive backup folder

The folder ID from the supplied Drive link is:

```text
1Dg-9vSA_B4n6IsfHuNb2lNG9mNuFMwqq
```

Configure rclone on Oracle under the account that will run the image service. Create a Google Drive remote named `reenartdrive`, authorize the Drive owner account (or share the folder with the service account as Editor), and set the remote's advanced `root_folder_id` to the ID above. Keep the rclone config readable by the service user only. The service uses `reenartdrive:` as its destination and keeps each original filename in the backup folder. **Set the Drive folder's General access to Restricted before migrating `sold.csv`; it contains buyer names, emails, and shipping addresses.**

## 3. Run the Oracle upload service

Install Node.js 20 or newer and rclone on Oracle. Create a restricted service account and writable image directory, then install `oracle-image-server/server.mjs` at `/opt/reenart-image-server/server.mjs` and `oracle-image-server/reenart-image-storage.service` as a systemd unit. The unit runs as `reenart-images`; grant that user write access to `/var/www/reenart-images` and read access to the rclone configuration.

Create `/etc/reenart-image-server.env` with mode `600`:

```ini
PORT=8090
IMAGE_STORAGE_DIR=/var/www/reenart-images
IMAGE_STORAGE_TOKEN=<long-random-secret>
RCLONE_CONFIG=/etc/rclone/rclone.conf
RCLONE_DESTINATION=reenartdrive:
```

Use the same random secret for `IMAGE_STORAGE_TOKEN` on Oracle and `ORACLE_UPLOAD_TOKEN` in Vercel. The service saves the image locally, then calls `rclone copyto` with the same filename. It reports a failed upload if the Drive copy fails, so the admin can retry; the same slug and image position safely overwrite that same filename.

Install and start the service, then check `https://images.reenart.com/healthz`. Before connecting Vercel, confirm the upload service can write a test image to both the Oracle directory and the Drive folder.

When updating an already installed service, copy the updated `server.mjs`, Nginx site config, and systemd unit from this repository to their installed paths. Then run `sudo nginx -t && sudo systemctl reload nginx`, followed by `sudo systemctl daemon-reload && sudo systemctl restart reenart-image-storage`. The `/delete` endpoint is authenticated with the same upload token and removes unreferenced files from both Oracle and Drive (Drive's configured `use_trash` setting controls whether deletion trashes the item).

## 4. Set Vercel environment variables

In the Vercel project settings, add these variables to the production environment (and preview environments if needed):

```text
ORACLE_UPLOAD_URL=https://images.reenart.com/upload
ORACLE_UPLOAD_TOKEN=<same random secret as IMAGE_STORAGE_TOKEN>
NEXT_PUBLIC_IMAGE_BASE_URL=https://images.reenart.com/images
```

Keep `ORACLE_UPLOAD_TOKEN` server-only. Do not prefix it with `NEXT_PUBLIC_`. `NEXT_PUBLIC_IMAGE_BASE_URL` is public and is used by the site when rendering catalog and profile images. Redeploy Vercel after changing environment variables.

## 5. Migrate the images already in GitHub

Keep the current GitHub copies until Oracle is reachable and the upload service has passed the Drive write check. From a local checkout of this repository, set the upload URL and secret in the shell, then run:

```powershell
$env:ORACLE_UPLOAD_URL = 'https://images.reenart.com/upload'
$env:ORACLE_UPLOAD_TOKEN = '<same random secret>'
node scripts/migrate-images-to-oracle.mjs
```

The script copies every image in `public/images` to Oracle and Drive using its existing filename. It exits with an error if any copy or backup fails. After verifying the site and every image on Oracle, remove the old files from `public/images` in a follow-up repository change; the source code retains its local `/images/...` fallback for development when `NEXT_PUBLIC_IMAGE_BASE_URL` is unset.

New admin uploads use the painting ID as their slug: the first image is `<slug>_cover_image.jpg`, the next is `<slug>_image2.jpg`, then `<slug>_image3.jpg`, and so on. These uploads go directly from Vercel's server API to Oracle and are copied to Drive by the Oracle service.

## 6. Migrate and use the live CSV catalog

The updated Node service accepts authenticated `GET` and `PUT` requests at `/catalog/paintings.csv` and `/catalog/sold.csv`. Each saved CSV is backed up to `reenartdrive:/catalog/` under the same filename. Captured payments use `/catalog/sale`, which updates the painting status and appends its invoice row together, preserving the existing payment, dashboard, and invoice data flow.

After installing the updated `server.mjs` and confirming the Drive folder is Restricted, run `scripts/migrate-csv-to-oracle.mjs` from the repository root with `ORACLE_UPLOAD_URL` and `ORACLE_UPLOAD_TOKEN` set in the shell. Keep the repository CSVs as seed copies; Vercel reads the live versions from Oracle after deployment.
