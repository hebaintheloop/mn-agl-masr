# Optional event dress code

Leaders can set `dress_code` when creating an event. The Arabic label is "الزي المطلوب (اختياري)". It is preserved with the existing in-memory event draft. The value is trimmed and limited to 300 characters at both request boundaries and by the database constraint.

The public event response includes dress_code. Student and leader event pages, plus the design-preview event dialog, show the label and value only when nonempty. Existing events default to an empty value and show no extra section. Text renders as escaped React content.

Supabase migration adds only the event column. RLS, grants, contact editing, identity restrictions, automatic requests and attendance logic are unchanged. Gateway version 9 serves the new field.

Verification: production build and TypeScript, 19 unit tests, and the leader browser suite with event creation plus student detail visibility/empty-state assertions. Database storage was checked within a transaction that was rolled back, without retaining a test event. Browser mutations use intercepted fixtures.
