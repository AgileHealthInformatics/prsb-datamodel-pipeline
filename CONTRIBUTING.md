# Contributing Guidelines

## Overview

At present, this repository is maintained internally and **does not accept external contributions**. This policy ensures that all changes align with internal development processes, quality standards, and compliance requirements.

If you are a member of the internal development team, please follow the guidance below when making changes.

---

## Branching Model

* **`main`**: Always contains the latest stable release.
* **`develop`** *(optional)*: Contains changes staged for the next release.
* **Feature branches**: Named as `feature/short-description` for new functionality.
* **Bugfix branches**: Named as `bugfix/short-description` for fixes.
* **Hotfix branches**: Named as `hotfix/short-description` for urgent production fixes.

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

* **feat**: New feature
* **fix**: Bug fix
* **docs**: Documentation update
* **style**: Formatting only (no logic changes)
* **refactor**: Code change without adding features or fixing bugs
* **test**: Adding or updating tests
* **chore**: Maintenance tasks

Example:

```
feat: add FHIR Questionnaire export script
fix: correct JSON to XML mapping for ValueDomain elements
```

---

## Code Style

* Follow the existing code formatting in each language.
* Use meaningful variable and method names.
* Include inline comments for non-obvious logic.
* For scripts, include a verbose file header describing purpose, usage, and dependencies.

---

## Pull Requests (Internal Only)

1. Ensure your branch is up to date with `develop` (or `main` if `develop` is not used).
2. Run all relevant build and test commands successfully.
3. Submit a pull request with a clear description of changes.
4. Assign a reviewer from the core team.

---

## Issue Tracking

* All issues are tracked internally.
* External bug reports should be directed via the appropriate support channels.

---

## Contact

For questions or requests related to contributing, please contact the internal repository maintainer.
