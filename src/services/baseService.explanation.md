# BaseService - Giải thích chi tiết cách hoạt động

## Ví dụ Query đầy đủ

```
GET /users?
  email=test@example.com&                    // Exact match
  status_in=1,2,3&                           // IN operator
  created_from=2024-01-01&                   // Range FROM
  created_to=2024-12-31&                     // Range TO
  email_not_null=true&                       // NOT NULL
  phone_number=1234567890&                   // Related table filter
  country=SG&                                 // Related table với field mapping
  page=2&                                    // Pagination
  limit=20&                                  // Pagination limit
  sort_by=created_at&                        // Sorting
  sort_order=DESC                            // Sort order
```

## Flow xử lý từng bước

### BƯỚC 1: Parse Query Parameters

**Input:** `req.query`

```javascript
{
  email: 'test@example.com',
  status_in: '1,2,3',
  created_from: '2024-01-01',
  created_to: '2024-12-31',
  email_not_null: 'true',
  phone_number: '1234567890',
  country: 'SG',
  page: '2',
  limit: '20',
  sort_by: 'created_at',
  sort_order: 'DESC'
}
```

**Method:** `parseFilters(query, options)`

**Process:**

1. Khởi tạo filters từ `defaultFilters`:

   ```javascript
   filters = { delete_at_is_null: true };
   ```

2. Loop qua từng query parameter:

   **a) `email=test@example.com`**
   - Check: `email` có trong `allowedFields`? ✅
   - Check: `email` có trong `relatedFieldMappings`? ❌
   - → Đây là main entity field
   - → Add: `filters.email = 'test@example.com'`

   **b) `status_in=1,2,3`**
   - Check: `status` có trong `allowedFields`? ✅
   - Detect: Value chứa `,` → Đây là IN operator
   - → Split: `['1', '2', '3']`
   - → Add: `filters.status_in = ['1', '2', '3']`

   **c) `created_from=2024-01-01`**
   - Check: `created_from` ends with `_from` → Range filter
   - Extract: `created` (base field name)
   - Parse date: `new Date('2024-01-01')` → Valid
   - → Add: `filters.created_from = '2024-01-01T00:00:00.000Z'`

   **d) `created_to=2024-12-31`**
   - Similar to `created_from`
   - → Add: `filters.created_to = '2024-12-31T00:00:00.000Z'`

   **e) `email_not_null=true`**
   - Check: Key ends with `_not_null` → NOT NULL operator
   - Extract: `email` (base field name)
   - → Add: `filters.email_not_null = true`

   **f) `phone_number=1234567890`**
   - Check: `phone_number` có trong `allowedFields`? ✅
   - Check: `phone_number` có trong `relatedFieldMappings`? ✅
   - → Đây là related table field
   - → Add: `filters.phone_number = '1234567890'` (sẽ map sau)

**Output:** Parsed filters

```javascript
{
  delete_at_is_null: true,        // từ defaultFilters
  email: 'test@example.com',
  status_in: ['1', '2', '3'],
  created_from: '2024-01-01T00:00:00.000Z',
  created_to: '2024-12-31T00:00:00.000Z',
  email_not_null: true,
  phone_number: '1234567890',
  country: 'SG',
}
```

---

### BƯỚC 2: Parse Pagination

**Method:** `parsePagination(query, options)`

**Process:**

```javascript
page = Math.max(1, parseInt('2') || 1) = 2
limit = Math.min(250, Math.max(1, parseInt('20') || 50)) = 20
```

**Output:**

```javascript
{
  page: 2,
  limit: 20
}
```

---

### BƯỚC 3: Parse Sorting

**Method:** `parseSorting(query, options)`

**Process:**

```javascript
sortBy = 'created_at' || 'created_at' = 'created_at'
sortOrder = 'DESC'.toUpperCase() = 'DESC'

// Validate: 'created_at' có trong allowedSortFields? ✅
```

**Output:**

```javascript
{
  sort_by: 'created_at',
  sort_order: 'DESC'
}
```

---

### BƯỚC 4: Build Query Builder

**Method:** `buildQuery(req, options)`

**Process:**

**4.1. Initialize Query Builder**

