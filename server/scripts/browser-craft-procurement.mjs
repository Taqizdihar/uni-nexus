#!/usr/bin/env node
import { createHmac, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = path.resolve(import.meta.dirname, "..", "..");
dotenv.config({ path: path.join(root, "server", ".env"), quiet: true });
const front =
  process.env.PROCUREMENT_BROWSER_BASE_URL || "http://localhost:5173";
const api =
  process.env.PROCUREMENT_BROWSER_API_URL || "http://localhost:3001/api/v1";
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      organization_id: user.organization_id,
      username: user.username,
      iat: now,
      exp: now + 1800,
    }),
  ).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", process.env.JWT_SECRET).update(`${header}.${payload}`).digest("base64url")}`;
}
async function userForBrowser() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT u.id,u.organization_id,u.username FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.deleted_at IS NULL AND u.status_code='active' AND u.approval_status_code='approved' AND p.code='craft.procurement.read' LIMIT 1`,
    );
    assert(rows.length, "No active user has craft.procurement.read.");
    return rows[0];
  } finally {
    await db.end();
  }
}
async function chromePort(profile, child) {
  const file = path.join(profile, "DevToolsActivePort");
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    if (child.exitCode !== null)
      throw new Error(`Chrome exited ${child.exitCode}.`);
    try {
      const [port] = (await readFile(file, "utf8")).trim().split(/\r?\n/);
      if (Number(port)) return Number(port);
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome DevTools did not start.");
}
function cdp(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", async (event) => {
    const message = JSON.parse(
      typeof event.data === "string" ? event.data : await event.data.text(),
    );
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? item.reject(new Error(message.error.message))
        : item.resolve(message.result || {});
    }
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("Cannot open DevTools WebSocket.")),
      { once: true },
    );
  });
  return {
    socket,
    send: async (method, params = {}) => {
      await ready;
      return new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}
async function run() {
  const user = await userForBrowser();
  const token = tokenFor(user);
  const response = await fetch(`${api}/craft/procurement/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(
    response.ok,
    `Procurement overview returned ${response.status}: ${(await response.text()).slice(0, 300)}`,
  );
  const profile = await mkdtemp(
    path.join(os.tmpdir(), "uni-nexus-procurement-browser-"),
  );
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--window-size=1440,1100",
      "about:blank",
    ],
    { windowsHide: true },
  );
  try {
    const port = await chromePort(profile, child);
    const targets = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json();
    const target = targets.find((item) => item.type === "page");
    assert(target?.webSocketDebuggerUrl, "Chrome page target unavailable.");
    const browser = cdp(target.webSocketDebuggerUrl);
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `localStorage.setItem('token', ${JSON.stringify(token)}); window.__procurementErrors=[]; window.addEventListener('error', event=>window.__procurementErrors.push(event.message));`,
    });
    const routes = [
      ["/app/craft/procurement", "Ringkasan Pengadaan"],
      ["/app/craft/procurement/suppliers", "Pemasok"],
      ["/app/craft/procurement/requests", "Permintaan Pembelian"],
      ["/app/craft/procurement/orders", "Pesanan Pembelian"],
      ["/app/craft/procurement/receipts", "Penerimaan Barang"],
      ["/app/craft/procurement/invoices", "Tagihan Pemasok"],
      ["/app/craft/procurement/history", "Riwayat Pengadaan"],
    ];
    const output = path.join(
      root,
      "artifacts",
      `craft-procurement-browser-${Date.now()}-${randomBytes(3).toString("hex")}`,
    );
    await (await import("node:fs/promises")).mkdir(output, { recursive: true });
    for (const [route, title] of routes) {
      await browser.send("Page.navigate", { url: `${front}${route}` });
      await delay(3000);
      const state = await browser.send("Runtime.evaluate", {
        expression: `({title:Array.from(document.querySelectorAll('h1')).at(-1)?.textContent?.trim(), body:document.body.innerText, errors:window.__procurementErrors})`,
        returnByValue: true,
      });
      const page = state.result?.value;
      assert(
        page?.title === title,
        `${route}: expected '${title}', got '${page?.title}': ${page?.body?.slice(0, 250)}`,
      );
      assert(
        !page.body.includes("Akses Ditolak"),
        `${route} rendered forbidden state.`,
      );
      assert(
        !page.errors?.length,
        `${route} browser errors: ${page.errors.join("; ")}`,
      );
      const image = await browser.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      await writeFile(
        path.join(
          output,
          `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`,
        ),
        Buffer.from(image.data, "base64"),
      );
    }
    browser.socket.close();
    console.log(
      `Craft Procurement browser acceptance passed. Screenshots: ${output}`,
    );
  } finally {
    child.kill();
    await delay(500);
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
