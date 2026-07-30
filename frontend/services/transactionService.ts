/**
 * transactionService.ts
 *
 * Service layer for transaction history operations.
 * Fetches and manages blockchain transactions related to user's certificates.
 *
 * In production, this service would query:
 * - Stellar Horizon API for transaction history
 * - Provenance contract for certificate-specific events
 * - Local indexer/cache for fast lookups
 *
 * Currently provides mock data matching the expected shape for UI development.
 */

import type {
    Transaction,
    TransactionFilters,
    TransactionListResponse,
    TransactionPaginationOptions,
    TransactionType,
    ExportOptions,
} from "@/types/transaction.types";

// ---------------------------------------------------------------------------
// Mock data generation
// ---------------------------------------------------------------------------

const TRANSACTION_TYPES: TransactionType[] = [
    "certificate_mint",
    "certificate_transfer",
    "certificate_revoke",
    "certificate_renew",
    "verification_submit",
    "verification_complete",
    "metadata_update",
];

const TYPE_DESCRIPTIONS: Record<TransactionType | "all", string> = {
    all: "All transactions",
    certificate_mint: "Certificate minted",
    certificate_transfer: "Certificate transferred",
    certificate_revoke: "Certificate revoked",
    certificate_renew: "Certificate renewed",
    verification_submit: "Verification request submitted",
    verification_complete: "Verification completed",
    metadata_update: "Certificate metadata updated",
};

function generateMockTransactions(count: number): Transaction[] {
    const transactions: Transaction[] = [];
    const now = Date.now();
    const mockAddresses = [
        "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
        "GDRXE2BQUC3AZNPVFSCEZ76DV3LW64R3Q5JMB6G3ZP4U7OV6GCFYXFGH",
        "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    ];

    for (let i = 0; i < count; i++) {
        const type = TRANSACTION_TYPES[Math.floor(Math.random() * TRANSACTION_TYPES.length)];
        const status = Math.random() > 0.95 ? "failed" : Math.random() > 0.9 ? "pending" : "success";
        const timestamp = now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000); // Random within last 30 days
        const address = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
        const txHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 10)}`;

        transactions.push({
            id: `tx_${i}_${txHash.substring(0, 8)}`,
            type,
            status,
            timestamp,
            userAddress: address,
            certificateId: type.includes("certificate") ? `CERT-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : undefined,
            amount: Math.random() > 0.7 ? (Math.random() * 10).toFixed(4) : undefined,
            description: TYPE_DESCRIPTIONS[type],
            metadata: {
                network: "testnet",
                operations: Math.floor(Math.random() * 3) + 1,
            },
            stellarTxHash: txHash,
            sourceAccount: address,
            fee: Math.floor(Math.random() * 10000) + 100,
            ledger: 1234567 + i,
        });
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

// Generate initial mock data
const MOCK_TRANSACTIONS = generateMockTransactions(150);

// ---------------------------------------------------------------------------
// Service API
// ---------------------------------------------------------------------------

/**
 * Fetch paginated transaction history with optional filters.
 */
export async function fetchTransactionHistory(
    userAddress: string,
    filters?: TransactionFilters,
    pagination?: TransactionPaginationOptions
): Promise<TransactionListResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    // Filter transactions
    let filtered = MOCK_TRANSACTIONS.filter((tx) => tx.userAddress === userAddress);

    if (filters?.type && filters.type !== "all") {
        filtered = filtered.filter((tx) => tx.type === filters.type);
    }

    if (filters?.status) {
        filtered = filtered.filter((tx) => tx.status === filters.status);
    }

    if (filters?.startDate) {
        const startTime = filters.startDate.getTime();
        filtered = filtered.filter((tx) => tx.timestamp >= startTime);
    }

    if (filters?.endDate) {
        const endTime = filters.endDate.getTime();
        filtered = filtered.filter((tx) => tx.timestamp <= endTime);
    }

    if (filters?.certificateId) {
        filtered = filtered.filter((tx) => tx.certificateId === filters.certificateId);
    }

    if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
            (tx) =>
                tx.description.toLowerCase().includes(query) ||
                tx.stellarTxHash.toLowerCase().includes(query) ||
                tx.certificateId?.toLowerCase().includes(query)
        );
    }

    // Paginate
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const transactions = filtered.slice(startIndex, endIndex);

    return {
        transactions,
        total,
        page,
        limit,
        hasMore: endIndex < total,
    };
}

/**
 * Fetch a single transaction by hash.
 */
export async function fetchTransactionById(txHash: string): Promise<Transaction | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_TRANSACTIONS.find((tx) => tx.stellarTxHash === txHash) ?? null;
}

/**
 * Export transactions to CSV or JSON format.
 */
export async function exportTransactions(
    userAddress: string,
    options: ExportOptions
): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch all matching transactions
    const result = await fetchTransactionHistory(
        userAddress,
        options.filters,
        { page: 1, limit: 10000 } // Get all for export
    );

    const transactions = result.transactions;

    if (options.format === "csv") {
        return generateCSV(transactions, options.includeMetadata);
    } else {
        return JSON.stringify(transactions, null, 2);
    }
}

/**
 * Generate CSV from transactions.
 */
function generateCSV(transactions: Transaction[], includeMetadata = false): string {
    const headers = [
        "Transaction Hash",
        "Type",
        "Status",
        "Date",
        "Certificate ID",
        "Amount (XLM)",
        "Fee (stroops)",
        "Ledger",
        "Description",
    ];

    if (includeMetadata) {
        headers.push("Metadata");
    }

    const rows = transactions.map((tx) => {
        const row = [
            tx.stellarTxHash,
            tx.type,
            tx.status,
            new Date(tx.timestamp).toISOString(),
            tx.certificateId ?? "",
            tx.amount ?? "",
            tx.fee.toString(),
            tx.ledger.toString(),
            tx.description,
        ];

        if (includeMetadata && tx.metadata) {
            row.push(JSON.stringify(tx.metadata));
        }

        return row.map((cell) => `"${cell}"`).join(",");
    });

    return [headers.join(","), ...rows].join("\n");
}

/**
 * Get transaction statistics for a user.
 */
export async function getTransactionStats(userAddress: string): Promise<{
    total: number;
    byType: Record<TransactionType | "all", number>;
    byStatus: Record<string, number>;
    last30Days: number;
}> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const userTransactions = MOCK_TRANSACTIONS.filter((tx) => tx.userAddress === userAddress);
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const byType: Record<string, number> = { all: userTransactions.length };
    const byStatus: Record<string, number> = {};

    TRANSACTION_TYPES.forEach((type) => {
        byType[type] = userTransactions.filter((tx) => tx.type === type).length;
    });

    userTransactions.forEach((tx) => {
        byStatus[tx.status] = (byStatus[tx.status] ?? 0) + 1;
    });

    const last30Days = userTransactions.filter((tx) => tx.timestamp >= thirtyDaysAgo).length;

    return {
        total: userTransactions.length,
        byType: byType as Record<TransactionType | "all", number>,
        byStatus,
        last30Days,
    };
}
