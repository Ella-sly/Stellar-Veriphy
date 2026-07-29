"use client";

import { useWizard } from "@/app/context/WizardContext";

export function SPVOptions() {
  const { encryptionEnabled, setEncryptionEnabled } = useWizard();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
          Encryption Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure encryption settings for your Stellar Provenance Verification.
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-black dark:text-white mb-2">
              Enable Encryption
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              When enabled, your manifest and attestation data will be encrypted before
              submission to the blockchain. This provides additional privacy for sensitive
              metadata while maintaining on-chain verification.
            </p>
          </div>
          <label className="flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={encryptionEnabled}
              onChange={(e) => setEncryptionEnabled(e.target.checked)}
              className="w-6 h-6 rounded"
            />
          </label>
        </div>
      </div>

      {encryptionEnabled && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ✓ Encryption is enabled. Your data will be encrypted using industry-standard
            algorithms before being submitted to the blockchain.
          </p>
        </div>
      )}
    </div>
  );
}
