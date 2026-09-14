# UNI-NEXUS QA Agent Instructions

These instructions govern all UNI-NEXUS production QA sessions performed by Codex in this repository.

## 1. Objective

Test UNI-NEXUS as a real Quality Assurance tester by interacting with the visible frontend through Playwright MCP.

The workbook is the authoritative test specification and result tracker. Source-code inspection, backend requests, database access, unit tests, and API calls must never replace the required frontend interaction.

Do not fix application defects during a QA session. Testing and defect repair are separate tasks.

## 2. Authoritative Files and Environment

- Frontend URL: `http://localhost:5173/`
- Test workbook: `Pengujian UNI-NEXUS.xlsx` in the repository root
- Test credentials: `.env.user.local`
- Persistent instructions: this repository-root `AGENTS.md`
- Browser interface: Playwright MCP

The correct credential filename is `.env.user.local`.

Never use or search for `.env.users.local` as the credential source.

Never expose usernames, emails, passwords, tokens, or other secrets in chat responses, logs, screenshots, workbook notes, evidence filenames, or terminal output. Refer to credentials only by account label and role, such as `ACCOUNT #3 — Admin`.

## 3. Language Requirements

`Pengujian UNI-NEXUS.xlsx` is written in Indonesian.

- Read and understand every Indonesian instruction carefully.
- Follow the complete meaning of `Langkah Uji`.
- Compare the application against the complete `Expected Result`.
- Do not loosely translate, shorten, summarize, reinterpret, merge, or omit test steps.
- Write all entries in `Keterangan Pasca-Pengujian` in clear Indonesian.
- Final QA reports may use Indonesian unless the user requests otherwise.

If a test case is ambiguous, apply the most literal and conservative interpretation supported by the written steps. Record the result as `Bug/Failed` and explain the ambiguity and interpretation in `Keterangan Pasca-Pengujian`.

## 4. Session Size and Sequential Progress

A normal production QA session contains exactly 10 newly executed test cases.

- The first Codex production session starts at worksheet row 42.
- Its intended initial range is rows 42–51.
- Later sessions continue in ascending worksheet-row order after the last completed production batch.
- Always re-read the current workbook before selecting a session.
- The workbook, not chat memory, determines current progress.
- Rows before row 42 are protected historical or dry-run results.
- In particular, preserve the existing results in rows 34, 39, 40, and 41.
- Never overwrite any test case that already has a completed or user-recorded result.
- If a completed row occurs inside the next sequence, preserve it and continue forward until 10 new test cases have been executed.
- If fewer than 10 untested cases remain, execute all remaining cases and report that the suite is complete.
- Stop after the current batch. Never begin another batch automatically.

A new Codex chat and a continued Codex chat follow the same selection process. Never rely only on previous conversation context.

## 5. Mandatory Preflight

Complete the following before consuming any test-case row:

1. Read this `AGENTS.md`.
2. Confirm that `Pengujian UNI-NEXUS.xlsx` exists in the repository root.
3. Confirm that `.env.user.local` exists.
4. Confirm that the workbook can be opened in read-only mode.
5. Confirm that Microsoft Excel or another process is not locking the workbook.
6. Confirm that the frontend is running at `http://localhost:5173/`.
7. Confirm that the backend required by the frontend is running.
8. Confirm that Playwright MCP browser tools are available.
9. Navigate to the frontend and capture a browser snapshot to prove actual Playwright availability.
10. Inspect the workbook headers and locate columns by header text, not assumed column letters.
11. Confirm the presence of:
    - `Test Case ID`
    - `Use Case`
    - `Role/User`
    - `Langkah Uji`
    - `Expected Result`
    - `Status`
    - `Keterangan Pasca-Pengujian`
12. Create a timestamped safety copy of the workbook in a temporary location outside the repository.
13. Record the original workbook SHA-256 hash.

Frontend or backend readiness checks are only preflight checks. They are not substitutes for executing test cases through the UI.

If the global environment, Playwright MCP, frontend, backend, credential file, or workbook is unavailable before testing begins, stop the session without editing or consuming any test-case rows. Report the preflight failure.

