Your task is to get this branch into a fully passing state: all tests green, all pre-commit hooks passing. Work autonomously through the phases below. Do not stop to ask for confirmation unless you hit a blocker that genuinely requires a decision (e.g. `npm ci` fails due to a broken package-lock.json).

---

## Phase 1 — Fix Tests

### Frontend tests

Run:
```
docker-compose run --rm --use-aliases frontend npm run test
```

If it fails:
1. Read the test output carefully to identify which test files and assertions are failing.
2. Read the relevant source and test files.
3. Fix the failures (prefer fixing source code over changing tests unless the test itself is wrong).
4. Re-run the command.
5. Repeat until exit code is 0.

### Backend tests

Run:
```
docker-compose run --rm --use-aliases backend python manage.py test --verbosity=2 --keepdb --noinput
```

If it fails:
1. Read the test output to identify failing test cases.
2. Read the relevant source and test files.
3. Fix the failures.
4. Re-run the command.
5. Repeat until exit code is 0.

---

## Phase 2 — Run Pre-commit Hooks One by One

Run each hook below using its exact docker-compose command. After each **auto-fixing** hook (eslint-fix, prettier-fix, black-fix, ruff-fix, npm-audit), the hook rewrites files in place — just continue to the next hook. For **check-only** hooks (type-check, ci-check, dependency-check, ts-prune-check, mypy-check, bandit-security, next-tests, django-tests), if the hook fails: read the output, fix the issues in source, then re-run that hook until it passes before moving on.

Run hooks in this order:

### 1. ESLint Fix (auto-fix)
```
docker-compose run --rm --use-aliases frontend npm run lint:fix
```

### 2. Prettier Format (auto-fix)
```
docker-compose run --rm --use-aliases frontend npx prettier --write .
```

### 3. TypeScript Type Check
```
docker-compose run --rm --use-aliases frontend npm run type-check
```
Fix type errors in source files, re-run until it passes.

### 4. CI Check (npm ci)
```
docker-compose run --rm --use-aliases frontend npm ci
```
If this fails it likely means `package-lock.json` is out of sync — stop and ask the user.

### 5. Dependency Check
```
docker-compose run --rm --use-aliases frontend sh -c "npx --yes dependency-cruiser --validate .dependency-cruiser.cjs ."
```
If it fails, read the output to find which import rules are violated, fix the imports, re-run.

### 6. TS-Prune (Unused Exports)
```
docker-compose run --rm --use-aliases frontend sh -c "npx ts-prune | grep -v 'used in module'"
```
Exit non-zero means unused exports were found. Read the output, remove or export the unused symbols, re-run until no output remains (exit 0).

### 7. NPM Audit Fix (auto-fix)
```
docker-compose run --rm --use-aliases frontend sh -c "npm audit fix --force"
```

### 8. Frontend Tests (Next.js / Jest)
```
docker-compose run --rm --use-aliases frontend npm run test
```
Fix failures, re-run until passing.

### 9. Black Format (auto-fix)
```
docker-compose run --rm --use-aliases backend black .
```

### 10. Ruff Fix (auto-fix)
```
docker-compose run --rm --use-aliases backend ruff check . --fix
```

### 11. Mypy Type Check
```
docker-compose run --rm --use-aliases backend mypy .
```
Fix type errors in Python source, re-run until it passes.

### 12. Bandit Security Check
```
docker-compose run --rm --use-aliases backend bandit -r . --severity-level medium
```
Fix security issues, re-run until it passes.

### 13. Django Tests
```
docker-compose run --rm --use-aliases backend python manage.py test --verbosity=2 --keepdb --noinput
```
Fix failures, re-run until passing.

---

## Phase 3 — Final Integration Check

Once all individual hooks pass, run the full pre-commit suite to confirm everything works together:

```bash
pre-commit run --all-files
```

If any hook fails here (it should not), fix the issue and re-run until the full suite is green.

---

## Done

Report the final status: which hooks were fixed, what changes were made, and confirm all tests and pre-commit hooks are now passing.
