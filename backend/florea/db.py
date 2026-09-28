"""One connection per request; explicit transactions for related writes."""

import psycopg
from flask import current_app, g
from psycopg.rows import dict_row


def connect(config):
    options = dict(autocommit=True, row_factory=dict_row, connect_timeout=10)
    if config.get("DATABASE_SSL"):
        options["sslmode"] = "verify-full"
    if config.get("DATABASE_SCHEMA"):
        # Only used by tests to isolate their data from every existing table.
        options["options"] = f"-c search_path={config['DATABASE_SCHEMA']}"
    return psycopg.connect(config["DATABASE_URL"], **options)


def get_db():
    if "db" not in g:
        g.db = connect(current_app.config)
    return g.db


def close_db(error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def rows(sql, values=()):
    return get_db().execute(sql, values).fetchall()


def one(sql, values=()):
    return get_db().execute(sql, values).fetchone()


def execute(sql, values=()):
    return get_db().execute(sql, values)


def lock_customer(user_id):
    # Cart edits and checkout for a customer serialize on the same database row.
    one("SELECT id FROM users WHERE id = %s FOR UPDATE", (user_id,))
