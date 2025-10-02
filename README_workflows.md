# CIAM Github Pipeline

## Instructions: Update Workflow To Run New Migrations Files

1. Go to .github/workflows/sql-update.yml
2. Modified section `- name: psql query execute`
3. Remove old migrations files from running and add new migrations file

```
echo "Running ciam-users-20240821.sql script"
mysql -h $DB_SERVER_ENDPOINT -P 3306 --ssl -u $DB_USERNAME -p$DB_PASSWORD -D ciam < ./src/db/migrations/ciam-users-20240821.sql
echo "running app-token-seeds.sql script"
mysql -h $DB_SERVER_ENDPOINT -P 3306 --ssl -u $DB_USERNAME -p$DB_PASSWORD -D ciam < ./src/db/migrations/app-token-seeds.sql
# add more line below or remove old file's line

```