## 6. Test-Case Selection

Select the next 10 untested test cases in ascending worksheet-row order, beginning from the current continuation point.

For every selected row, read the complete values of:

- `Test Case ID`
- `Use Case`
- `Role/User`
- `Langkah Uji`
- `Expected Result`
- `Status`
- `Keterangan Pasca-Pengujian`

Do not:

- choose convenient cases out of order;
- skip negative or complex cases;
- replace a specified role with another role;
- repeat completed cases;
- change the written test definition;
- mark a case based only on source-code analysis.

Record the selected worksheet rows and Test Case IDs before browser execution.

## 7. Frontend-Only Execution

Every application test action must be performed through the visible UNI-NEXUS frontend with Playwright MCP.

This includes:

- opening pages;
- logging in and logging out;
- changing workspaces;
- clicking buttons and links;
- completing forms;
- selecting dropdown options;
- uploading files when instructed;
- submitting, editing, or deleting test data when instructed;
- observing validation messages;
- inspecting visible role restrictions;
- confirming success, failure, and empty states.

Mandatory rules:

1. Use a visible browser whenever supported.
2. Follow `Langkah Uji` in its written order.
3. Do not omit a step because the expected result appears obvious.
4. Do not use direct HTTP or backend API calls as a substitute.
5. Do not use curl, Postman, database queries, seed scripts, or direct storage manipulation as a substitute.
6. Do not determine Pass or Bug/Failed solely from source code.
7. Browser console and network information may be supplementary evidence only.
8. Do not alter application source code during testing.
9. Do not repair a defect during the session.
10. Do not create unrelated application data.

## 8. Accounts, Roles, and Browser State

Use only credentials from `.env.user.local`.

For each test case:

- Select an account whose role matches `Role/User`.
- Verify the logged-in identity or role through visible frontend behavior where possible.
- Verify the active workspace when the case depends on a workspace.
- Never print or copy credential values into the final report.
- Never include a screenshot showing a visible password.

Prevent state leakage between unrelated test cases:

- Log out through the frontend when changing users where appropriate.
- Use a clean browser context or equivalent state reset when cases are independent.
- Clear unintended form and navigation state.
- Preserve state only when the written test case explicitly depends on earlier state.
- Do not reset application or database data directly unless the test steps explicitly require it.

If Playwright or the browser crashes before an application result can be observed, restore the testing environment and restart that test case from its first step. Do not infer its result from a partial execution.

## 9. Result Policy

The `Status` column permits only these exact values:

- `Pass`
- `Bug/Failed`

Never write:

- `Blocked`
- `Ambiguous`
- `Skipped`
- `Not Tested`
- `Unable to Test`
- `N/A`
- any other status value

### Pass

Use `Pass` only when:

- all required test steps were completed;
- the correct role and relevant preconditions were used;
- every applicable part of `Expected Result` was visibly satisfied;
- no contradicting frontend behavior was observed.

A page merely loading without an exception is not sufficient for Pass.

### Bug/Failed

Use `Bug/Failed` whenever the case does not fully qualify for Pass, including when:

- actual behavior contradicts the expected result;
- only part of the expected result works;
- a required feature is missing or has not been built;
- a required menu, button, form, field, or action is unavailable;
- access or role behavior is incorrect;
- the workflow cannot be completed from the frontend;
- required application data or a case-specific prerequisite is unavailable;
- the test case is ambiguous;
- an unexpected validation, navigation, display, or application error occurs;
- the result is not technically a software exception but still prevents satisfaction of the expected result.

Do not use a third status to represent these conditions.

## 10. Keterangan Pasca-Pengujian

Every newly tested row must receive an Indonesian entry in `Keterangan Pasca-Pengujian`.

For a Pass, state concisely:

- what was performed;
- the important visible result;
- the evidence location.

For a Bug/Failed, provide a complete but focused description containing:

1. the step at which the issue occurred;
2. the expected behavior;
3. the actual visible behavior;
4. which requirement was not satisfied;
5. whether the feature was missing, ambiguous, unavailable, or behaved incorrectly;
6. the account label and role used, without credentials;
7. relevant screenshot evidence paths.

