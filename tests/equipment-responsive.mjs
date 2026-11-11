import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// Run against a disposable Chrome instance with remote debugging enabled.
// Uses the same device metrics and touch input as Chrome DevTools responsive mode.
const chrome = process.env.CHROME_DEBUG_URL || "http://localhost:9223";
const site = process.env.TEST_SITE_URL || "http://localhost:3001";
const target = await (
  await fetch(`${chrome}/json/new?about:blank`, { method: "PUT" })
).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
const events = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) {
    events.get(message.method)?.();
    return;
  }
  const task = pending.get(message.id);
  pending.delete(message.id);
  clearTimeout(task.timeout);
  if (message.error) task.reject(new Error(JSON.stringify(message.error)));
  else task.resolve(message.result);
});
function loaded() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      events.delete("Page.loadEventFired");
      reject(new Error("Equipment page load timed out"));
    }, 15000);
    events.set("Page.loadEventFired", () => {
      clearTimeout(timeout);
      events.delete("Page.loadEventFired");
      resolve();
    });
  });
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome timed out: ${method}`));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function swipe(x, y, distance, vertical = 0) {
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 10; step++) {
    await send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x + (distance * step) / 10, y: y + (vertical * step) / 10 },
      ],
    });
    await pause(20);
  }
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pause(250);
}
const measurements = `(() => {
  const wrapper = document.querySelector('.table-scroll');
  if (!wrapper) return {url:location.href, title:document.title, text:document.body.innerText.slice(0,500)};
  const rect = wrapper.getBoundingClientRect();
  return {
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    x: window.scrollX,
    y: window.scrollY,
    table: {width: wrapper.clientWidth, scrollWidth: wrapper.scrollWidth,
      left: wrapper.scrollLeft, x:rect.x, y:rect.y, height:rect.height},
    fixedContent: [...document.querySelectorAll('.admin-topbar,.admin-heading,.heading-actions,.table-toolbar,.search-field')].map(el => {
      const r = el.getBoundingClientRect();
      return {name:el.className, left:r.left, right:r.right};
    })
  };
})()`;
function assertPageFits(state) {
  assert.equal(state.document, state.viewport, JSON.stringify(state));
  assert.equal(state.body, state.viewport, JSON.stringify(state));
  assert.equal(state.x, 0, "The document moved horizontally");
  for (const rect of state.fixedContent) {
    assert(
      rect.left >= -1 && rect.right <= state.viewport + 1,
      JSON.stringify(rect),
    );
  }
}
try {
  await send("Page.enable");
  await mkdir("test-results", { recursive: true });
  for (const width of [320, 375, 430, 1024, 1440]) {
    const mobile = width < 800;
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
    const load = loaded();
    await send("Page.navigate", { url: `${site}/admin/equipment` });
    await load;
    let ready = false;
    for (let tries = 0; tries < 150; tries++) {
      ready = await evaluate(
        `document.readyState === 'complete' && (document.querySelector('.table-scroll tbody tr')?.getBoundingClientRect().width ?? 0) > 0`,
      );
      if (ready) break;
      await pause(100);
    }
    assert(
      ready,
      "Equipment sample rows did not render; run the app in read-only preview mode",
    );
    await evaluate(`document.fonts.ready.then(() => true)`);
    // Expose real overflow even if a future global clipping workaround is added.
    await evaluate(
      `document.documentElement.style.overflowX = 'visible'; document.body.style.overflowX = 'visible'; window.scrollTo(0,0)`,
    );
    const initial = await evaluate(measurements);
    assert.equal(initial.viewport, width);
    assertPageFits(initial);
    if (mobile) {
      assert(
        initial.table.scrollWidth > initial.table.width,
        "The table must keep all columns",
      );
      await swipe(width / 2 + 60, 110, -120);
      assertPageFits(await evaluate(measurements));
      await swipe(width / 2 - 60, 110, 120);
      assertPageFits(await evaluate(measurements));
      const { table } = await evaluate(measurements);
      await swipe(
        table.x + table.width - 20,
        table.y + table.height / 2,
        -(table.width - 40),
      );
      const inside = await evaluate(measurements);
      assert(
        inside.table.left > 0,
        "A swipe inside the table did not scroll it",
      );
      assertPageFits(inside);
      // Swipe into the right edge and beyond it: no chaining to the document.
      for (let n = 0; n < 2; n++) {
        await swipe(
          table.x + table.width - 20,
          table.y + table.height / 2,
          -(table.width - 40),
        );
      }
      assertPageFits(await evaluate(measurements));
      await evaluate(
        `document.querySelector('.table-scroll').scrollLeft = 100000`,
      );
      assert(
        await evaluate(`(() => {
        const w=document.querySelector('.table-scroll').getBoundingClientRect();
        const a=document.querySelector('tbody tr .table-action').getBoundingClientRect();
        return a.left >= w.left && a.right <= w.right + 1;
      })()`),
        "The last column must remain reachable",
      );
      await swipe(table.x + 20, table.y + table.height / 2, table.width - 40);
      assertPageFits(await evaluate(measurements));
      // A short viewport makes this small sample dataset taller than the screen.
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 400,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await evaluate(
        `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
      );
      await swipe(width / 2, 280, 0, -180);
      assert(
        (await evaluate(measurements)).y > 0,
        "Vertical page scrolling is blocked: " +
          JSON.stringify(
            await evaluate(
              `({height:innerHeight, scrollHeight:document.documentElement.scrollHeight,overflow:getComputedStyle(document.body).overflow, y:scrollY})`,
            ),
          ),
      );
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: true,
      });
    } else {
      // Positioning the wrapper must not change desktop sizing or placement.
      await evaluate(
        `document.querySelector('.table-scroll').style.position = 'static'`,
      );
      const unpositioned = await evaluate(measurements);
      assert.deepEqual(unpositioned.fixedContent, initial.fixedContent);
      assert.equal(unpositioned.table.width, initial.table.width);
      assert.equal(unpositioned.table.scrollWidth, initial.table.scrollWidth);
      await evaluate(
        `document.querySelector('.table-scroll').style.position = ''`,
      );
    }
    await evaluate(
      `window.scrollTo(0,0); document.querySelector('.table-scroll').scrollLeft=0`,
    );
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      `test-results/equipment-${width}.png`,
      Buffer.from(screenshot.data, "base64"),
    );
    console.log(
      `PASS ${width}px: document=${initial.document}px; table=${initial.table.scrollWidth}px inside ${initial.table.width}px${mobile ? "; inside/outside swipes, last column and vertical scrolling" : "; desktop layout unchanged"}`,
    );
  }
} finally {
  const closed = new Promise((resolve) =>
    socket.addEventListener("close", resolve, { once: true }),
  );
  socket.close();
  await closed;
  await fetch(`${chrome}/json/close/${target.id}`);
}
