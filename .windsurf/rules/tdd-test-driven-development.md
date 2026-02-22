---
trigger: model_decision
---


# Test-Driven Development Rules


## Core TDD Workflow

ALWAYS follow the RED-GREEN-REFACTOR cycle when adding new features or significantly modifying existing code (eg changing behavior):

1. **RED Phase** - Write failing tests first
   - Define expected behavior through tests
   - Do NOT write any implementation code
   - Confirm tests fail for the right reason (missing implementation, not test errors)
   - Cover happy path, edge cases, and error conditions

2. **GREEN Phase** - Write minimal code to pass tests
   - Write ONLY enough code to make tests pass
   - Do NOT modify tests to make them pass
   - Do NOT add features beyond what tests require
   - Simple solutions over clever solutions

3. **REFACTOR Phase** - Improve code while tests stay green
   - Remove duplication, improve naming, simplify logic
   - Run tests after EVERY change
   - If tests fail, REVERT immediately and rethink approach
   - Do NOT change behavior or add new features

## Test Quality Requirements

### Meaningful Tests Only

Tests MUST validate actual behavior, not just coverage:
- ✓ Test correct outputs for given inputs
- ✓ Verify expected side effects
- ✓ Validate error handling with specific error types
- ✓ Test edge cases with realistic data
- ✗ No tests that only check "doesn't crash"
- ✗ No tests with trivial data that doesn't exercise real logic
- ✗ No tests that only verify implementation details

### Test Structure

Every test MUST follow arrange-act-assert:
```
# Arrange: Set up test data and preconditions
# Act: Execute the behavior being tested
# Assert: Verify specific expected outcomes
```

Tests MUST:
- Have clear, descriptive names explaining what behavior is tested
- Be independent (no dependencies on other tests)
- Use realistic test data representing actual usage
- Make specific assertions (not vague checks)
- Test one behavior per test

### Mocking Discipline

- Mock ONLY external dependencies (APIs, databases, file systems, network calls)
- Do NOT mock internal business logic (defeats purpose of testing)
- Prefer real objects when practical
- When mocking, verify meaningful interactions, not just "was called"

## Implementation Rules

### When Writing Tests (RED Phase)

User signals test-writing mode with phrases like:
- "Write tests for [feature]"
- "Let's use TDD for [feature]"
- "Test [functionality] covering edge cases"

When in test-writing mode:
1. Write tests ONLY - no implementation
2. Include tests for:
   - Happy path with realistic valid inputs
   - Edge cases: boundaries, empty values, nulls, extremes
   - Error conditions: invalid inputs, expected exceptions
   - Integration points: how components interact
3. Run tests to verify they fail correctly
4. Do NOT proceed to implementation without explicit user confirmation

### When Writing Implementation (GREEN Phase)

User signals implementation mode with phrases like:
- "Now write the code to pass those tests"
- "Implement [feature] to pass the tests"
- "Write minimal code to make tests pass"

When in implementation mode:
1. Write ONLY code needed for current failing tests
2. Keep solutions simple - hardcoded values acceptable initially
3. Do NOT add functionality beyond test requirements
4. Do NOT modify tests (unless there's an actual bug in the test)
5. Run tests frequently to confirm they pass

### When Refactoring (REFACTOR Phase)

User signals refactor mode with phrases like:
- "Refactor [file] for readability"
- "Clean up the code while keeping tests green"
- "Remove duplication in [module]"

When in refactor mode:
1. Make small incremental changes
2. Run tests after EVERY change
3. If ANY test fails: REVERT immediately, don't try to fix
4. Focus on: removing duplication, improving names, simplifying logic
5. Do NOT change behavior or add features
6. Do NOT modify test assertions (unless they were incorrect)

## Reverting Over Patching

When tests fail during refactoring:
- ALWAYS revert to last green state
- NEVER try to "fix the fix"
- Analyze what went wrong
- Try a different, cleaner approach
- This is a core principle: clean solutions over accumulated patches

## Adding Tests to Existing Code

When adding tests to untested code:

### Step 1: Characterization Tests First
Write tests documenting current behavior:
- Main use cases with realistic data
- Known edge cases and quirks
- Any special behaviors
These preserve behavior during future refactoring

### Step 2: Prioritize High-Value Tests
Focus on:
- Complex logic areas
- Frequently buggy code
- Code about to change
- Critical business logic
Do NOT aim for 100% coverage immediately

### Step 3: Incremental Coverage
- Test one behavior at a time
- Verify tests pass with current implementation
- Gradually expand coverage
- Only then begin refactoring

## Automatic Behavior

When user requests a feature without mentioning testing:
1. Propose TDD approach: "Let's use TDD for this. I'll write tests first, then implement, then refactor. Sound good?"
2. If user agrees, proceed with RED-GREEN-REFACTOR
3. If user wants direct implementation, ask: "Should I write tests first, or implement directly? TDD will result in more robust code."

When user provides code without tests:
- Flag: "This code has no tests. Should I write tests to ensure it works correctly and enable safe future changes?"
- If yes, write characterization tests first, then suggest improvements

## Code Review Checklist

Before completing any feature:
- [ ] All code has corresponding tests
- [ ] Tests were written before implementation
- [ ] Tests cover happy path, edge cases, and errors
- [ ] Tests use realistic data
- [ ] Tests make specific assertions
- [ ] Code has been refactored for clarity
- [ ] All tests pass
- [ ] No implementation details are tested (only behavior)

## Anti-Patterns to Reject

Immediately reject these approaches:
- Writing implementation before tests
- Tests that only verify "no exception thrown"
- Modifying tests to make implementation pass
- Over-mocking internal logic
- Vague assertions like `assert result is not None`
- Adding features not required by tests
- Continuing when tests fail during refactoring (revert instead)

## Quick Command Reference

Suggest these patterns to users:

Initialize TDD:
> "Let's use TDD for [feature]. Write failing tests first, then minimal implementation, then refactor."

Request tests:
> "Write tests for [feature] covering happy path, edge cases, and error conditions. Don't write implementation yet."

Request implementation:
> "Write minimal code to make tests in [file] pass. Don't modify tests."

Request refactoring:
> "Refactor [file] for [goal]. All tests must stay passing."

Discover edge cases:
> "What edge cases exist for [function]? List them and write test cases."

## Success Metrics

TDD is working when:
- Every feature starts with failing tests
- Tests are written before implementation
- Tests catch bugs before they reach production
- Refactoring is frequent and safe
- Code is well-structured and maintainable
- New developers understand behavior from reading tests
- Test failures always indicate real problems

## Regression Test Validity Check

A test is considered INVALID if:
- The test would still pass if the implementation were replaced with a stub or constant return value
- The test does not fail when core logic is removed or bypassed
- The assertion does not distinguish correct behavior from incorrect behavior

When writing tests, ask:
> “If I broke the core logic on purpose, would this test fail?”

If the answer is “no” or “probably not”, the test must be rewritten or removed.