Do not write vague notes such as:

- “Tidak bisa”
- “Error”
- “Fitur bermasalah”
- “Blocked”
- “Ambiguous”

Explain what was attempted and what was visibly observed.

Do not include speculation about the root cause unless directly supported by evidence. Do not claim that code or backend logic caused a defect when only frontend behavior was observed.

## 11. Evidence

Capture browser evidence for every test case.

- At least one final-state screenshot is required for a Pass.
- A Bug/Failed must include screenshots showing the relevant action and resulting problem whenever technically possible.
- Capture intermediate screenshots when one final screenshot cannot establish the full result.
- Do not expose passwords or secrets.

Store evidence using a session-specific structure such as:

`test-evidence/session-<START_ROW>-<END_ROW>/<TEST_CASE_ID>/`

Use descriptive filenames, for example:

- `01-initial-state.png`
- `02-form-submitted.png`
- `03-actual-result.png`
- `04-error-message.png`

Evidence supplements the written result. A screenshot alone does not replace complete execution of `Langkah Uji`.

## 12. Workbook Editing

Treat `Pengujian UNI-NEXUS.xlsx` as a controlled QA record.

Only modify these cells for newly executed test cases:

- `Status`
- `Keterangan Pasca-Pengujian`

Do not modify:

- Test Case IDs;
- Use Cases;
- roles;
- test steps;
- expected results;
- completed historical results;
- unrelated cells or rows.

Preserve all existing workbook features, including:

- worksheet names and order;
- values and formulas;
- cell styles and number formats;
- fonts, fills, borders, and alignment;
- row heights and column widths;
- merged cells;
- filters and frozen panes;
- hidden rows, columns, and worksheets;
- data validation and dropdowns;
- conditional formatting;
- hyperlinks, comments, images, charts, and other workbook objects.

Do not:

- convert the workbook to CSV;
- rebuild it from scratch;
- create a replacement worksheet;
- sort or reorder test cases;
- add columns;
- rename the workbook;
- leave a partially written workbook;
- modify validation rules merely to accommodate another status;
- commit or push testing artifacts.

Maintain a temporary session result ledger after each browser test so evidence is not lost if the session is interrupted. Apply the completed results to the workbook using a controlled atomic save.

After saving:

1. Reopen the workbook.
2. Confirm it is readable and not corrupted.
3. Confirm all new statuses and notes persisted in their correct Test Case ID rows.
4. Confirm completed historical results remain unchanged.
5. Confirm worksheet names, order, dimensions, headers, and Test Case ID ordering remain unchanged.
6. Perform a logical before-and-after comparison.
7. Confirm that only the intended `Status` and `Keterangan Pasca-Pengujian` cells changed.
8. Record the final SHA-256 hash.

If workbook integrity validation fails, restore the safety copy and report the failure.

## 13. Interrupted Sessions

If a session stops before all 10 cases finish:

- do not fabricate remaining results;
- do not mark untouched rows;
- report exactly which cases completed;
- preserve existing evidence and the temporary result ledger;
- verify whether completed results reached the workbook;
- on resume, re-read the workbook first;
- restart any partially executed or uncertain test case from its first step.

An infrastructure-wide failure before application behavior can be observed pauses the session. It does not automatically consume a test-case row.

Once a test case has been executed and the application cannot satisfy its expected result because of missing UI, missing functionality, unavailable case-specific prerequisites, ambiguity, or other observable limitations, record `Bug/Failed`.

## 14. Final Session Report

After the current batch, report:

- session start and end rows;
- all executed Test Case IDs;
- Use Case for each test;
- required role and account label used;
- `Pass` or `Bug/Failed` for each case;
- concise expected-versus-actual result;
- evidence paths;
- exact workbook cells changed;
- original and final workbook hashes;
- workbook integrity-validation result;
- any tests restarted or session interruptions;
- the proposed starting row for the next session;
- whether fewer than 10 untested cases remain.

Never include credential values.

Stop after the report. Do not begin the next session, modify source code, fix defects, commit, or push unless the user gives a separate explicit instruction.