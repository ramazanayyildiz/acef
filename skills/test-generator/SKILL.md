---
name: test-generator
version: 1.0.0
description: 'Generate complete, production-ready test classes from a Risk Profile.
  Framework-aware workflow — reads framework-specific templates from references/{framework}/.
  Currently supports Laravel. from references/{framework}/ before generating code.
  Currently supports: Laravel (references/laravel/). Triggers on: "generate tests
  from risk profile", "implement the risk profile", "generate test code", "write the
  test class", "create test file", "implement tests from plan", "generate test skeleton".
  Does NOT trigger on: "plan tests" or "what should I test" — those go to test-case-planner.
  Does NOT trigger on: "analyze for testing" — that goes to test-risk-classifier.
  Requires a Risk Profile as input. If no Risk Profile exists, run test-risk-classifier
  first. Run this LAST in the testing pipeline, after test-case-planner and test-risk-classifier.
  For browser/E2E tests use test-browser-generator instead.

  '
permalink: ram/04-ai-toolkit/skills/test/test-generator/skill
---

# Test Generator

**Pipeline position: Step 3 of 3**
```
test-case-planner → test-risk-classifier → [test-generator]
```

Generates complete test classes from a Risk Profile.
Before writing any code, detects the framework and reads the appropriate
reference files from `references/{framework}/`.

For browser and E2E tests, use `test-browser-generator` instead.

---

## Fast Path Mode (Simple Cases)

Use fast path when ALL of the following are true:
- Single class with ≤ 5 public methods
- Risk tier is LOW or MEDIUM throughout
- No complex dependency chains
- User says "write tests for this" with a file — no prior Risk Profile

**Fast path skips Steps 1-4 and goes directly to generation.**

```
Detect framework → Quick inline analysis → Generate
```

### Quick inline analysis (replaces full pipeline):
1. List all public methods
2. For each: count branches (if/else/match), spot obvious side effects
3. Apply minimum test counts (LOW→2, MEDIUM→4)
4. Generate with standard setUp() for detected side effects

### When to refuse fast path and require full pipeline:
- CRITICAL or HIGH tier methods with multiple side effects
- More than 5 public methods
- User says "comprehensive" or "full coverage"
- Multi-class or full-feature scope

> Fast path produces good tests quickly. Full pipeline produces better tests.
> Users can always run the full pipeline on the output to improve it.

---

## Inline Critical Patterns (When References Cannot Be Loaded)

If `references/laravel/` files are not accessible, use these embedded patterns:

### Laravel Unit Test (no DB)
```php
class {ClassName}Test extends TestCase
{
    private {ClassName} $sut;

    protected function setUp(): void
    {
        parent::setUp();
        // Side effect fakes here
        $this->sut = new {ClassName}(/* mocked deps */);
    }

    #[Test]
    public function test_{method}_succeeds(): void
    {
        // Arrange
        // Act
        $result = $this->sut->{method}(...);
        // Assert
        $this->assertEquals(expected, $result);
    }
}
```

### Laravel Feature Test (with DB, HTTP)
```php
class {ClassName}Test extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_{endpoint}_returns_ok(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/endpoint', [...])
            ->assertStatus(201)
            ->assertJsonStructure(['id', 'status']);
    }

    #[Test]
    public function test_{endpoint}_as_guest_returns_unauthorized(): void
    {
        $this->postJson('/endpoint', [])->assertStatus(401);
    }
}
```

### Side effect assertion patterns (inline cheatsheet)
```php
Queue::fake();    Queue::assertPushed(SomeJob::class);
Event::fake();    Event::assertDispatched(SomeEvent::class);
Mail::fake();     Mail::assertSent(SomeMail::class);
Http::fake([...]); Http::preventStrayRequests(); Http::assertSent(...);
Storage::fake();  Storage::assertExists('path/to/file');
$this->assertDatabaseHas('table', ['column' => 'value']);
```

---

## Workflow

```
1. Read references → 2. Detect framework → 3. Ingest Risk Profile → 4. Classify → 5. Generate → 6. Verify
```

Do not skip steps. Do not generate code before completing Step 4.

---

## Step 1: Read References

Detect the framework from the source files or Risk Profile, then read:

**Laravel:**
```
references/laravel/templates.md
references/laravel/assertions.md
```

If the framework is not yet supported, inform the user and generate
code using general testing best practices — Arrange/Act/Assert structure,
mocks for external dependencies, one assertion per behavior.

---

## Step 2: Detect Framework

