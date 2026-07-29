"use client";

/**
 * /report-issue
 *
 * A form that lets users report bugs, request features, or raise other issues.
 * On submit it opens a pre-filled GitHub new-issue URL in a new tab so the
 * user can review and submit the issue themselves.
 *
 * Validation is handled by react-hook-form.
 */

import { useForm } from "react-hook-form";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type IssueType = "bug" | "feature" | "other";

interface ReportIssueFormValues {
  issueType: IssueType;
  title: string;
  description: string;
  stepsToReproduce: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GITHUB_REPO = "your-org/Stellar-Veriphy"; // ← update to your actual repo
const GITHUB_NEW_ISSUE_URL = `https://github.com/${GITHUB_REPO}/issues/new`;

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: "🐛 Bug Report",
  feature: "✨ Feature Request",
  other: "💬 Other",
};

const ISSUE_TYPE_GITHUB_LABELS: Record<IssueType, string> = {
  bug: "bug",
  feature: "enhancement",
  other: "question",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGitHubUrl(values: ReportIssueFormValues): string {
  const typeLabel = ISSUE_TYPE_LABELS[values.issueType];
  const githubLabel = ISSUE_TYPE_GITHUB_LABELS[values.issueType];

  const body = [
    `## Description\n${values.description}`,
    values.issueType === "bug"
      ? `## Steps to Reproduce\n${values.stepsToReproduce}`
      : "",
    `---\n*Submitted via the in-app report form.*`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const params = new URLSearchParams({
    title: `[${typeLabel}] ${values.title}`,
    body,
    labels: githubLabel,
  });

  return `${GITHUB_NEW_ISSUE_URL}?${params.toString()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportIssuePage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportIssueFormValues>({
    defaultValues: {
      issueType: "bug",
      title: "",
      description: "",
      stepsToReproduce: "",
    },
  });

  const issueType = watch("issueType");

  const onSubmit = (values: ReportIssueFormValues) => {
    const url = buildGitHubUrl(values);
    window.open(url, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Report an Issue
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Found a bug or have a feature idea? Fill in the form below and
            we&apos;ll open a pre-filled GitHub issue for you to review and
            submit.
          </p>
        </div>

        {/* ── Success banner ── */}
        {submitted && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700"
          >
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✓ A GitHub issue tab has been opened. Thank you for your feedback!
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-sm text-green-700 dark:text-green-300 underline hover:no-underline"
            >
              Submit another report
            </button>
          </div>
        )}

        {/* ── Form ── */}
        {!submitted && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-6"
          >
            {/* Issue Type */}
            <fieldset>
              <legend className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Issue Type <span aria-hidden="true" className="text-red-500">*</span>
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {(["bug", "feature", "other"] as IssueType[]).map((type) => (
                  <label
                    key={type}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer text-sm font-medium transition-colors
                      ${
                        issueType === type
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-500"
                          : "border-gray-200 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
                      }`}
                  >
                    <input
                      type="radio"
                      value={type}
                      className="sr-only"
                      {...register("issueType", { required: true })}
                    />
                    {ISSUE_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
              {errors.issueType && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Please select an issue type.
                </p>
              )}
            </fieldset>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Title <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="Short, descriptive summary of the issue"
                aria-describedby={errors.title ? "title-error" : undefined}
                aria-invalid={!!errors.title}
                className={`w-full px-4 py-2.5 rounded-lg border text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${
                    errors.title
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                {...register("title", {
                  required: "Title is required.",
                  minLength: {
                    value: 5,
                    message: "Title must be at least 5 characters.",
                  },
                  maxLength: {
                    value: 120,
                    message: "Title must be 120 characters or fewer.",
                  },
                })}
              />
              {errors.title && (
                <p id="title-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Description <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder="Describe the issue or feature request in detail"
                aria-describedby={errors.description ? "description-error" : undefined}
                aria-invalid={!!errors.description}
                className={`w-full px-4 py-2.5 rounded-lg border text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y transition
                  ${
                    errors.description
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                {...register("description", {
                  required: "Description is required.",
                  minLength: {
                    value: 20,
                    message: "Please provide at least 20 characters.",
                  },
                })}
              />
              {errors.description && (
                <p id="description-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Steps to Reproduce — only shown for bug reports */}
            {issueType === "bug" && (
              <div>
                <label
                  htmlFor="stepsToReproduce"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                >
                  Steps to Reproduce{" "}
                  <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <textarea
                  id="stepsToReproduce"
                  rows={4}
                  placeholder={`1. Go to ...\n2. Click on ...\n3. Observe that ...`}
                  aria-describedby={
                    errors.stepsToReproduce ? "steps-error" : undefined
                  }
                  aria-invalid={!!errors.stepsToReproduce}
                  className={`w-full px-4 py-2.5 rounded-lg border text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm transition
                    ${
                      errors.stepsToReproduce
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  {...register("stepsToReproduce", {
                    required:
                      issueType === "bug"
                        ? "Steps to reproduce are required for bug reports."
                        : false,
                    minLength:
                      issueType === "bug"
                        ? {
                            value: 10,
                            message: "Please provide at least 10 characters.",
                          }
                        : undefined,
                  })}
                />
                {errors.stepsToReproduce && (
                  <p id="steps-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.stepsToReproduce.message}
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                {isSubmitting ? "Opening GitHub…" : "Open GitHub Issue →"}
              </button>
              <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-500">
                This will open a pre-filled GitHub issue in a new tab. You can
                review and edit it before submitting.
              </p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
