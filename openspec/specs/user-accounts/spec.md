# user-accounts Specification

## Purpose
TBD - created by archiving change add-user-accounts. Update Purpose after archive.
## Requirements
### Requirement: Sign up with username, email and password
The system SHALL let a visitor create an account with a username, an email address and a password. The account SHALL
be usable immediately: no email verification step and no email is sent. On success the visitor SHALL be signed in.

#### Scenario: Successful sign-up
- **WHEN** a visitor submits username `Kaze_7`, email `kaze@example.com` and an 8+ character password
- **THEN** an account is created, the visitor is signed in, and they are returned to the page they came from (default `/`)

#### Scenario: No verification required
- **WHEN** a newly created account signs out and signs in again with the same credentials
- **THEN** sign-in succeeds without any email-verification step

#### Scenario: Email already in use
- **WHEN** a visitor signs up with an email that belongs to an existing account (compared case-insensitively)
- **THEN** sign-up fails with an error and no account is created

### Requirement: Username rules
A username SHALL be 3–20 characters of `A–Z`, `a–z`, `0–9` and `_`. Usernames SHALL be unique case-insensitively.
The casing the user chose SHALL be kept for display.

#### Scenario: Username taken in another case
- **WHEN** `Kaze_7` exists and a visitor signs up as `kaze_7`
- **THEN** sign-up fails with a "username taken" error

#### Scenario: Invalid username
- **WHEN** a visitor signs up as `ab` or `kaze 7` or `風`
- **THEN** sign-up fails with a validation error and no account is created

#### Scenario: Display casing kept
- **WHEN** a user signed up as `Kaze_7`
- **THEN** the site shows `Kaze_7` wherever it shows their name

### Requirement: Password rules
Passwords SHALL be 8–128 characters. Passwords SHALL only be stored as a salted slow hash, never in plain text, and
SHALL never be returned by any endpoint or written to logs.

#### Scenario: Password too short
- **WHEN** a visitor signs up with a 7-character password
- **THEN** sign-up fails with a validation error

#### Scenario: Stored password is hashed
- **WHEN** an account is created with password `correct horse`
- **THEN** the database contains no column value equal to `correct horse`

### Requirement: Sign in with username or email
The system SHALL let a user sign in with either their username (case-insensitive) or their email, plus their password.
A failed sign-in SHALL NOT reveal whether the username/email exists.

#### Scenario: Sign in by username
- **WHEN** user `Kaze_7` signs in with `KAZE_7` and the correct password
- **THEN** they are signed in

#### Scenario: Sign in by email
- **WHEN** user `Kaze_7` signs in with `kaze@example.com` and the correct password
- **THEN** they are signed in

#### Scenario: Wrong credentials
- **WHEN** someone signs in with an unknown username, or a known username and a wrong password
- **THEN** both cases show the same generic "invalid credentials" error

#### Scenario: Brute-force throttling
- **WHEN** the same client makes more than a small number of sign-in attempts within a short window
- **THEN** further attempts are rejected with a rate-limit error until the window passes

### Requirement: Sessions
A signed-in user SHALL stay signed in across page loads and browser restarts via an HTTP-only session cookie, until
they sign out or the session expires (7 days without use). Server-side code SHALL have the current user and session
available on every request. The session cookie SHALL be `Secure` when served over HTTPS and SHALL still work in local
development over plain HTTP (including LAN access from a phone).

#### Scenario: Session persists
- **WHEN** a signed-in user reloads the page or reopens the browser within the session lifetime
- **THEN** they are still signed in

#### Scenario: Server knows the user
- **WHEN** a request arrives with a valid session cookie
- **THEN** server code (load functions, endpoints, hooks) can read that user's id and username without an extra call

#### Scenario: Cookie not readable by scripts
- **WHEN** page JavaScript reads `document.cookie`
- **THEN** the session token is not included

#### Scenario: LAN development
- **WHEN** the dev server is opened from a phone at `http://<lan-ip>:5173` and the user signs in
- **THEN** sign-in succeeds and the session persists (no secure-context-only API is required)

### Requirement: Sign out
A signed-in user SHALL be able to sign out, which invalidates the session server-side.

#### Scenario: Sign out
- **WHEN** a signed-in user signs out
- **THEN** they become a guest and the old session token no longer authenticates any request

### Requirement: Change password
A signed-in user SHALL be able to change their password by providing the current password and a new valid password.
Other sessions of that user SHALL be revoked; the current one stays signed in.

#### Scenario: Change password
- **WHEN** a signed-in user enters the correct current password and a valid new password
- **THEN** the new password works for sign-in, the old one does not, and sessions on other devices are signed out

#### Scenario: Wrong current password
- **WHEN** the current password is wrong
- **THEN** the password is unchanged and an error is shown

### Requirement: Delete account
A signed-in user SHALL be able to permanently delete their account after re-entering their password. Deleting removes
the user and all their sessions and credentials; the username becomes available again.

#### Scenario: Delete account
- **WHEN** a signed-in user confirms deletion with their correct password
- **THEN** the account, its sessions and its credentials are removed, the user is a guest, and signing in with the old credentials fails

#### Scenario: Deletion needs password
- **WHEN** a user attempts deletion with a wrong password
- **THEN** nothing is deleted

### Requirement: Guests can still play
Playing against bots SHALL NOT require an account. Signing in SHALL be optional and SHALL NOT change how a
bot game plays.

#### Scenario: Guest plays
- **WHEN** a visitor who is not signed in starts a game from `/`
- **THEN** the game starts exactly as before this change

### Requirement: Account entry points
The home page SHALL show a compact account control: a sign-in link for guests, or the username linking to `/account`
for signed-in users. `/login` SHALL offer sign-in and sign-up; `/account` SHALL show username and email with
change-password, sign-out and delete-account actions. `/account` SHALL redirect guests to `/login`, and `/login` SHALL
redirect signed-in users to `/account`. These pages SHALL follow the site's portrait, one-handed, minimal-text style.

#### Scenario: Guest on home
- **WHEN** a guest opens `/`
- **THEN** a sign-in control is visible and the play form works as before

#### Scenario: Signed-in user on home
- **WHEN** `Kaze_7` opens `/`
- **THEN** `Kaze_7` is shown and links to `/account`

#### Scenario: Guarded routes
- **WHEN** a guest opens `/account`
- **THEN** they are redirected to `/login`, and after signing in land on `/account`

### Requirement: Stable identity for future services
Each account SHALL have an immutable opaque id that is independent of username and email, so ratings, game logs and
the future game server can reference it. The session SHALL be verifiable by other same-domain services (the future
`/ws` game server) from the request cookie.

#### Scenario: Opaque account id
- **WHEN** an account is created
- **THEN** it has a generated id that is used as the foreign key for all account-owned rows

#### Scenario: Same-domain session lookup
- **WHEN** server code outside SvelteKit route handling calls the auth module's session lookup with the request headers
- **THEN** it gets the same user as SvelteKit does for that cookie

