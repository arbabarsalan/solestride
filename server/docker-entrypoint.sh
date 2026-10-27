#!/bin/sh
# Container boot: bring the schema up, seed the demo catalog (both are
# idempotent), then hand off to the server process.
set -e
node db/migrate.js
node db/seed.js
exec npm start