```javascript
repository = await this.getRepository(); // Get User repository
queryBuilder = repository.createQueryBuilder('user'); // Alias: 'user'
```

**4.2. Apply Joins**

```javascript
// Join 1: user_details
queryBuilder.leftJoinAndSelect('user_details', 'userDetails', 'user.id = userDetails.user_id');
// SQL: LEFT JOIN user_details userDetails ON user.id = userDetails.user_id

// Join 2: user_memberships
queryBuilder.leftJoinAndSelect('user_memberships', 'memberships', 'user.id = memberships.user_id');
// SQL: LEFT JOIN user_memberships memberships ON user.id = memberships.user_id
```

**4.3. Apply Filters**
**Method:** `applyFilters(queryBuilder, filters, options)`

Loop qua từng filter:

**a) `delete_at_is_null: true`**

```javascript
// Main entity field
queryBuilder.andWhere('user.delete_at IS NULL');
// SQL: AND user.delete_at IS NULL
```

**b) `email: 'test@example.com'`**

```javascript
// Main entity field, exact match
queryBuilder.andWhere('user.email = :email', { email: 'test@example.com' });
// SQL: AND user.email = 'test@example.com'
```

**c) `status_in: ['1', '2', '3']`**

```javascript
// Main entity field, IN operator
queryBuilder.andWhere('user.status IN (:...status_in)', { status_in: ['1', '2', '3'] });
// SQL: AND user.status IN ('1', '2', '3')
```

**d) `created_from: '2024-01-01T00:00:00.000Z'`**

```javascript
// Main entity field, range FROM
queryBuilder.andWhere('user.created_at >= :created_from', {
  created_from: '2024-01-01T00:00:00.000Z',
});
// SQL: AND user.created_at >= '2024-01-01T00:00:00.000Z'
```

**e) `created_to: '2024-12-31T00:00:00.000Z'`**

```javascript
// Main entity field, range TO
queryBuilder.andWhere('user.created_at <= :created_to', { created_to: '2024-12-31T00:00:00.000Z' });
// SQL: AND user.created_at <= '2024-12-31T00:00:00.000Z'
```

**f) `email_not_null: true`**

```javascript
// Main entity field, NOT NULL
queryBuilder.andWhere('user.email IS NOT NULL');
// SQL: AND user.email IS NOT NULL
```

**g) `phone_number: '1234567890'`**

```javascript
// Check relatedFieldMappings
relatedMapping = { alias: 'userDetails', field: 'phone_number' };

// Related table field, exact match
queryBuilder.andWhere('userDetails.phone_number = :phone_number', { phone_number: '1234567890' });
// SQL: AND userDetails.phone_number = '1234567890'
```

**h) `country: 'SG'`**

```javascript
// Check relatedFieldMappings
relatedMapping = { alias: 'userDetails', field: 'zoneinfo' };

// Related table field với field mapping (country → zoneinfo)
queryBuilder.andWhere('userDetails.zoneinfo = :country', { country: 'SG' });
// SQL: AND userDetails.zoneinfo = 'SG'
```

**4.4. Apply Sorting**

```javascript
queryBuilder.orderBy('user.created_at', 'DESC');
// SQL: ORDER BY user.created_at DESC
```

**Final SQL Query (trước pagination):**

```sql
SELECT
  user.*,
  userDetails.*,
  memberships.*
FROM users user
LEFT JOIN user_details userDetails ON user.id = userDetails.user_id
LEFT JOIN user_memberships memberships ON user.id = memberships.user_id
WHERE
  user.delete_at IS NULL
  AND user.email = 'test@example.com'
  AND user.status IN ('1', '2', '3')
  AND user.created_at >= '2024-01-01T00:00:00.000Z'
  AND user.created_at <= '2024-12-31T00:00:00.000Z'
  AND user.email IS NOT NULL
  AND userDetails.phone_number = '1234567890'
  AND userDetails.zoneinfo = 'SG'
ORDER BY user.created_at DESC
```

---

### BƯỚC 5: Execute Query

**Method:** `executeQuery(queryBuilder, pagination)`

**Process:**

**5.1. Get Total Count**

```javascript
// Clone query builder để count (không ảnh hưởng query chính)
countQueryBuilder = queryBuilder.clone();
total = await countQueryBuilder.getCount();
// SQL: SELECT COUNT(*) FROM (...) [same WHERE clause]
```

