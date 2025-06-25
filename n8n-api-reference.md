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
