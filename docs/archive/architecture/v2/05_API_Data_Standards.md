# 05. API 与数据标准 (API & Data Standards)

## 1. 端点命名 (Endpoint Naming)
*   前缀: `/api/v2/`
*   基于资源 (Restful 风格):
    *   `GET /api/v2/templates/:id`
    *   `POST /api/v2/saves`
    *   `GET /api/v2/saves/:id`
    *   `POST /api/v2/auth/login` (为未来预留)

## 2. 身份传输协议 (Identity Propagation)
*   **机制**: 无状态传输。不依赖 Cookie，全靠 Header。
*   **Header Key**: `X-User-Hash`
*   **值**: 用户的唯一指纹 Hash (由前端生成并存储在 LocalStorage)。
*   **Zod Schema**:
    ```typescript
    // shared/schema/auth.ts
    export const AuthHeaderSchema = z.object({
      'x-user-hash': z.string().length(32) // 假设 hash 长度
    });
    ```


```typescript
// 成功 (Success)
{
  "success": true,
  "data": { ... } // 泛型 T
}

// 错误 (Error)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR", // 机器可读的错误码
    "message": "标题不能为空",    // 人类可读的提示 (甚至可以只是 key，交由前端翻译)
    "details": [ ... ]          // Zod 详细错误数组
  }
}
```

## 3. 错误处理 (Error Handling)
*   **后端**: 使用中心化的错误处理中间件。捕获标准 `Error` 并转换为上述 JSON 格式。
*   **前端**: API 客户端封装器 (Wrapper) 自动解析错误。
    *   如果 401 -> 跳转登录。
    *   如果 4xx -> 显示 Toast 提示（支持多语言）。
    *   如果 5xx -> 显示“服务器繁忙”横幅。

## 4. 隐私与哈希 (Privacy & Hashing)
*   **用户 ID**: 继续沿用 V1 的隐私策略，使用 (IP + Salt) 生成匿名哈希 ID (`user_hash`)。
*   **合规性**: 数据库中**严禁**明文存储 IP 地址。
