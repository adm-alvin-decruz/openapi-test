# Repository Guidelines

## Project Structure & Module Organization

- `app.js` is the Express entrypoint and exports the AWS Lambda handler via `serverless-http`.
- `src/api/` contains route modules, controllers, and services grouped by domain (users, memberships, portal, supports, components).
- Shared logic lives in `src/services/`, `src/helpers/`, `src/utils/`, `src/middleware/`, and `src/config/`.
- Data access sits under `src/db/` (TypeORM entities, MySQL models, connection config, and `src/db/migrations` SQL).
- Tests live in `src/__test__/` with fixtures in `src/__test__/api/users`.
- Infrastructure as code is in `infra/terraform`.

## Build, Test, and Development Commands

- `npm run dev`: runs the local server with nodemon and `.env` (`IS_LOCAL=true` enables the HTTP listener on port 3000).
- `npm test`: runs Jest with the repository config and limited workers.
- `npm run lint` / `npm run lint:fix`: checks or fixes lint issues with ESLint.
- `npm run format`: formats files with Prettier.
- `npm run prepare`: installs Husky hooks after dependency install.

## Coding Style & Naming Conventions

- JavaScript uses CommonJS (`require`) and a consistent 2-space indentation.
- File naming patterns: lower camelCase for services/helpers (`userResetPasswordService.js`), PascalCase for DTOs/entities (`UserDTO.js`, `User.entity.js`).
- Prefer descriptive suffixes: `*Service.js`, `*Controllers.js`, `*Routes.js`, `*Validation.js`.
- Formatting and linting are enforced via ESLint + Prettier (see `eslint.config.mjs`).

## Testing Guidelines

- Framework: Jest (`jest.config.js`); tests are named `*.test.js` and organized under `src/__test__/`.
- Integration tests may use `.integration.test.js`; keep fixtures in the relevant test folder.
- Coverage is collected for `src/**/*.js` excluding tests; add tests for new behavior where practical.

## Commit & Pull Request Guidelines

- Commit message pattern observed in history: `CIAM-<id> <type>: <summary>` (e.g., `CIAM-601 fix: prevent SQL injection in searchUsersPagination`).
- Use conventional types such as `fix`, `feat`, `refactor`, `test`, `chore`.
- PRs should include a short description, testing performed (command + result), ticket link, and a callout for migrations or infra changes.
- Robust test should pass successfully before any commits are made to the branch/repo.

## Configuration & Security Notes

- Local configuration is driven by `.env`; do not commit secrets or credentials.
- AWS/DB credentials should come from env or secret managers; verify required variables before integration tests.
- Add new SQL migrations to `src/db/migrations` and update deployment workflows that apply migrations.
