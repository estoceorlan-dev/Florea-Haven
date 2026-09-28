"""Run browser journeys in an isolated PostgreSQL schema; never seed app tables."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import psycopg
from dotenv import load_dotenv
from psycopg import sql

from florea import create_app
from florea.auth import hash_password
from florea.db import get_db
from manage import migrate, seed

load_dotenv(ROOT / ".env")
database_url = os.getenv("TEST_DATABASE_URL") or os.environ["DATABASE_URL"]
schema = "florea_e2e_" + uuid4().hex
environment = {
    **os.environ,
    "E2E_DATABASE_URL": database_url,
    "E2E_SCHEMA": schema,
    "E2E_PYTHON": sys.executable,
}
with psycopg.connect(database_url, autocommit=True) as connection:
    connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
try:
    app = create_app(
        {
            "DATABASE_URL": database_url,
            "DATABASE_SCHEMA": schema,
            "APP_ENV": "test",
            "TESTING": True,
        }
    )
    with app.app_context():
        connection = get_db()
        migrate(connection)
        seed(connection)
        connection.execute(
            """INSERT INTO users (id, name, email, password_hash, role)
                            VALUES (%s, 'Test Administrator', 'admin@e2e.test', %s, 'admin')""",
            (uuid4(), hash_password("E2eGarden123")),
        )
    result = subprocess.run(
        ["node", "node_modules/@playwright/test/cli.js", "test", *sys.argv[1:]],
        cwd=ROOT,
        env=environment,
    )
finally:
    assert schema.startswith("florea_e2e_") and len(schema) == 43
    with psycopg.connect(database_url, autocommit=True) as connection:
        connection.execute(
            sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema))
        )
sys.exit(result.returncode)
