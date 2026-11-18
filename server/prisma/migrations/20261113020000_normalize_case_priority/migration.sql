-- Copy recognized admission priorities into cases still using the original default.
WITH legacy_priorities(label, priority) AS (
    VALUES ('baja', 'LOW'), ('low', 'LOW'),
           ('media', 'MEDIUM'), ('medio', 'MEDIUM'), ('medium', 'MEDIUM'),
           ('alta', 'HIGH'), ('high', 'HIGH'),
           ('urgente', 'URGENT'), ('urgente (plazos corriendo)', 'URGENT'), ('urgent', 'URGENT')
), normalized AS (
    SELECT c.id, (
        SELECT lp.priority
        FROM json_each(CASE WHEN json_valid(c.details) THEN c.details ELSE '{}' END) AS field
        JOIN legacy_priorities AS lp ON lp.label = lower(trim(field.value))
        WHERE field.key IN ('nivelUrgencia', 'urgencia') AND field.type = 'text'
        ORDER BY field.key
        LIMIT 1
    ) AS priority
    FROM "Case" AS c
    WHERE c.priority = 'MEDIUM'
)
UPDATE "Case"
SET priority = normalized.priority
FROM normalized
WHERE "Case".id = normalized.id AND normalized.priority <> 'MEDIUM';
