/**
 * Windows Credential Manager (via @napi-rs/keyring).
 * Never logs username/password/credential objects.
 */
import { Entry } from "@napi-rs/keyring";

export const HANA_CREDENTIAL_SERVICE = "wiro-hana-bank";

export type HanaStoredCredential = {
  username: string;
  password: string;
};

function entryFor(username: string): Entry {
  return new Entry(HANA_CREDENTIAL_SERVICE, username);
}

/** List is not supported by keyring Entry — we store a pointer username file-free via target name. */
const POINTER_TARGET = "__default__";

function pointerEntry(): Entry {
  return new Entry(HANA_CREDENTIAL_SERVICE, POINTER_TARGET);
}

/**
 * Saves credentials. Overwrites previous default account for this service.
 * Password is never written to disk by this module (OS store only).
 */
export function saveHanaCredentials(input: HanaStoredCredential): void {
  const username = input.username.trim();
  const password = input.password;
  if (!username || !password) {
    throw new Error("HANA_CREDENTIALS_INVALID");
  }

  // Clear previous default if username changed
  try {
    const prevUser = pointerEntry().getPassword();
    if (prevUser && prevUser !== username) {
      try {
        entryFor(prevUser).deletePassword();
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* no pointer yet */
  }

  entryFor(username).setPassword(password);
  pointerEntry().setPassword(username);
}

export function loadHanaCredentials(): HanaStoredCredential | null {
  let username: string;
  try {
    const pointer = pointerEntry().getPassword();
    if (!pointer?.trim()) return null;
    username = pointer;
  } catch {
    return null;
  }

  try {
    const password = entryFor(username).getPassword();
    if (!password) return null;
    return { username, password };
  } catch {
    return null;
  }
}

export function hasHanaCredentials(): boolean {
  return loadHanaCredentials() !== null;
}

export function deleteHanaCredentials(): boolean {
  let username: string | null = null;
  try {
    username = pointerEntry().getPassword();
  } catch {
    username = null;
  }

  let deleted = false;
  if (username) {
    try {
      entryFor(username).deletePassword();
      deleted = true;
    } catch {
      /* ignore */
    }
  }
  try {
    pointerEntry().deletePassword();
    deleted = true;
  } catch {
    /* ignore */
  }
  return deleted;
}

/** Safe status for logs/admin — never includes identity. */
export function hanaCredentialStoreStatus(): "PRESENT" | "ABSENT" {
  return hasHanaCredentials() ? "PRESENT" : "ABSENT";
}
