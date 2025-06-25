# Generate an Audit

Generate a security audit for your **n8n** instance.

---

### 🔐 Authorizations

- **Type:** `ApiKeyAuth`  
- **Header Parameter Name:** `X-N8N-API-KEY`

---

### 📤 Request Body Schema

- **Content-Type:** `application/json`
- **optional**
  - `additionalOptions`: `object`

---

### 📥 Responses

#### ✅ 200 - Operation Successful

**Response Schema:** `application/json`

- `Credentials Risk Report`: `object`
- `Database Risk Report`: `object`
- `Filesystem Risk Report`: `object`
- `Nodes Risk Report`: `object`
- `Instance Risk Report`: `object`

#### ❌ 401 - Unauthorized

#### ❌ 500 - Internal Server Error


---------

Claro! Aqui está o texto transformado em **Markdown** com uma estrutura clara e legível, ideal para documentação técnica:

````markdown
# 📋 Retrieve All Workflows

Retrieve all workflows from your **n8n** instance.

---

## 🔐 Authorizations

- **Type:** `ApiKeyAuth`  
- **Header Parameter Name:** `X-N8N-API-KEY`

---

## 🔍 Query Parameters

| Name               | Type     | Example                          | Description                                      |
|--------------------|----------|----------------------------------|--------------------------------------------------|
| `active`           | boolean  | `active=true`                    | Filter by active status                          |
| `tags`             | string   | `tags=test,production`           | Filter by tags                                   |
| `name`             | string   | `name=My Workflow`               | Filter by name                                   |
| `projectId`        | string   | `projectId=VmwOO9HeTEj20kxM`     | Filter by project ID                             |
| `excludePinnedData`| boolean  | `excludePinnedData=true`         | Exclude pinned data                              |
| `limit`            | number ≤ 250 | `limit=100`                   | Max number of items to return (default: 100)     |
| `cursor`           | string   |                                  | Paginate using `nextCursor` from previous request|

---

## 📥 Responses

### ✅ 200 - Operation Successful

**Content-Type:** `application/json`  
**Response Schema:**

```json
{
  "data": [
    {}
  ],
  "nextCursor": "MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA"
}
````

* `data`: Array of workflow objects
* `nextCursor`: `string` or `null` — Use to paginate through workflows

### ❌ 401 - Unauthorized

---

## 📄 GET /workflows

---

# 📄 Retrieves a Workflow

Retrieve a specific workflow by its ID.

---

## 🔐 Authorizations

* **Type:** `ApiKeyAuth`
* **Header Parameter Name:** `X-N8N-API-KEY`

---

## 📂 Path Parameters

| Name | Type   | Required | Description            |
| ---- | ------ | -------- | ---------------------- |
| `id` | string | ✅        | The ID of the workflow |

---

## 🔍 Query Parameters

| Name                | Type    | Example                  | Description         |
| ------------------- | ------- | ------------------------ | ------------------- |
| `excludePinnedData` | boolean | `excludePinnedData=true` | Exclude pinned data |

---

## 📥 Responses

### ✅ 200 - Operation Successful

**Content-Type:** `application/json`
**Response Schema:**

| Field         | Type                      | Required | Description              |
| ------------- | ------------------------- | -------- | ------------------------ |
| `id`          | string                    | ✅        | Workflow ID              |
| `name`        | string                    | ✅        | Workflow name            |
| `active`      | boolean                   |          | Whether it's active      |
| `createdAt`   | string `<date-time>`      |          | Creation timestamp       |
| `updatedAt`   | string `<date-time>`      |          | Last updated timestamp   |
| `nodes`       | Array of `node` objects   | ✅        | Workflow nodes           |
| `connections` | object                    | ✅        | Node connections         |
| `settings`    | `workflowSettings` object | ✅        | Workflow settings        |
| `staticData`  | string \| object \| null  |          | Static data if available |
| `tags`        | Array of `tag` objects    |          | Tags applied to workflow |

### ❌ 401 - Unauthorized

### ❌ 404 - Resource Not Found

```

Se quiser, posso converter esse conteúdo em HTML, documentação Swagger/OpenAPI ou exportar como `.md`.
```
