import test from "node:test";
import assert from "node:assert/strict";
import { publicId, auditDetails } from "../src/shared/public-id";
import { stageConnection, takeConnection } from "../src/features/materials/storage-connections";
import { storageApi } from "../src/api/storage-api";
import { makeStore } from "../src/store";
test("public identifiers never fall back to internal UUIDs", () => {
  const uuid = "0e998fa3-ff51-4b7c-93b5-019a366dc39b";
  assert.equal(publicId(uuid, "hv.bon"), "hv.bon");
  assert.equal(publicId("account-" + uuid), "—");
  assert.equal(publicId(null, "HV000123"), "HV000123");
  assert.equal(publicId("MAT21"), "MAT21");
  const details = auditDetails(JSON.stringify({ id: uuid, publicId: "MAT21", storageObjectKey: "private-path", secretVersion: "versions/1", reason: "Di chuyển", nested: { actorId: uuid } }));
  assert.ok(details.includes("MAT21")); assert.ok(details.includes("Di chuyển")); assert.ok(!details.includes(uuid)); assert.ok(!details.includes("private-path")); assert.ok(!details.includes("versions/1"));
  assert.equal(auditDetails("invalid"), "Chi tiết không khả dụng.");
});
test("storage credentials are isolated in a single-use transport buffer", () => {
  const connection = { endpoint: "https://br-demo.storage.c-3.ap-southeast-1.aws.neon.tech", region: "ap-southeast-1", bucket: "private", accessKeyId: "fake-access", secretAccessKey: "fake-secret" };
  const key = stageConnection(connection);
  assert.ok(!key.includes(connection.secretAccessKey));
  assert.deepEqual(takeConnection(key), connection);
  assert.equal(takeConnection(key), undefined);
  assert.equal(takeConnection(), undefined);
});
test("failed storage mutation does not retain credentials in Redux arguments or cache", async () => {
  const store = makeStore(), secret = "fake-secret-must-not-reach-redux", key = stageConnection({ endpoint: "https://br-demo.storage.c-3.ap-southeast-1.aws.neon.tech", region: "ap-southeast-1", bucket: "private", accessKeyId: "fake-access-id", secretAccessKey: secret });
  await store.dispatch(storageApi.endpoints.saveStorage.initiate({ publicId: "DOC2", name: "Văn bản", category: "DOCUMENTS", capacityBytes: 4500000000, status: "ACTIVE", version: 1, reason: "Kiểm thử", connectionKey: key }));
  assert.equal(takeConnection(key), undefined);
  assert.ok(!JSON.stringify(store.getState()).includes(secret));
  assert.ok(!JSON.stringify(store.getState()).includes("fake-access-id"));
});
