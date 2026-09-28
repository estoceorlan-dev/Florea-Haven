"""Development, production serving, and database commands for the Python backend."""

import argparse
import os
from pathlib import Path
from uuid import uuid4

from florea import create_app
from florea.auth import hash_password
from florea.db import get_db, one
from florea.validation import string

BACKEND = Path(__file__).resolve().parent


def migrate(connection):
    connection.execute("""CREATE TABLE IF NOT EXISTS schema_migrations (
                          name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)""")
    for path in sorted((BACKEND / "migrations").glob("*.sql")):
        with connection.transaction():
            # Serialize migration runners without changing the legacy migration ledger.
            connection.execute("SELECT pg_advisory_xact_lock(746293105)")
            if connection.execute(
                "SELECT 1 FROM schema_migrations WHERE name = %s", (path.name,)
            ).fetchone():
                continue
            connection.execute(path.read_text(encoding="utf-8"))
            connection.execute("INSERT INTO schema_migrations (name) VALUES (%s)", (path.name,))
        print(f"Applied {path.name}")


def seed(connection):
    with connection.transaction():
        for path in sorted((BACKEND / "seeds").glob("*.sql")):
            connection.execute(path.read_text(encoding="utf-8"))
            print(f"Seeded {path.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command", choices=["dev", "serve", "migrate", "seed", "create-admin", "cleanup-images"]
    )
    args = parser.parse_args()
    if args.command == "serve":
        # Production serving must never silently generate a temporary signing key
        # or send non-Secure cookies because a development .env was copied.
        os.environ["APP_ENV"] = "production"
    app = create_app()
    with app.app_context():
        if args.command == "migrate":
            migrate(get_db())
        elif args.command == "seed":
            seed(get_db())
        elif args.command == "cleanup-images":
            from florea.images import cleanup_pending

            print(f"Cleaned {cleanup_pending()} image assets.")
        elif args.command == "create-admin":
            name = string(os.getenv("ADMIN_NAME"), "ADMIN_NAME", 2, 80)
            email = string(
                os.getenv("ADMIN_EMAIL"), "ADMIN_EMAIL", 3, 254, r"[^\s@]+@[^\s@]+\.[^\s@]+"
            ).lower()
            password = string(os.getenv("ADMIN_PASSWORD"), "ADMIN_PASSWORD", 8, 72, trim=False)
            import re

            if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
                parser.error("ADMIN_PASSWORD must contain a letter and a number.")
            one(
                """INSERT INTO users (id, name, email, password_hash, role)
                   VALUES (%s, %s, %s, %s, 'admin') ON CONFLICT (email) DO UPDATE
                   SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
                   role = 'admin', updated_at = CURRENT_TIMESTAMP RETURNING id""",
                (uuid4(), name, email, hash_password(password)),
            )
            print("Administrator account created or updated.")
        elif args.command == "dev":
            app.run(host="127.0.0.1", port=int(os.getenv("PORT", "4000")), use_reloader=True)
        else:
            from waitress import serve

            app.logger.setLevel("INFO")
            proxy = {}
            if os.getenv("TRUST_PROXY", "false").lower() == "true":
                proxy = dict(
                    trusted_proxy="*",
                    trusted_proxy_count=1,
                    trusted_proxy_headers={"x-forwarded-for", "x-forwarded-proto"},
                )
            serve(
                app,
                host="0.0.0.0",
                port=int(os.getenv("PORT", "4000")),
                threads=8,
                max_request_body_size=6 * 1024 * 1024,
                **proxy,
            )


if __name__ == "__main__":
    main()
