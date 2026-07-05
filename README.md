# Tabibi - Clean/Onion Architecture Refactor (Slice 1: Auth)

This is the first bounded-context slice of the MediConnect/Tabibi backend refactor.
It restructures the app into four layers plus two test projects. **I could not
compile or run this in the sandbox I built it in (no .NET SDK / NuGet access
there) — please build it locally before relying on it.** See "What to verify
first" below.

## Layers (dependencies point inward only)

```
Tabibi.Api            (Presentation: controllers, Program.cs, cookies)
      -> Tabibi.Infrastructure  (EF Core, ASP.NET Identity, JWT, refresh tokens)
            -> Tabibi.Application   (use cases: AuthService, TokenRefreshService)
                  -> Tabibi.Domain      (entities, enums, repository interfaces - ZERO dependencies)
```

- **Tabibi.Domain**: plain POCO entities for the whole schema (Patient/Doctor
  profiles, appointments, chat, prescriptions, payments, etc.) so `AppDbContext`
  has somewhere to live, plus the repository *interfaces* (`IPatientProfileRepository`,
  `IDoctorProfileRepository`, `IUnitOfWork`) that Infrastructure implements.
  No EF Core, no ASP.NET Identity, no attributes tying it to persistence.
- **Tabibi.Application**: `AuthService` and `TokenRefreshService` — the actual
  business logic, unchanged in behavior from the original `AuthService.cs` /
  `TokenService.cs`, but now expressed against ports (`IIdentityService`,
  `IJwtTokenGenerator`, `IRefreshTokenStore`) instead of concrete `UserManager`/
  `SignInManager`/EF calls. This is what the unit tests exercise directly.
- **Tabibi.Infrastructure**: `AppDbContext` (with Fluent API configuration per
  entity, replacing data-annotation attributes), the ASP.NET Identity-backed
  `AppUser`, `IdentityService`, `JwtTokenGenerator`, and an in-memory
  `IRefreshTokenStore` (same logic as the original `TokenStore.cs`).
- **Tabibi.Api**: `AuthController` (thin — just calls Application services and
  sets cookies), `Program.cs` composition root, role seeding.

## Only Auth is migrated so far

`Program.cs` currently wires up only what Auth needs. SignalR, the AI doctor
service, appointments/prescriptions/payments controllers, etc. are **not**
in this slice yet — their Domain entities exist (so the schema is complete)
but their Application/Infrastructure/Api code hasn't been written. That's the
next slice, pending your review of this one.

## What changed vs. the original (behavior notes, not just structure)

1. **`ConsultationPrice.cs` was dropped.** It wasn't registered in the old
   `AppDbContext` and nothing referenced it — dead code superseded by
   per-type pricing on `DoctorSpecialty`. Shout if you actually need it back.
2. **Register/AddToRole now both roll back consistently on an invalid role.**
   The original `Register` didn't check `AddToRoleAsync`'s result before
   creating the profile row; `AddToRole` did. I made both check and roll back
   via the same code path — a small correctness fix, not just a refactor.
3. **One known, *unfixed* limitation carried over on purpose:** `CreateUserAsync`
   (via `UserManager.CreateAsync`) commits immediately, before the
   role/profile transaction starts. If the role is invalid, you get a
   role-less, profile-less identity user left behind. Fixing this properly
   means bringing user creation inside the same transaction — flagged as a
   candidate follow-up, not silently fixed, since it touches Identity's own
   internals. There's an integration test (`Register_UnrecognisedRole_ReturnsBadRequest`)
   that documents this rather than hiding it.

## Before you trust this: build it locally

I don't have the .NET SDK in this environment, so nothing here has been
compiled. Do this first:

```bash
cd Tabibi-clean   # wherever you extract it
dotnet restore
dotnet build
```

Fix whatever the compiler finds — I've been careful, but I'd rather say that
plainly than pretend a hand-written multi-project solution is guaranteed
correct without a compiler in the loop.

Then generate the initial migration (there isn't one yet — the original repo's
migrations don't carry over cleanly onto a restructured `AppDbContext`, and
your production DB already matches the old schema, so review the generated
migration carefully against your existing DB before applying it; it should be
empty or near-empty if the Fluent configs match what you had):

```bash
cd src/Tabibi.Api
dotnet ef migrations add InitialCleanArchitecture --project ../Tabibi.Infrastructure --startup-project .
```

Fill in real values in `src/Tabibi.Api/appsettings.json` (connection string,
JWT secret) — same as before, it's still gitignored/untracked.

## Running the tests

```bash
dotnet test tests/Tabibi.UnitTests
dotnet test tests/Tabibi.IntegrationTests
```

- **Unit tests** (`Tabibi.UnitTests`): `AuthService` and `TokenRefreshService`
  against mocked ports (Moq) — no database, no ASP.NET Identity, fast.
- **Integration tests** (`Tabibi.IntegrationTests`): real ASP.NET Identity +
  EF Core over an in-memory SQLite database, driven through actual HTTP
  requests via `WebApplicationFactory<Program>` — register/login/refresh/
  logout/add-to-role end to end, including cookie handling.

## Next steps (pick one when you're ready)

- Doctor/Patient profile management + Appointments (the next natural context,
  since Auth already creates the profile rows)
- Chat (SignalR) + AI symptom analysis
- Admin/specialties/reviews

Each will add its own `Application/<Context>`, `Infrastructure` pieces, and
`Api/Controllers/<Context>Controller.cs`, plus unit + integration tests, same
pattern as this slice.
