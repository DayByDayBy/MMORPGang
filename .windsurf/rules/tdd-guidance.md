---
trigger: model_decision
description: Apply when writing tests, adding features using TDD, refactoring with tests, or discussing test strategy.
---


# Test-Driven Development (TDD) Guidelines for Windsurf Cascade

## Core TDD Principle

**Write tests first, then implementation.** Tests define behavior before code exists to fulfill it.

## When to Apply TDD

Apply TDD for:
- New features or functionality
- Bug fixes (write failing test reproducing the bug first)
- Refactoring existing code (tests ensure behavior preservation)
- API endpoints and business logic
- Data transformations and algorithms
- State management and data flows

Skip TDD for:
- Exploratory prototyping (convert to TDD once direction is clear)
- Simple configuration files
- One-off scripts with no reuse value
- Direct UI styling adjustments (though component behavior should be tested)

## The Three Phases

### Phase 1: RED - Write Failing Tests

**Objective:** Define expected behavior through tests that fail because implementation doesn't exist yet.

**Instructions:**
1. Identify the specific behavior or feature to implement
2. Write the minimal test that describes this behavior
3. Run tests to confirm they fail for the right reason (missing implementation, not test errors)
4. Do NOT write any implementation code during this phase

**What to test:**
- **Happy path:** Expected behavior with valid inputs
- **Edge cases:** Boundary conditions, empty/null values, extreme inputs
- **Error conditions:** Invalid inputs, expected exceptions, failure modes
- **Integration points:** How components interact with dependencies

