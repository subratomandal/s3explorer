# Bucket Explorer

A web-based file manager for S3-compatible storage buckets.

![Railway Object Explorer](https://img.shields.io/badge/S3-Object%20Explorer-C049FF?style=for-the-badge)

---

## Overview

Managing S3 buckets often requires command-line tools or provider-specific dashboards that vary significantly in usability. Object Explorer unifies this experience by offering a single, consistent web interface to upload, download, and organize files across any S3-compatible provider.

Supported providers include:

- AWS S3  
- Cloudflare R2  
- MinIO  
- DigitalOcean Spaces  

<p>
    <img width="1468" height="831" alt="Screenshot 2026-01-05 at 12 59 24 PM" src="https://github.com/user-attachments/assets/90370d52-2ba5-4a99-b53b-7510b2e20516" />

</p>

<p>
    <img width="1464" height="832" alt="Screenshot 2026-01-05 at 1 00 23 PM" src="https://github.com/user-attachments/assets/11f35f47-3015-424a-bd0e-0fcb52a18c5b" />


<p>
    <img width="1467" height="832" alt="Screenshot 2026-01-05 at 12 59 51 PM" src="https://github.com/user-attachments/assets/a8079cb3-fa88-45de-9594-02730397e727" />

</p>

---

## Features

### File Management

Perform common file operations directly from the browser:

- Drag-and-drop file uploads
- Create folders for organization
- Rename files and folders
- Delete files and folders with confirmation
- Download files using secure presigned URLs

---

### Multi-Environment Support

Manage multiple S3 connections without redeploying the application:

- **Default Environment**  
  Configure a fallback S3 connection using environment variables for deployed instances.

- **Local Profiles**  
  Add and store multiple S3 connections locally in the browser.

- **Instant Switching**  
  Switch between staging, production, or personal buckets instantly.

Local profiles are stored only in the browser and never sent to a centralized backend.

---

### Keyboard Navigation

The interface is optimized for keyboard-driven workflows:

- Global command palette for fast navigation
- Perform actions without clicking through menus

---

### Keyboard Shortcuts

| Shortcut              | Action                     |
|-----------------------|----------------------------|
| `Cmd+K / Ctrl+K`      | Open command palette       |
| `Cmd+, / Ctrl+,`      | Open connection manager    |
| `Escape`              | Close active modal         |

---

## User Guide

### Connection Manager


The Connection Manager allows you to connect to different S3-compatible storage providers without redeploying the application.

### Adding a Connection

To connect to a storage provider:

1. Open the settings menu  
   - Press `Cmd + ,` or click the settings icon
2. Click **Add Connection**
3. Enter the provider details (see guides below)
4. Save the profile to switch instantly

All credentials remain in your local browser storage and are never sent to a centralized backend.

---

## Provider Setup Guide

### Cloudflare R2

1. Go to **Cloudflare Dashboard → Storage and databases → R2 object storage**
2. Click **Manage**
3. Click **Create API Token**
4. Select the **Admin Read & Write** template
5. Create the token and copy the values into Connection manager:

- **Endpoint**  
  `S3 API`
- **Access Key**  
  Your R2 Access Key ID
- **Secret Key**  
  Your R2 Secret Access Key

---

### AWS S3

1. Go to **AWS Console → IAM**
2. Create a new user
3. Attach the `AmazonS3FullAccess` policy  
   (or a restricted bucket-level policy)
4. Open the user's **Security Credentials** tab
5. Click **Create Access Key**
6. Copy the values into Railway Bucket Explorer:

- **Endpoint**  
  `https://s3.us-east-1.amazonaws.com`  
  (replace `us-east-1` with your bucket’s region)
- **Access Key**  
  Generated Access Key ID (usually starts with `AKIA`)
- **Secret Key**  
  Generated Secret Access Key

---

### Railway Object Storage (MinIO)

1. Open your **Object Storage / MinIO** service inside your Railway project
2. Navigate to the **Variables** tab
3. Copy the values into Railway Bucket Explorer:

- **Endpoint**  
  Public service domain  
  Example: `https://minio-production.up.railway.app`
- **Access Key**  
  `MINIO_ROOT_USER` or `S3_ACCESS_KEY`
- **Secret Key**  
  `MINIO_ROOT_PASSWORD` or `S3_SECRET_KEY`

---

## Deployment

The application is packaged as a Docker container and is ready to deploy on Railway.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/NEW_TEMPLATE_LINK)

---


## License

MIT

---

Created by https://github.com/subratomandalme
