"use client";

import { useWizard } from "@/app/context/WizardContext";
import { TransactionTracker } from "@/components/TransactionTracker";

export function SPVResults() {
  const { spvResult, reset } = useWizard();

  const success = spvResult.success !== false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
          Verification Result
        </h2>
      </div>

      {success ? (
        <div className="p-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
            ✓ Verification Successful
          </h3>
          <div className="space-y-3 text-sm">
            {spvResult.certificateId && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">Certificate ID:</p>
                <code className="bg-green-100 dark:bg-green-800 px-3 py-2 rounded block break-all">
                  {spvResult.certificateId}
                </code>
              </div>
            )}
            {spvResult.manifestHash && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">Manifest Hash:</p>
                <code className="bg-green-100 dark:bg-green-800 px-3 py-2 rounded block break-all">
                  {spvResult.manifestHash}
                </code>
              </div>
            )}
            {spvResult.contentHash && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">Content Hash:</p>
                <code className="bg-green-100 dark:bg-green-800 px-3 py-2 rounded block break-all">
                  {spvResult.contentHash}
                </code>
              </div>
            )}
            {spvResult.attestationHash && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">Attestation Hash:</p>
                <code className="bg-green-100 dark:bg-green-800 px-3 py-2 rounded block break-all">
                  {spvResult.attestationHash}
                </code>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            ✗ Verification Failed
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-2">
            Please check your inputs and try again.
          </p>
        </div>
      )}

      {spvResult.transactionHash && (
        <TransactionTracker
          transactionHash={spvResult.transactionHash}
          status={success ? "success" : "failed"}
        />
      )}

      <button
        onClick={reset}
        className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
      >
        Verify Another
      </button>
    </div>
  );
}
