// Scriptable widget — live travel time across the 25 de Abril bridge.
// Install: paste into Scriptable, add a Small widget to your home screen
// pointing at this script. See README.

const URL = "https://bridge-time.mattzcarey.workers.dev/bridge";

async function fetchBridge() {
  const r = new Request(URL);
  return await r.loadJSON();
}

function buildWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0b1220");
  w.setPadding(12, 14, 12, 14);

  const header = w.addText("🌉 " + data.route);
  header.font = Font.mediumSystemFont(16);
  header.textColor = new Color("#9ca3af");
  header.lineLimit = 2;

  w.addSpacer(4);

  const row = w.addStack();
  row.layoutHorizontally();
  row.bottomAlignContent();

  const num = row.addText(String(data.liveMinutes));
  num.font = Font.heavySystemFont(44);
  num.textColor = Color.white();

  const unitStack = row.addStack();
  unitStack.layoutVertically();
  const unit = unitStack.addText(" min");
  unit.font = Font.mediumSystemFont(16);
  unit.textColor = new Color("#9ca3af");
  unitStack.addSpacer(6);

  w.addSpacer(4);

  const delta = data.liveMinutes - data.noTrafficMinutes;
  const color = delta <= 2 ? "#10b981" : delta <= 5 ? "#f59e0b" : "#ef4444";
  const sign = delta >= 0 ? "+" : "";
  const d = w.addText(`${sign}${delta} min`);
  d.font = Font.mediumSystemFont(12);
  d.textColor = new Color(color);

  return w;
}

function errorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0b1220");
  w.setPadding(12, 14, 12, 14);
  const t = w.addText("Bridge");
  t.font = Font.mediumSystemFont(12);
  t.textColor = new Color("#9ca3af");
  w.addSpacer(6);
  const e = w.addText(String(msg).slice(0, 80));
  e.font = Font.systemFont(11);
  e.textColor = new Color("#ef4444");
  return w;
}

let widget;
try {
  widget = buildWidget(await fetchBridge());
} catch (err) {
  widget = errorWidget(err.message);
}

Script.setWidget(widget);
if (config.runsInApp) await widget.presentSmall();
Script.complete();
