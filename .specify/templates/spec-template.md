# Feature Specification: [TÊN FEATURE]

**Feature ID**: `NNN-feature-name`
**Branch**: `NNN-feature-name`
**Status**: Draft | Clarified | Approved | Implemented
**Created**: YYYY-MM-DD
**Depends on**: [feature IDs hoặc "—"]

---

## 1. Context & Goal
- **Bối cảnh**: [Vấn đề / tình huống]
- **Mục tiêu**: [Kết quả mong muốn, đo được]
- **Chỉ số thành công**: [Metric]

## 2. Actors
| Actor | Mô tả | Mục tiêu |
|---|---|---|

## 3. Functional Requirements (EARS)
| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-NNN-01 | Ubiquitous | THE system SHALL … |
| FR-NNN-02 | Event-driven | WHEN …, THE system SHALL … |
| FR-NNN-03 | State-driven | WHILE …, THE system SHALL … |
| FR-NNN-04 | Unwanted | IF …, THEN THE system SHALL … |
| FR-NNN-05 | Optional | WHERE …, THE system SHALL … |

## 4. Non-Functional Requirements
| ID | Nhóm | Yêu cầu (EARS, có số đo) |
|---|---|---|

## 5. Data Model
[TypeScript interface / Zod schema / key lưu trữ]

## 6. API Spec (Client-side contracts)
[Hook, service, store action, event, URL format — chữ ký hàm, input/output]

## 7. Error Handling
| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|

## 8. Acceptance Criteria
| ID | FR | Given | When | Then |
|---|---|---|---|---|

## 9. Out of Scope
- …

---
## Review Checklist
- [ ] Không còn `[NEEDS CLARIFICATION]`
- [ ] Mọi FR theo EARS và kiểm thử được
- [ ] Mọi FR có ít nhất 1 AC
- [ ] Không yêu cầu backend (Constitution §II)
