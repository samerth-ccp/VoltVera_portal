# KYC Document System — System Design

This document describes the system design for the KYC (Know Your Customer) document upload, re-upload, verification, and status management flow within the MLM platform.

---

## 1. Overview

### 1.1 Purpose

- Allow users to upload identity/business documents (PAN, Aadhaar, bank details, photo).
- Support admin review (approve/reject) with optional rejection reason.
- Support re-upload of rejected or pending documents and correct status transitions.
- Keep a single, consistent “overall” KYC status for the user and for the user-facing dashboard.

### 1.2 Key Behaviors

- **Two sources of truth for “overall” status:** `users.kyc_status` (authoritative for admin and business logic) and `kyc_documents` row with `document_type = 'kyc_profile'` (synced for user dashboard).
- **Re-upload:** When a user re-uploads a document that was previously rejected or pending, the user’s overall status is set to `pending` (and `kyc_profile` is synced), so the request moves to “Pending KYC” for admin review.
- **Document-level + user-level checks:** Re-upload status logic uses both user-level (`users.kyc_status` was rejected/pending) and document-level (the document being updated was rejected/pending) to avoid incorrect “rejected” after re-upload.

---

## 2. Architecture

### 2.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  KYCUpload.tsx          PendingUserDashboard.tsx    AdminKYCSections.tsx     │
│  (user upload/update)   (pending user replace)      (admin list + approve/   │
│                                                      reject per document)   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 │ HTTP (GET/POST/PUT/PATCH)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Express)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  routes.ts          GET /api/kyc, POST /api/kyc, PUT /api/kyc/:documentId  │
│  mlmRoutes.ts       GET /api/admin/kyc, PATCH /api/admin/kyc/:id,           │
│                     GET /api/admin/kyc/:userId/documents                      │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORAGE LAYER (DatabaseStorage)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  getUserKYCDocuments(userId)     createKYCDocument(userId, data)             │
│  updateKYCDocument(id, data)     updateKYCStatus(kycId, status, reason?)      │
│  getAllPendingKYC()              getKYCDocumentById(id)                      │
│  getUserKYCInfo(userId)          fixExistingKYCStatuses()                      │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  users (kyc_status, kyc_approved_at, ...)                                    │
│  kyc_documents (per-document rows + kyc_profile row per user)                 │
│  notifications (kyc_status_change, etc.)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Stores

| Store            | Purpose |
|------------------|--------|
| **users**        | One row per user. `kyc_status` = overall KYC state (`pending` \| `approved` \| `rejected`). Used for admin filtering and business logic. |
| **kyc_documents**| One row per document (or per “logical” document). Includes a special row per user with `document_type = 'kyc_profile'` used as a status mirror for the user dashboard. |
| **notifications**| In-app notifications for KYC status changes (e.g. re-verification submitted, approved, rejected). |

---

## 3. Data Model

### 3.1 users (KYC-relevant fields)

| Field           | Type      | Description |
|-----------------|-----------|-------------|
| id              | UUID      | Primary key. |
| kyc_status      | enum      | `'pending' \| 'approved' \| 'rejected'`. **Source of truth for overall KYC.** |
| kyc_submitted_at| timestamp | When user first submitted KYC. |
| kyc_approved_at | timestamp | Set when `kyc_status` becomes `approved`. |
| kyc_deadline    | timestamp | Optional deadline for KYC. |
| kyc_locked      | boolean   | Account lock if deadline missed. |

### 3.2 kyc_documents

| Field               | Type      | Description |
|---------------------|-----------|-------------|
| id                  | UUID      | Primary key. |
| user_id             | UUID      | FK to users. |
| document_type       | varchar   | `'pan_card' \| 'aadhaar_front' \| 'aadhaar_back' \| 'bank_details' \| 'photo' \| 'kyc_profile'`. |
| document_url        | varchar   | Legacy; for DB constraint; placeholder when using binary. |
| document_data       | text      | Base64 document content. |
| document_content_type| varchar  | MIME type. |
| document_filename   | varchar   | Original filename. |
| document_size       | integer   | Size in bytes. |
| document_number     | varchar   | PAN/Aadhaar number if applicable. |
| status              | enum      | `'pending' \| 'approved' \| 'rejected'`. |
| rejection_reason    | text      | Set when status = rejected. |
| reviewed_by         | varchar   | e.g. 'admin'. |
| reviewed_at         | timestamp | When last reviewed. |
| created_at, updated_at | timestamp | Audit. |

