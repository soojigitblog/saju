/**
 * Delete Hana credentials from Windows Credential Manager.
 * Usage: npm run bank:hana:credentials:delete
 */
import {
  deleteHanaCredentials,
  HANA_CREDENTIAL_SERVICE,
} from "../src/lib/bank/hana/credentials-store";

const deleted = deleteHanaCredentials();
console.log(
  deleted
    ? `HANA CREDENTIALS DELETED (${HANA_CREDENTIAL_SERVICE})`
    : `NO HANA CREDENTIALS FOUND (${HANA_CREDENTIAL_SERVICE})`
);
