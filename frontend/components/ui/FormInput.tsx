"use client";

import React from "react";

import { cn } from "@/utils/cn";

export type FormInputState = "default" | "error" | "success";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  successText?: React.ReactNode;
  state?: FormInputState;
  showCharacterCount?: boolean;
}

const stateClasses: Record<FormInputState, string> = {
  default: "border-input focus-visible:border-primary focus-visible:ring-primary/25",
  error:
    "border-red-500 text-red-950 focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:text-red-50",
  success: "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/25",
};

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      id,
      label,
      helperText,
      errorText,
      successText,
      state,
      showCharacterCount = false,
      maxLength,
      value,
      defaultValue,
      className,
      disabled,
      required,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const resolvedState: FormInputState =
      state ?? (errorText ? "error" : successText ? "success" : "default");
    const hasError = resolvedState === "error";
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = errorText ? `${inputId}-error` : undefined;
    const successId = successText ? `${inputId}-success` : undefined;
    const counterId = showCharacterCount ? `${inputId}-counter` : undefined;
    const describedBy =
      [ariaDescribedBy, helperId, errorId, successId, counterId].filter(Boolean).join(" ") ||
      undefined;
    const rawLength = typeof value === "string" ? value.length : String(defaultValue ?? "").length;

    return (
      <div className="space-y-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            {label}
            {required ? (
              <span className="ml-1 text-red-600" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            "flex min-h-11 w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-950 shadow-sm transition-colors",
            "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500",
            stateClasses[resolvedState],
            className
          )}
          {...props}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-xs">
            {errorText ? (
              <p id={errorId} className="text-red-600 dark:text-red-400" role="alert">
                {errorText}
              </p>
            ) : successText ? (
              <p id={successId} className="text-emerald-600 dark:text-emerald-400">
                {successText}
              </p>
            ) : helperText ? (
              <p id={helperId} className="text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
            ) : null}
          </div>

          {showCharacterCount ? (
            <p
              id={counterId}
              className="shrink-0 text-xs text-gray-500 dark:text-gray-400"
              aria-live="polite"
            >
              {rawLength}
              {typeof maxLength === "number" ? `/${maxLength}` : null}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;