**Special row: `document_type = 'kyc_profile'`**

- One per user; created at registration approval.
- No user-uploaded file; used only as a **status mirror** for the user dashboard.
- Must be kept in sync with `users.kyc_status` whenever overall status changes (re-upload or admin approve/reject).

### 3.3 Status Consistency Rule

- **Authoritative:** `users.kyc_status`.
- **Derived and synced:** `kyc_documents.status` where `document_type = 'kyc_profile'`.
- Overall status is **never** derived from `kyc_profile`; it is computed from **non-kyc_profile** documents (and re-upload rules), then written to both `users` and `kyc_profile`.

---

## 4. API Design

### 4.1 User-Facing APIs

| Method | Path                      | Auth   | Description |
|--------|---------------------------|--------|-------------|
| GET    | /api/kyc                  | User   | List current user’s KYC documents. |
| POST   | /api/kyc                  | User   | Create a new KYC document (first upload for a type). |
| POST   | /api/kyc/upload           | User   | Upload with multipart; backend may create or update. |
| PUT    | /api/kyc/:documentId      | User   | Replace document binary/metadata; triggers re-upload status logic. |
| PUT    | /api/kyc/documents/:id    | User/Admin | Update document (e.g. replace file); same storage logic as above. |

### 4.2 Admin APIs

| Method | Path                              | Auth  | Description |
|--------|-----------------------------------|-------|-------------|
| GET    | /api/admin/kyc                    | Admin | List all users with KYC data (for Pending/Rejected/Approved tabs). |
| GET    | /api/admin/kyc/:userId/documents  | Admin | List documents for one user (for review). |
| PATCH  | /api/admin/kyc/:id                | Admin | Set status of **one** document (`approved`/`rejected`); backend recalculates overall and syncs `kyc_profile`. |

Admin filtering uses **users.kyc_status** (e.g. `pending` / `rejected`), not `kyc_profile.status`.

---

## 5. Core Flows

### 5.1 First-Time Upload (Create)

1. User selects document type and file → client converts to Base64 (if applicable).
2. Client calls `POST /api/kyc` or `POST /api/kyc/upload` with type and payload.
3. Server checks for existing document of same type for that user:
   - If none: `createKYCDocument(userId, data)`.
4. In `createKYCDocument`:
   - Insert row into `kyc_documents` (status `pending`).
   - Optionally update `users.kyc_submitted_at`.
   - If `users.kyc_status === 'rejected'`, set `users.kyc_status = 'pending'`, clear `kyc_approved_at`, and sync `kyc_profile` to `pending`; create re-verification notification.

### 5.2 Re-upload (Update Existing Document)

1. User selects same document type and new file → client sends `PUT /api/kyc/:documentId` (or equivalent) with new binary/metadata.
2. Server loads document and owner: `currentDoc`, `currentUser`.
3. **Re-upload detection (critical for status):**
   - `wasRejected = (currentUser.kyc_status === 'rejected')`
   - `isPending = (currentUser.kyc_status === 'pending')`
   - `docWasRejected = (currentDoc.status === 'rejected')`
   - `docWasPending = (currentDoc.status === 'pending')`
4. **Document update:**
   - Set document `status = 'pending'`, clear `rejection_reason`, `reviewed_by`, `reviewed_at`; update binary/metadata.
5. **Overall status calculation (excluding `kyc_profile`):**
   - Fetch all non-`kyc_profile` documents for the user.
   - If **any** of `(wasRejected \|\| isPending \|\| docWasRejected \|\| docWasPending)` → `overallKYCStatus = 'pending'`.
   - Else: if any doc `rejected` → `rejected`; else if all approved → `approved`; else → `pending`.
6. **Persistence:**
   - Update `users.kyc_status` (and `kyc_approved_at` when approved).
   - Update `kyc_profile` row to match `overallKYCStatus` (and clear rejection reason when moving to pending).
7. **Notification:** If overall is `pending` and re-upload was detected (user or doc was rejected/pending), create “KYC Re-verification Request Submitted” (or similar).

This ensures that re-uploading a rejected (or pending) document always moves the user to **Pending** and keeps admin and user views consistent.

### 5.3 Admin Approve/Reject One Document

