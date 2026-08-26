/**
 * E2E file-upload helpers.
 */

import { Page } from "@playwright/test";
import * as path from "path";

/** Absolute path to the E2E fixtures directory. */
const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

/**
 * Attach a fixture file to a file-input element identified by `inputSelector`.
 *
 * @param page           Playwright page
 * @param inputSelector  CSS / text locator for the <input type="file">
 * @param fileName       Name of the file inside e2e/fixtures/
 */
export async function uploadFixtureFile(
  page: Page,
  inputSelector: string,
  fileName: string
): Promise<void> {
  const filePath = path.join(FIXTURES_DIR, fileName);
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Drop a fixture file onto a drop-zone element.
 * Falls back to setInputFiles when a hidden <input type="file"> is present.
 */
export async function dropFixtureFile(
  page: Page,
  dropZoneSelector: string,
  fileName: string
): Promise<void> {
  const filePath = path.join(FIXTURES_DIR, fileName);
  const dropZone = page.locator(dropZoneSelector);

  // Try finding a hidden file input inside / near the drop zone first
  const hiddenInput = dropZone.locator('input[type="file"]');
  if ((await hiddenInput.count()) > 0) {
    await hiddenInput.setInputFiles(filePath);
    return;
  }

  // Playwright's dispatchEvent approach for custom drop zones
  const buffer = require("fs").readFileSync(filePath);
  const mimeType = fileName.endsWith(".json") ? "application/json" : "application/octet-stream";

  await dropZone.dispatchEvent("dragenter");
  await dropZone.dispatchEvent("dragover");
  await page.evaluate(
    ({
      selector,
      base64,
      name,
      type,
    }: {
      selector: string;
      base64: string;
      name: string;
      type: string;
    }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], name, { type });
      const dt = new DataTransfer();
      dt.items.add(file);
      el.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true }));
    },
    {
      selector: dropZoneSelector,
      base64: buffer.toString("base64"),
      name: fileName,
      type: mimeType,
    }
  );
}
