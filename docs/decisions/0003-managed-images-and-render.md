# ADR 0003: Managed images and Render release

Status: Implemented, 2026-09-28. Supersedes the proposed browser-direct signed-upload protocol in implementation-plan.md Phase 8.

Cloudinary is the single image provider. The browser submits multipart file bytes to an authenticated Flask endpoint. Flask decodes and validates them with Pillow, removes metadata, bounds dimensions, and re-encodes to WebP before a server-to-server signed Cloudinary upload. Credentials stay on the server. Clients cannot attach provider IDs, external URLs, or another user's assets.

This deliberately replaces the proposed `/api/uploads/signature` plus JSON finalization flow. Validating bytes before uploading gives reliable MIME, dimensions, animation, and metadata enforcement without trusting a browser's upload result or relying on an unsigned provider preset. The 5 MB limit bounds application bandwidth; sustained upload volume should be measured before adopting a separate ingestion service.

Image attachment and removal serialize on the owning database row. A durable cleanup queue records in-flight uploads and replaced assets. Upload failure preserves the current image; database failure leaves the new asset queued for cleanup. Deletion failure does not undo a successful update. See the [deployment runbook](../render-deployment.md) for cleanup and recovery.

Render runs the built SPA and Flask API on one HTTPS origin through Waitress. A multi-stage Dockerfile avoids depending on a mixed Python/Node native build environment. Paid pre-deploy migrations, a database-backed health check, shared Redis rate limits, and CI checks guard releases. Provisioning, real Cloudinary verification, and hosted smoke tests remain operator actions.

References: [Cloudinary upload API](https://cloudinary.com/documentation/image_upload_api_reference), [image transformations](https://cloudinary.com/documentation/django_image_manipulation), [Render deployments](https://render.com/docs/deploys).