**5.2. Apply Pagination**

```javascript
skip = (2 - 1) * 20 = 20
queryBuilder.skip(20).take(20)
// SQL: LIMIT 20 OFFSET 20
```

**5.3. Execute Query**

```javascript
data = await queryBuilder.getMany();
// TypeORM tự động map:
// - user.* → user object
// - userDetails.* → user.userDetails object
// - memberships.* → user.memberships array (one-to-many)
```

**Final SQL Query:**

```sql
SELECT
  user.*,
  userDetails.*,
  memberships.*
FROM users user
LEFT JOIN user_details userDetails ON user.id = userDetails.user_id
LEFT JOIN user_memberships memberships ON user.id = memberships.user_id
WHERE
  user.delete_at IS NULL
  AND user.email = 'test@example.com'
  AND user.status IN ('1', '2', '3')
  AND user.created_at >= '2024-01-01T00:00:00.000Z'
  AND user.created_at <= '2024-12-31T00:00:00.000Z'
  AND user.email IS NOT NULL
  AND userDetails.phone_number = '1234567890'
  AND userDetails.zoneinfo = 'SG'
ORDER BY user.created_at DESC
LIMIT 20 OFFSET 20
```

**Output:**

```javascript
{
  data: [
    {
      id: 1,
      email: 'test@example.com',
      // ... other user fields
      userDetails: {
        phone_number: '1234567890',
        zoneinfo: 'SG',
        // ... other user_details fields
      },
      memberships: [
        { name: 'wildpass', visual_id: 'VIS001', ... },
        // ... other memberships
      ]
    },
    // ... 19 more users
  ],
  total: 150,        // Tổng số records (không phân trang)
  page: 2,
  limit: 20,
  totalPages: 8      // Math.ceil(150 / 20) = 8
}
```

---

### BƯỚC 6: Format Response

**Method:** `formatResponse(result, formatter)`

**Process:**

```javascript
formattedData = result.data.map((user) => formatUserResponse(user));
```

**Output:**

```javascript
{
  status: 'success',
  statusCode: 200,
  data: {
    items: [
      {
        id: 1,
        email: 'test@example.com',
        // ... formatted user fields
        user_details: {
          phone_number: '1234567890',
          country: 'SG',
          address: '123 Main St'
        },
        memberships: [
          { name: 'wildpass', visual_id: 'VIS001', ... }
        ]
      },
      // ... 19 more
    ],
    pagination: {
      page: 2,
      limit: 20,
      total: 150,
      totalPages: 8
    }
  }
}
```

---

## Tóm tắt các loại filter

| Loại Filter       | Query Format            | SQL Operator       | Ví dụ                           |
| ----------------- | ----------------------- | ------------------ | ------------------------------- |
| **Exact Match**   | `?field=value`          | `=`                | `?email=test@example.com`       |
| **LIKE Match**    | `?field=value%`         | `LIKE`             | `?email=test%`                  |
| **IN Operator**   | `?field=val1,val2,val3` | `IN`               | `?status_in=1,2,3`              |
| **Range FROM**    | `?field_from=value`     | `>=`               | `?created_from=2024-01-01`      |
| **Range TO**      | `?field_to=value`       | `<=`               | `?created_to=2024-12-31`        |
| **NOT NULL**      | `?field_not_null=true`  | `IS NOT NULL`      | `?email_not_null=true`          |
| **IS NULL**       | `?field_is_null=true`   | `IS NULL`          | `?deleted_at_is_null=true`      |
| **Related Table** | `?related_field=value`  | `=` (với JOIN)     | `?phone_number=1234567890`      |
| **Field Mapping** | `?api_field=value`      | `=` (mapped field) | `?country=SG` → `zoneinfo='SG'` |

---

## Điểm quan trọng

1. **Security**: `allowedFields` whitelist ngăn SQL injection qua field names
2. **N+1 Prevention**: `leftJoinAndSelect` load tất cả related data trong 1 query
3. **Flexibility**: Field mappings cho phép API field names khác với DB
4. **Performance**: Pagination và sorting được optimize
5. **Type Safety**: Validation cho allowed fields và sort fields
