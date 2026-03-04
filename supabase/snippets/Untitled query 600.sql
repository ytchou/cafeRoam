SELECT id, job_type, status, payload->>'shop_id', created_at
FROM job_queue
ORDER BY created_at DESC
LIMIT 5;