Identify from:
- File extensions (`.php` → likely Laravel/Symfony, `.ts/.js` → Node, `.py` → Django/FastAPI)
- Import statements (`use Illuminate\` → Laravel, `import express` → Node, etc.)
- Risk Profile "Language / Framework" field if present

State the detected framework before proceeding.

---

## Step 3: Ingest the Risk Profile

Accept input in one of two forms:

**Form A (preferred):** Risk Profile handoff block (see `shared/handoff-schema.md` § "Risk Profile Handoff") + original source file
**Form B (low-context mode):** Source file only — run basic inline analysis before generating. **Note: this is lower
confidence. Do not use for ACEF guarded gates, comprehensive coverage, or code with external side effects unless the
missing risk-profile/test-case evidence is explicitly accepted by the human.**

**Validate the handoff block:**
1. Check `"artifact": "risk-profile"` — reject if wrong type
2. Check `version` — warn if mismatch
3. Read `unknowns` — ask user to fill gaps before proceeding

From the Risk Profile `methods` array, extract for each method:
- `branches[].id` (B1, B2...) → each becomes one test method
- `side_effects[].id` + `type` (SE1:DB, SE2:EVENT...) → each becomes assertions in the relevant test
- `dependencies[].id` + `type` → mock/stub setup
- `preconditions[].id` → each becomes part of the Arrange block
- `tier` → determines how many edge/error cases to add beyond the minimum
- `linked_case_ids` → trace back to test case plan for context
- `global_mocks_needed` → goes into the shared setup block

**Minimum test count per complexity tier (or use `recommended_test_count` from Risk Profile):**

| Tier | Minimum tests per method |
|---|---|
| 🟢 LOW | 2-4 (happy path + 1-2 edge) |
| 🟡 MEDIUM | 5-8 (all branches + key side effects) |
| 🔴 HIGH | 8-15 (all branches + all side effects + edge cases) |
| 🚨 CRITICAL | 15+ (all of HIGH + flag for refactor in output) |

---

## Step 4: Classify → Choose Test Type and Location

Use the framework-specific mapping from the reference files.

General rule regardless of framework:
- If the test needs a real database → use a database reset mechanism
- If the test is pure logic → use bare test runner with no framework boot
- If the test covers HTTP → use the framework's HTTP test client

---

## Step 5: Generate Tests

### Test Method Naming Convention
```
test_{method}_{state}_{expected_outcome}

Examples:
  test_publish_with_active_subscription_updates_status()
  test_publish_when_subscription_expired_throws_exception()
  test_store_with_missing_title_returns_validation_error()
  test_index_as_guest_returns_unauthorized()
```

### Structure of Each Test Method
Every method follows Arrange → Act → Assert:

```
[setup fakes from global mock setup]

test method:
  // Arrange — satisfy all [P{n}] preconditions
  // Act
  // Assert — cover all [SE{n}] side effects
```

### Mapping Risk Profile IDs to Code

| Risk Profile ID | Maps to |
|---|---|
| `[B{n}]` branch | One test method per branch |
| `[SE{n}]` EVENT | Assert event was dispatched with correct payload |
| `[SE{n}]` QUEUE | Assert job was pushed to queue with correct payload |
| `[SE{n}]` EMAIL | Assert email was sent to correct recipient |
| `[SE{n}]` DB write | Assert record exists/changed in database |
| `[SE{n}]` HTTP | Assert outbound HTTP call was made |
| `[P{n}]` precondition | Arrange block setup |
| Global mock setup | Shared setUp() / beforeEach() block |

Use templates from `references/{framework}/templates.md`.
Use assertions from `references/{framework}/assertions.md`.

---

## Step 6: Quality Verification

Before presenting output, verify:

### Structure
- [ ] Namespace / module path matches file location
- [ ] Class or file name matches convention with test suffix
- [ ] Every test method follows naming convention
- [ ] Setup and teardown call parent where required
- [ ] Mocks/stubs cleaned up after each test

### Content
- [ ] Every `[B{n}]` branch has a corresponding test method
- [ ] Every `[SE{n}]` side effect is asserted in the relevant test
- [ ] Every `[P{n}]` precondition is satisfied in Arrange
- [ ] All global fakes initialized in setup block
- [ ] Arrange → Act → Assert in every test
- [ ] No logic inside tests — use data providers/parameterized tests
- [ ] Factories or fixtures used — not raw data creation
- [ ] At least one failure path per public method
- [ ] No assertions on implementation details — behavior only

---

## Output Format

1. State which framework was detected and which reference files were read
2. Flag any 🚨 CRITICAL complexity methods that should be refactored first
3. State the output file path
4. Generate the complete test class — no partial outputs
5. List any fixture/factory files that need to be created or updated
6. Provide the command to run only these tests
