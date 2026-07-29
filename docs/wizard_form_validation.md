# Wizard Form Validation

## Overview

Improve multi-step wizard forms with progressive validation, field-level error messages, and step completion indicators to guide users through complex workflows without confusion or data loss.

## Problem Statement

Currently, wizard forms provide no real-time feedback during user input. Errors are only surfaced on final submission, causing users to backtrack through multiple steps to fix issues. There are no visual indicators showing which steps are complete or incomplete, and there is no barrier preventing navigation to the next step when the current step has errors.

## Acceptance Criteria

| # | Criterion | Description |
|---|-----------|-------------|
| 1 | Real-time field validation | Validate field values as the user types, with a short debounce (300–500ms) to avoid excessive feedback |
| 2 | Inline error messages | Display error text directly beneath the offending field, in red, with a descriptive message |
| 3 | Step completion indicators | Each step in the wizard header/sidebar shows a visual state: incomplete, in-progress, complete, or error |
| 4 | Prevent navigation with errors | The "Next" button is disabled or blocked when the current step contains validation errors |
| 5 | Error summary | On attempted submission, display a summary panel listing all unresolved errors across all steps |
| 6 | Field highlighting | Fields with errors receive a red border/outline; fields that pass validation receive a green outline |
| 7 | Validation on blur and submit | Validate a field when the user leaves it (blur) and re-validate all fields on submit |

## Validation Strategy

### Trigger Points

- **On change (debounced):** Validate as the user types, after a 300ms pause.
- **On blur:** Validate immediately when focus leaves a field.
- **On step advance:** Validate all fields in the current step before allowing navigation to the next step.
- **On submit:** Validate all fields across all steps and surface an error summary if any fail.

### Validation States per Field

```
untouched   → no border change, no error message
touched + valid   → green outline, no error message
touched + invalid → red outline, inline error message shown below field
```

### Step Indicator States

```
not-started  → neutral/grey indicator
in-progress  → blue/active indicator
complete     → green checkmark
has-errors   → red warning icon
```

## Error Message Guidelines

- Messages must be human-readable and specific. Avoid generic messages like "Invalid input".
- Examples:
  - Required: `"This field is required."`
  - Format: `"Please enter a valid email address."`
  - Length: `"Must be at least 8 characters."`
  - Range: `"Value must be between 1 and 100."`
- Messages appear directly below the field they belong to, in 12–13px red text.

## Error Summary Panel

When the user attempts final submission and errors exist:

1. A summary panel appears at the top of the form (or in a toast/modal).
2. It lists each error as a clickable link that scrolls/focuses the offending field.
3. It groups errors by step for multi-step forms.
4. The panel is dismissible but reappears on the next submit attempt if errors persist.

Example structure:

```
⚠ Please fix the following errors before submitting:

Step 1 – Provider Details
  • Company name is required.
  • Website URL is not valid.

Step 2 – Contact Info
  • Email address is required.
```

## Navigation Guard

- The "Next" / "Continue" button evaluates the current step's fields on click.
- If any field in the current step is invalid, navigation is blocked and all invalid fields in the step are marked with errors simultaneously.
- A brief shake animation on the button provides haptic-like feedback when blocked (see `micro_interactions.md`).
- Back navigation is always permitted regardless of validation state to avoid trapping the user.

## Accessibility Considerations

- Error messages must be linked to their fields via `aria-describedby`.
- Invalid fields must carry `aria-invalid="true"`.
- The error summary panel should receive focus when it appears (`role="alert"` or `role="alertdialog"`).
- Color alone must not be the only indicator of error state — always pair color with an icon or text label.

## Implementation Notes

- Use a form state management library (e.g., React Hook Form, Formik) to centralize validation logic.
- Define a validation schema per step (e.g., Zod or Yup) so rules are co-located with the step definition.
- Step completion state should be stored in a wizard context/store so the step indicator component can read it independently.
- Avoid re-validating untouched fields on initial render to prevent showing errors before the user has interacted.

## Files Likely Affected

- `frontend/src/components/wizard/` — wizard container, step components, navigation buttons
- `frontend/src/components/forms/` — shared input, select, textarea components
- `frontend/src/hooks/useFormValidation.ts` — custom validation hook
- `frontend/src/styles/` — form error and highlight styles

## Related Issues

- Issue 4: Micro-interactions (error shake animation, success checkmark on step complete)
