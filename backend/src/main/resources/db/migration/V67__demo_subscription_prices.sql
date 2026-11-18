-- Demo/testing pricing: publish a new immutable version of every subscription plan at 1/1000 of its current price
-- (e.g. 4,900,000 VND -> 4,900 VND). Existing versions, orders and paid periods keep their historical terms.
WITH current_terms AS (
    SELECT v.plan_id, v.name, v.description, v.price_vnd, v.currency, v.duration_months, v.employee_seats,
           (SELECT max(h.revision) FROM platform.subscription_plan_version h WHERE h.plan_id = v.plan_id) + 1 AS next_revision
    FROM platform.subscription_plan p
    JOIN platform.subscription_plan_version v ON v.plan_id = p.plan_id AND v.version_id = p.current_version_id
), inserted AS (
    INSERT INTO platform.subscription_plan_version
        (version_id, plan_id, revision, name, description, price_vnd, currency,
         duration_months, employee_seats, created_at, created_by, creation_source)
    SELECT gen_random_uuid(), plan_id, next_revision, name, description,
           GREATEST(1, ROUND(price_vnd / 1000.0))::bigint, currency,
           duration_months, employee_seats, now(), NULL, 'SYSTEM'
    FROM current_terms
    RETURNING plan_id, version_id
)
UPDATE platform.subscription_plan p
SET current_version_id = i.version_id
FROM inserted i
WHERE p.plan_id = i.plan_id;