1. Admin chooses Approve or Reject (optional reason) for **one** document id.
2. Client calls `PATCH /api/admin/kyc/:id` with `{ status, rejectionReason? }`.
3. Server in `updateKYCStatus(kycId, status, reason)`:
   - Update that document’s `status`, `rejection_reason`, `reviewed_by`, `reviewed_at`.
   - Load all **non-kyc_profile** documents for the same user.
   - Compute overall: any `rejected` → `rejected`; else all `approved` → `approved`; else `pending`.
   - Update `users.kyc_status` (and `kyc_approved_at`).
   - **Sync** `kyc_profile` row to same status (and rejection reason if rejected).
   - If overall status changed, create KYC status notification.

Admin does **not** update `kyc_profile` directly; the backend always recalculates from real documents and then syncs `kyc_profile`.

---

## 6. Status Calculation Rules (Summary)

- **Overall KYC status** is derived only from rows in `kyc_documents` where `document_type != 'kyc_profile'`.
- **Re-upload path:** If the **user** was rejected/pending **or** the **document being updated** was rejected/pending → set overall to `pending` (and sync `kyc_profile`).
- **Otherwise:**  
  - If any (non-profile) document is `rejected` → overall `rejected`.  
  - Else if all are `approved` → overall `approved`.  
  - Else → overall `pending`.
- After every change to overall status (re-upload or admin action), both `users.kyc_status` and the user’s `kyc_profile` row are updated to the same value.

---

## 7. User Dashboard vs Admin Panel

| Concern              | Source of truth       | Where used |
|----------------------|-----------------------|------------|
| Admin tabs (Pending/Rejected/Approved) | `users.kyc_status` | Admin panel |
| User “Overall KYC status” display     | `kyc_profile.status` (synced from `users.kyc_status`) | User dashboard |
| Per-document status  | `kyc_documents.status` for that document type | Both (admin + user) |

Keeping `kyc_profile` in sync on every re-upload and every admin action avoids the bug where the user dashboard still showed “rejected” after re-upload.

---

## 8. Notifications

- **Re-verification submitted:** When a re-upload moves the user to `pending` (e.g. after rejection).
- **KYC document updated:** When an update results in `pending` but not necessarily from a prior rejection.
- **KYC approved/rejected:** When admin action changes overall status; only sent when `users.kyc_status` actually changes.

---

## 9. Security and Validation

- **Auth:** User endpoints require the authenticated user; document id must belong to that user. Admin endpoints require admin role.
- **File size:** e.g. 10MB limit (enforced on Base64 length where applicable).
- **Format:** Base64 and content-type validated; document type allowed list enforced.
- **Idempotency:** Re-upload is an update by document id; no duplicate document rows created for the same type.

---

## 10. Error Handling and Edge Cases

- **Document not found:** 404 when document id does not exist or does not belong to the user.
- **Missing body fields:** 400 when required fields (e.g. documentData, content type, filename) are missing.
- **Re-upload and “approved” user:** If the **document** being replaced was rejected/pending, overall status is still forced to `pending` so the new file is reviewed (document-level check prevents leaving overall “approved” when a rejected doc is re-uploaded).
- **kyc_profile missing:** Logged; user and document updates still applied so admin view remains correct; dashboard may show fallback until profile is created (e.g. by migration).

---

## 11. References in Codebase

| Concern              | Location (approx.) |
|----------------------|--------------------|
| Re-upload status logic (user + doc flags) | `server/storage.ts` — `updateKYCDocument()` |
| Sync `kyc_profile` on re-upload | Same; after updating `users.kyc_status` |
| Admin status update + `kyc_profile` sync | `server/storage.ts` — `updateKYCStatus()` |
| Create KYC document; reject → pending on new upload | `server/storage.ts` — `createKYCDocument()` |
| Admin list (getAllPendingKYC) | `server/storage.ts` — `getAllPendingKYC()` |
| User KYC info for dashboard | `server/storage.ts` — `getUserKYCInfo()` |
| User upload/replace API | `server/routes.ts` — GET/POST/PUT /api/kyc* |
| Admin KYC API | `server/mlmRoutes.ts` — /api/admin/kyc* |
| Document types and schema | `shared/schema.ts` — `kycDocuments`, enums |

This system design reflects the current behavior including the re-upload status fix (user- and document-level checks) and the consistent syncing of `kyc_profile` with `users.kyc_status`.
