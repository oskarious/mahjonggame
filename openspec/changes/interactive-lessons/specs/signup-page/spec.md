## ADDED Requirements

### Requirement: Dedicated sign-up page
The site SHALL serve `/signup`, a page only for creating an account (username, email, password; same username rules
and errors as today), server-rendered with its own title and meta description. After a successful sign-up the player
SHALL be signed in and sent to the `next` query parameter when it is a safe same-site path (`safeNext`), else to the
home page. The page SHALL link to `/login` for existing players, keeping `next`.

#### Scenario: Sign up from a lesson
- **WHEN** a guest opens `/signup?next=/online` and creates an account
- **THEN** they are signed in and land on `/online`

#### Scenario: Unsafe next
- **WHEN** a guest opens `/signup?next=https://evil.example` and signs up
- **THEN** they land on the home page

#### Scenario: Already signed in
- **WHEN** a signed-in player opens `/signup`
- **THEN** they are redirected to `next` (if safe) or the home page

### Requirement: Sign-in only on the login page
`/login` SHALL only sign in (username or email, and password) and SHALL link to `/signup` for new players, keeping
`next`. The sign-in / sign-up toggle SHALL be removed, along with any code only it used.

#### Scenario: New player on the login page
- **WHEN** a guest on `/login?next=/online` follows "Create an account"
- **THEN** they reach `/signup?next=/online`

### Requirement: Entry points to sign-up
Every guest-facing "create an account" entry point SHALL link to `/signup`: the home page, the online entry for
guests and the Learn calls to action. "Sign in" links SHALL keep pointing to `/login`.

#### Scenario: Home page as a guest
- **WHEN** a guest opens the home page
- **THEN** there is a sign-up link to `/signup` next to "Sign in"
