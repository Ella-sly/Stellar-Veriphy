/**
 * transaction.types.ts
 *
 * Type definitions for transaction history and details.
 */

// Transaction types for filtering
export type TransactionType =
    | "certificate_mint"
    | "certificate_transfer"
    | "certificate_revoke"
    | "certificate_renew"
    | "verification_submit"
    | "verification_complete"
    | "metadata_update"
    | "all";

// Transaction status
export type TransactionStatus = "pending" | "success" | "failed";

// Transaction record
export interface Transaction {
    /** Unique transaction hash from Stellar */
    id: string;
    /** Transaction type for filtering */
    type: TransactionType;
    /** Current status */
    status: TransactionStatus;
    /** Unix timestamp */
    timestamp: number;
    /** User's public key involved in transaction */
    userAddress: string;
    /** Related certificate ID (if applicable) */
    certificateId?: string;
    /** Transaction amount in XLM (if applicable) */
    amount?: string;
    /** Brief description */
    description: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Stellar Horizon transaction hash */
    stellarTxHash: string;
    /** Source account */
    sourceAccount: string;
    /** Fee paid in stroops */
    fee: number;
    /** Ledger number */
    ledger: number;
}

// Filters for transaction queries
export interface TransactionFilters {
    type?: TransactionType;
    status?: TransactionStatus;
    startDate?: Date;
    endDate?: Date;
    certificateId?: string;
    searchQuery?: string;
}

// Pagination
export interface TransactionPaginationOptions {
    page: number;
    limit: number;
}

// Transaction list response
export interface TransactionListResponse {
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// Export data format
export type ExportFormat = "csv" | "json";

export interface ExportOptions {
    format: ExportFormat;
    filters?: TransactionFilters;
    includeMetadata?: boolean;
}
