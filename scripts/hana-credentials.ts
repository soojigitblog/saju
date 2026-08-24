/**
 * Register Hana ID/password into Windows Credential Manager.
 * Usage: npm run bank:hana:credentials
 *
 * Never echoes password. Never writes credentials to project files.
 */
import readline from "node:readline";
import {
  saveHanaCredentials,
  HANA_CREDENTIAL_SERVICE,
} from "../src/lib/bank/hana/credentials-store";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return ask(question);
  }

  process.stdout.write(question);
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    let value = "";

    const onData = (buf: Buffer) => {
      const s = buf.toString("utf8");
      for (const ch of s) {
        if (ch === "\n" || ch === "\r") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };

    const cleanup = () => {
      stdin.off("data", onData);
      if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    };

    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  console.log(`Credential service: ${HANA_CREDENTIAL_SERVICE}`);
  console.log("비밀번호는 화면에 표시되지 않으며 프로젝트 파일에 저장되지 않습니다.\n");

  const username = (await ask("하나은행 로그인 ID: ")).trim();
  const password = await askHidden("하나은행 로그인 비밀번호: ");

  if (!username || !password) {
    console.error("ID/비밀번호가 비어 있습니다.");
    process.exit(1);
  }

  saveHanaCredentials({ username, password });
  console.log("HANA CREDENTIALS SAVED");
}

void main().catch((e) => {
  console.error(
    "[bank:hana:credentials] failed",
    e instanceof Error ? e.message : "error"
  );
  process.exit(1);
});
