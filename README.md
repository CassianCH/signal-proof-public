# Signal Proof

公开的延迟信号凭证库。服务器收到信号后立即签名并申请独立 RFC 3161 时间戳，从接收时间起满 **168 小时**后公开。仓库不含私有策略、策略名称、推理、原始事件标识、私钥或接收令牌。

## 查看与下载

Pages 页面提供信号列表、浏览器本地完整验证、全部 JSON、单条 JSON / TSQ / TSR、公钥、根证书及本说明下载。

- `data/records.json`：从序号 1 开始的连续已归档收据数组。
- `data/manifest.json`：归档末尾序号、链哈希及最近同步检查日期（UTC）。
- 页面 `data/records/1.json`、`1.tsq`、`1.tsr`：第一条收据、RFC 3161 请求和响应。二进制文件在 Pages 构建时由 JSON 生成。
- `trust/public-key.txt`：Ed25519 公钥，SPKI DER 的 Base64。
- `trust/freetsa-root.pem`：固定的 FreeTSA 根证书。

空账本不代表没有等待七天期限的信号；空账本验证不能称为已验证任何信号。

## 信任指纹

公钥 SPKI DER SHA-256：

```text
1a3690d9ea861a1224125a3106b3c830594f8abd4cdfd92192ed09e772e2e55b
```

FreeTSA 根证书文件 SHA-256（含原始换行）：

```text
2151b61137ffa86bf664691ba67e7da0b19f98c758e3d228d5d8ebf27e044438
```

从发布者的独立可信渠道预先核对公钥指纹。只信任同一个网站提供的密钥、配置和数据，不能确认发布者身份。根证书来源：[FreeTSA 官方网站](https://freetsa.org/index_en.php)。该根是显式信任锚，不表示自动受系统或法律认可。

## 浏览器验证

点击“验证全部记录”，在浏览器本地核对固定信任指纹、字段白名单、序号连续、前哈希、信号摘要、Ed25519 签名、RFC 3161 摘要与 nonce、CMS 签名、证书链、签发时证书有效性、critical / exclusive timestamping EKU、TSA 元数据、168 小时门槛和归档链头。无需上传文件。

浏览器需支持 WebCrypto Ed25519 并使用 HTTPS。页面结果仍依赖网站的验证代码；独立审计应下载源码、凭证及预先可信的公钥。

## 本地独立验证

安装 Node.js 22 或更高版本，下载或克隆仓库，在仓库根目录运行：

```bash
npm ci
npm run verify
```

退出码 0 表示本地归档与清单检查通过。任一失败以非零退出码停止。也可指定另行保存的文件：

```bash
node scripts/verify.js downloaded-records.json trusted-public-key.txt trusted-root.pem
```

数组需从 1 开始连续；单条验证应补齐前序记录，或使用独立可信的链检查点。自定义数组不会自动与仓库清单比较，需另行核对可信末尾检查点。安装依赖需联网，验证已下载凭证不需要连接源服务器或 TSA。

## 协议

规范化 JSON：对象键递归排序，数组顺序不变，值使用 JSON 编码，不加空白。

```text
payload_hash = SHA256(canonical(signal))
chain_hash   = SHA256(canonical(record))
signature    = Ed25519.sign(bytes(chain_hash))
```

`record` 含通用账本及部署标识、序号、服务器接收时间、信号摘要、前哈希、公钥标识。首条前哈希为 64 个 0。TSA messageImprint 等于 chain_hash。`release_at` 是接收时间加 604800000 毫秒的派生字段，不是新增签名字段。

公开数据只用通用标识 `signal`、`signal-production`、`signal-production-v1`、`key-v1`。品种、方向、目标敞口与时间用于核对真实信号，不含推理。

## 同步与部署

仓库 Actions Secret `SOURCE_WORKER_URL` 填现有 HTTPS Worker 基础地址（不带 `/ingest`）。这是源地址，不是签名私钥或接收令牌。脚本只读取无认证公开 `/head` 与 `/records/<seq>`，不调用接收或所有者接口。

Settings → Pages 选择 **GitHub Actions**。工作流每小时 UTC 第 17 分钟运行，也可手动运行。先验证旧归档，再拉取最多 100 条新记录；TSA 未完成时等待下次运行，不跳号。旧记录改写、链头回退、提前开放、字段越界、签名或 TSA 错误均使同步失败，保留旧版本。

源端同步失败时，Pages 仍可重新部署仓库中已验证的既有归档，不能把失败误称为同步成功；工作流整体会显示失败，页面最近同步日期不更新。

每日检查日期会产生一次提交。定时任务可能延迟或暂停，因此 Pages 可能晚于满七天更新，但不能提前。参考 [GitHub 定时任务说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)。网站构建采用显式文件白名单，不复制私有部署工作区。更换公钥或协议时必须保留历史信任材料与交接检查点。

## 证明边界

- 证明内容与签名一致，且在独立 TSA 时间之前已存在；不把信号自报时间当作 TSA 时间。
- 证明下载记录的内部连续性，不证明源端未筛选、未漏发或没有隐藏末尾记录。
- 不证明私有策略执行、成交、收益或策略有效性。
- 当前不执行 OCSP / CRL 吊销检查，明确返回 `revocation_status: not_checked`，不宣称完整长期验证。
- GitHub 提交不是 TSA；管理员可修改或删除仓库，公众应保存副本和独立链头检查点。
- 七天保密由源服务器访问限制实现，不是内容加密；已下载内容不能撤回。