**Test quality checklist:**
- [ ] Test name clearly describes what behavior is being tested
- [ ] Test is independent (doesn't rely on other tests)
- [ ] Test has clear arrange-act-assert structure
- [ ] Assertions are specific and meaningful (not just "doesn't crash")
- [ ] Test fails initially for the expected reason

**Example pattern:**
```
# Arrange: Set up test data and conditions
# Act: Execute the behavior being tested
# Assert: Verify the expected outcome
```

### Phase 2: GREEN - Make Tests Pass

**Objective:** Write the minimal code necessary to make failing tests pass.

**Instructions:**
1. Write only enough code to make the current failing test pass
2. Avoid premature optimization or over-engineering
3. Run tests frequently to confirm they pass
4. Do NOT modify tests to make them pass (except fixing actual test bugs)
5. If implementation reveals test gaps, note them for the next RED phase

**Implementation principles:**
- Simple solutions over clever solutions
- Hardcoded values are acceptable initially if they make tests pass
- Duplication is acceptable initially (refactor in next phase)
- Focus on making it work, not making it perfect

**Anti-patterns to avoid:**
- Writing more functionality than tests require
- Modifying tests to match implementation (should be opposite)
- Adding features "while you're in there"
- Premature abstraction or optimization

### Phase 3: REFACTOR - Improve Code Quality

**Objective:** Improve code structure, readability, and maintainability while keeping all tests passing.

**Instructions:**
1. Identify code smells: duplication, unclear naming, complex logic
2. Refactor code incrementally, running tests after each change
3. Improve structure without changing behavior
4. All tests must continue passing throughout refactoring
5. If tests fail, revert the refactor and try a different approach

**Refactoring targets:**
- Remove duplication (DRY principle)
- Improve naming clarity (variables, functions, classes)
- Extract complex logic into well-named functions
- Simplify conditional logic
- Improve code organization and structure
- Optimize performance (only if needed and measured)

**Refactoring safety rules:**
- Run tests after every refactoring step
- Make small, incremental changes
- If tests fail, revert immediately and rethink the approach
- Don't add new functionality during refactoring
- Don't change test assertions (unless they were incorrect)

## TDD Workflow Commands

Use these phrases to engage TDD mode with the IDE:

### Initialize TDD Mode
```
"Let's use strict TDD for [feature name]. Write failing tests first, then minimal implementation, then refactor."
```

### RED Phase
```
"Write tests for [specific functionality] covering:
- Happy path with valid inputs
- Edge cases: [list specific edge cases]
- Error conditions: [list expected errors]
Do NOT write implementation yet."
```

### GREEN Phase
```
"Write the minimal code to make tests in [test file name] pass. Do not modify the tests."
```

### REFACTOR Phase
```
"Refactor [file name] for [specific goal: readability/performance/structure]. All tests must continue passing."
```

### Edge Case Discovery
```
"What edge cases should be tested for [function/class name]? List them, then write test cases."
```

### Component Coverage
```
"Write comprehensive tests for [component/module name], ensuring coverage of all public methods/functions."
```

## Test Quality Standards

### Meaningful Tests (Not Just Coverage)

**Good tests validate:**
- Correct outputs for given inputs
- Expected side effects occur
- Error handling works correctly
- Edge cases are handled properly
- Integration points behave correctly

**Avoid superficial tests:**
- Tests that only verify code doesn't crash
- Tests that check implementation details rather than behavior
- Tests with no real assertions
- Tests that mock everything away (test the mocks, not the code)

### Test Robustness Principles

1. **Test behavior, not implementation**
   - Focus on what the code does, not how it does it
   - Tests should survive refactoring if behavior stays same

2. **Use realistic test data**
   - Avoid trivial examples that don't represent real usage
   - Include data that exercises actual logic paths

3. **Assert meaningful outcomes**
   - Verify correct results, not just "something happened"
   - Check side effects that matter
   - Validate error messages and error types

4. **Minimize mocking**
   - Mock external dependencies (APIs, databases, file systems)
   - Don't mock internal logic (defeats the purpose of testing)
   - Prefer real objects when practical

5. **Test at the right level**
   - Unit tests: Individual functions/classes
   - Integration tests: Component interactions
   - E2E tests: Complete user workflows
   - Use each where appropriate

## Handling Existing Codebases

When adding tests to existing code without tests:

### Step 1: Characterization Tests
```
"Before modifying [module name], write characterization tests that document its current behavior. Test:
- Main use cases with realistic data
- Known edge cases
- Any quirky behaviors
These tests preserve existing behavior during refactoring."
```

### Step 2: Identify Risky Areas
```
"Analyze [module name] and identify:
- Complex logic that's hard to understand
- Areas with frequent bugs
- Code that's about to change
Prioritize tests for these areas."
```

### Step 3: Add Tests Incrementally
```
"For [module name]:
1. Write tests for the most critical functionality first
2. Test one behavior at a time
3. Run tests to ensure they pass with current implementation
4. Gradually increase coverage
Don't try to achieve 100% coverage immediately."
```

### Step 4: Test-Supported Refactoring
```
"Now that we have tests for [module name]:
1. Refactor for [specific improvement]
2. Run tests after each change
3. If tests fail, revert and try different approach
4. Once refactoring is complete, review if new tests are needed"
```

## Configuration for Windsurf Cascade

### Project Setup

Create `.windsurf/rules` with TDD principles:

```markdown
# TDD Default Mode

## Test-First Development
- Write failing tests before implementation code
- Tests define behavior, implementation fulfills tests
- No implementation without corresponding tests

## Test Quality
- Tests must be meaningful, not superficial
- Test behavior, not implementation details
- Use realistic test data, not trivial examples
- Assert meaningful outcomes, not just "doesn't crash"

## Phase Discipline
- RED: Write failing tests only, no implementation
- GREEN: Minimal code to pass tests, no extras
- REFACTOR: Improve code while keeping tests passing

## Reverting Over Fixing
- If tests fail during refactor, revert immediately
- Rethink approach rather than patching failures
- Clean solutions over accumulated fixes
```

### Test Execution

Configure automatic test running:
- Run tests on file save (immediate feedback)
- Display test results in editor
- Highlight untested code paths
- Show coverage metrics (but don't worship them)

## Common Pitfalls to Avoid

1. **Writing tests after implementation**
   - Defeats the purpose of TDD
   - Tests become biased toward existing implementation
   - Miss opportunities to improve design

2. **Testing implementation details**
   - Tests break when refactoring
   - Couples tests to internal structure
   - Focus on what, not how

3. **Over-mocking**
   - Tests mock everything, test nothing real
   - False confidence in passing tests
   - Mock only external boundaries

4. **Vague assertions**
   - `assert result is not None` tells you nothing
   - Be specific about expected values
   - Check all relevant aspects of the result

5. **Skipping the refactor phase**
   - Accumulates technical debt
   - Code becomes harder to maintain
   - Tests become harder to understand

6. **Making tests pass by modifying tests**
   - Tests must remain honest behavior specification
   - If test is wrong, fix in RED phase, not GREEN
   - Implementation should satisfy tests, not vice versa

## Success Indicators

You're doing TDD well when:
- [ ] Every feature starts with a failing test
- [ ] Tests are written before implementation
- [ ] Tests pass after minimal implementation
- [ ] Code improves during refactoring while tests stay green
- [ ] Tests catch bugs before production
- [ ] Refactoring is safe and frequent
- [ ] Test failures indicate real problems
- [ ] New team members understand behavior from tests

## Quick Reference Card

| Phase | Action | Allowed | Forbidden |
|-------|--------|---------|-----------|
| RED | Write failing tests | Write tests, identify edge cases | Write implementation, modify existing tests to pass |
| GREEN | Pass tests minimally | Write minimal code, hardcode values temporarily | Add untested features, optimize prematurely |
| REFACTOR | Improve code | Restructure, rename, optimize while tests pass | Change behavior, add features, let tests fail |

## Conclusion

TDD is a discipline that requires practice. The key principles:

1. **Tests first** - Always
2. **Minimal code** - Just enough to pass
3. **Refactor ruthlessly** - But keep tests green
4. **Revert over patch** - Clean solutions win
5. **Meaningful tests** - Quality over coverage

When in doubt, return to the cycle: RED → GREEN → REFACTOR.