/* Camquest animations — shared between pages. Exposes window.CQAnim.{flow,dunning,sync}(hostEl) */
(function () {
'use strict';
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function player(host, steps, renderStep, opts) {
  opts = opts || {};
  const interval = opts.interval || 1700;
  let i = 0, timer = null, playing = !reduced && opts.autoplay !== false;
  host.classList.add('cq-anim');
  host.innerHTML = '<div class="cq-stage"></div><div class="cq-bar"><button class="cq-btn cq-prev" aria-label="Previous step">‹</button><button class="cq-btn cq-play" aria-pressed="' + playing + '"></button><button class="cq-btn cq-next" aria-label="Next step">›</button><ol class="cq-steps"></ol></div>';
  const stage = host.querySelector('.cq-stage'), list = host.querySelector('.cq-steps'), playBtn = host.querySelector('.cq-play');
  list.innerHTML = steps.map((s, k) => '<li data-k="' + k + '"><button>' + esc(s) + '</button></li>').join('');
  function draw() {
    stage.innerHTML = renderStep(i);
    list.querySelectorAll('li').forEach(li => li.setAttribute('aria-current', String(+li.dataset.k === i)));
    playBtn.textContent = playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(playing));
  }
  function go(n) { i = (n + steps.length) % steps.length; draw(); }
  function tick() { go(i + 1); }
  function start() { if (timer) clearInterval(timer); timer = setInterval(tick, interval); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  playBtn.onclick = () => { playing = !playing; playing ? start() : stop(); draw(); };
  host.querySelector('.cq-prev').onclick = () => { playing = false; stop(); go(i - 1); };
  host.querySelector('.cq-next').onclick = () => { playing = false; stop(); go(i + 1); };
  list.querySelectorAll('button').forEach(b => b.onclick = () => { playing = false; stop(); go(+b.parentNode.dataset.k); });
  if ('IntersectionObserver' in window && playing) {
    const io = new IntersectionObserver(en => { en.forEach(e => { if (e.isIntersecting) { if (playing && !timer) start(); } else stop(); }); }, { threshold: 0.3 });
    io.observe(host);
  } else if (playing) start();
  draw();
  return { go, stop };
}

/* ---------- 1. One quarter hour, end to end ---------- */
function flow(host) {
  const steps = ['Tech logs time', 'Rounding & minimums', 'Scott approves', 'Three postings at once', 'Month end: revenue recognized'];
  const node = (cls, title, body, state) => '<div class="cq-node ' + cls + (state ? ' is-' + state : '') + '"><div class="cq-nt">' + title + '</div><div class="cq-nb">' + body + '</div></div>';
  return player(host, steps, k => {
    const entry = k === 0 ? 'Rick · Westheimer Dental<br><b>0.40 h</b> on-site · "replaced front-desk printer"' : 'Rick · Westheimer Dental<br><b>1.00 h</b> billed <span class="cq-dim">(0.40 → 0.50 → on-site min 1.00)</span>';
    const block = k < 3 ? '<b>11.75 h</b> left of 20 @ $160' : '<b>10.75 h</b> left <span class="cq-delta cq-neg">−1.00</span>';
    const pay = k < 3 ? 'Rick · $50/h<br><b>$0.00</b> this period' : 'Rick · $50/h<br><b>$50.00</b> <span class="cq-delta cq-pos">+$50.00</span>';
    const qbo = k < 3 ? 'Payroll hours<br><span class="cq-dim">nothing sent yet</span>' : k === 3 ? 'Payroll hours<br><b>sent</b> · Rick · 1.0 h · billable' : 'Month-end entry<br><b>$160 moves from prepaid to earned</b>';
    const barW = k < 3 ? 58.75 : 53.75;
    return '<div class="cq-flow">' +
      node('a', 'Time entry', entry, k === 0 ? 'active' : k === 1 ? 'active' : 'done') +
      '<div class="cq-arrow' + (k >= 2 ? ' on' : '') + '">→</div>' +
      node('b', 'Approval', k < 2 ? '<span class="cq-dim">Submitted · waiting for Scott</span>' : '<b>Approved</b> by Scott ✓', k === 2 ? 'active' : k > 2 ? 'done' : '') +
      '<div class="cq-fan' + (k >= 3 ? ' on' : '') + '"><span>→</span><span>→</span><span>→</span></div>' +
      '<div class="cq-col">' +
        node('c', 'Client block', block + '<div class="cq-track"><div style="width:' + barW + '%"></div></div>', k === 3 ? 'active' : k > 3 ? 'done' : '') +
        node('d', 'Tech pay accrual', pay, k === 3 ? 'active' : k > 3 ? 'done' : '') +
        node('e', 'QuickBooks Online', qbo, k >= 3 ? 'active' : '') +
      '</div></div>' +
      '<p class="cq-cap">' + ['Rick logs 0.40 h on-site from his phone. Nothing has moved yet.', 'The app rounds up to the quarter hour, then applies the on-site 1-hour minimum. Rick sees the math before he submits.', 'Scott reviews the queue once a week and approves.', 'One approval does three things at once: the client’s block drops 1.00 h, Rick earns $50, and the hours go to QuickBooks for payroll.', 'At month end the app tells QuickBooks that 1.00 h × $160 of prepaid money has now been earned — the entry Tami used to make by hand.'][k] + '</p>';
  }, { interval: 2200 });
}

/* ---------- 2. Getting paid: due → past due → reminders → paid ---------- */
function dunning(host) {
  const steps = ['Invoice sent', 'Due in 3 days', 'Due today', '7 days past due', '14 days past due', 'Payment posts'];
  const pts = [0, 60, 70, 82, 94, 100];
  const marks = [['Issued', 0], ['Due', 70], ['+7', 82], ['+14', 94], ['+30', 100]];
  return player(host, steps, k => {
    const mails = [null, 'Friendly heads-up with pay link', 'Pay link · due today', 'Firmer tone · owner copied', 'Owner prompted to call', null];
    const status = ['Open · Net 30', 'Due soon', 'Due today', 'Past due 7 days', 'Past due 14 days', 'Paid · reminders stopped'][k];
    const cls = k === 5 ? 'ok' : k >= 3 ? 'bad' : k >= 1 ? 'warn' : 'info';
    return '<div class="cq-dun"><div class="cq-inv"><div class="cq-nt">INV-1031 · Bayou Title Co. · $499.44</div><span class="cq-pill cq-' + cls + '">' + status + '</span></div>' +
      '<div class="cq-timeline"><div class="cq-tl-fill" style="width:' + pts[k] + '%"></div>' + marks.map(m => '<div class="cq-tl-mark" style="left:' + m[1] + '%"><i></i><span>' + m[0] + '</span></div>').join('') + '<div class="cq-tl-dot" style="left:' + pts[k] + '%"></div></div>' +
      '<div class="cq-mail' + (mails[k] ? ' on' : '') + (k === 5 ? ' ok' : '') + '">' + (mails[k] ? '✉ ' + esc(mails[k]) + ' → Janet R.' : (k === 5 ? '✓ QuickBooks reports payment · reminders stop · portal turns green' : '&nbsp;')) + '</div>' +
      '<p class="cq-cap">' + ['The invoice goes out from QuickBooks with a pay-online link. The app knows the due date.', 'Three days before the due date the client gets a gentle nudge. No human involved.', 'On the due date, another. Still automatic.', 'A week past due the tone firms up and the owner is copied. The portal has shown it in red since day one.', 'At two weeks the owner is prompted to make the one call that’s still human. At thirty days the past-due policy applies.', 'The moment QuickBooks reports payment, reminders stop and the client’s portal goes green. Nothing to mark by hand.'][k] + '</p></div>';
  }, { interval: 2000 });
}

/* ---------- 3. Nightly sync ---------- */
function sync(host) {
  const steps = ['02:00 · N-sight devices & checks', '02:10 · Azure backup usage', '02:20 · QuickBooks invoices & payments', '02:30 · Reconcile', '06:00 · Ready for the day'];
  return player(host, steps, k => {
    const src = (name, sub, on, done) => '<div class="cq-src' + (on ? ' on' : '') + (done ? ' done' : '') + '"><div class="cq-nt">' + name + '</div><div class="cq-nb">' + sub + '</div></div>';
    const checks = k >= 3 ? '<div class="cq-recon"><div>Block liability vs QBO 2300 <b class="cq-pos">match</b></div><div>AR vs QBO AR <b class="cq-pos">match</b></div><div>Approved hours vs TimeActivity <b class="cq-pos">match</b></div><div>Device counts vs RMM lines <b class="cq-neg">2 clients unbilled</b></div></div>' : '';
    return '<div class="cq-sync"><div class="cq-srcs">' +
      src('N-able N-sight', '33 devices · 2 failing checks · patch %', k === 0, k > 0) +
      src('Azure', 'Backup GB per client', k === 1, k > 1) +
      src('QuickBooks Online', 'Open invoices · payments posted', k === 2, k > 2) +
      '</div><div class="cq-core' + (k >= 3 ? ' on' : '') + '"><div class="cq-nt">Camquest ledger</div><div class="cq-nb">' + (k < 3 ? 'receiving…' : k === 3 ? 'reconciling' : 'reconciled · suggestions drafted') + '</div>' + checks + '</div>' +
      '<div class="cq-outs' + (k === 4 ? ' on' : '') + '"><div>Tech nudges</div><div>Portal health panels</div><div>Scott’s Monday digest</div></div></div>' +
      '<p class="cq-cap">' + ['Every night the app pulls the device list and any failing checks from N-sight — read-only, at the pace N-able allows.', 'Then Azure backup usage per client, so the monthly invoice line is never typed.', 'Then QuickBooks: which invoices are open, which got paid overnight.', 'Then it checks that the ledger and QuickBooks agree. A mismatch blocks month-close until someone explains it.', 'By morning: techs have nudges, clients see fresh health panels, and Scott gets one digest instead of four logins.'][k] + '</p>';
  }, { interval: 2000 });
}

const css = `
.cq-anim{border:1px solid var(--line,#e4e2de);border-radius:12px;background:var(--panel,#fff);padding:16px 16px 10px;margin:14px 0;box-shadow:0 4px 18px rgba(20,18,14,.06)}
.cq-stage{min-height:200px}
.cq-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line,#e4e2de);padding-top:10px;margin-top:10px}
.cq-btn{font:inherit;font-size:13px;border:1px solid var(--line-strong,#cfccc6);background:var(--panel,#fff);border-radius:7px;padding:4px 10px;cursor:pointer;color:var(--ink,#1c1c1a)}
.cq-btn.cq-play{min-width:60px}
.cq-btn.cq-play[aria-pressed="true"]{background:var(--ink,#1c1c1a);color:#fff;border-color:var(--ink,#1c1c1a)}
.cq-steps{list-style:none;margin:0;padding:0;display:flex;gap:4px;flex-wrap:wrap}
.cq-steps button{font:inherit;font-size:12px;border:1px solid transparent;background:transparent;border-radius:999px;padding:3px 9px;color:var(--muted,#5f5e59);cursor:pointer}
.cq-steps li[aria-current="true"] button{background:var(--accent-soft,#fbf1dc);color:var(--accent,#b07d14);border-color:var(--accent,#b07d14)}
.cq-node{border:1px solid var(--line,#e4e2de);border-radius:10px;padding:10px 12px;background:var(--panel-2,#f2f1ee);transition:border-color .25s,box-shadow .25s,background .25s;font-size:13.5px;min-width:0}
.cq-node.is-active{border-color:var(--accent,#b07d14);box-shadow:0 0 0 3px var(--accent-soft,#fbf1dc);background:#fff}
.cq-node.is-done{background:#fff}
.cq-nt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#5f5e59);font-weight:600;margin-bottom:4px}
.cq-nb{line-height:1.4}
.cq-dim{color:var(--muted,#5f5e59)}
.cq-delta{font-size:12px;font-weight:600;margin-left:4px}
.cq-pos{color:var(--ok,#1d7646)} .cq-neg{color:var(--bad,#b3261e)}
.cq-flow{display:grid;grid-template-columns:1.1fr 28px 1fr 28px 1.2fr;gap:8px;align-items:center}
.cq-col{display:grid;gap:8px}
.cq-arrow,.cq-fan{text-align:center;color:var(--line-strong,#cfccc6);font-size:22px;transition:color .25s}
.cq-arrow.on,.cq-fan.on{color:var(--accent,#b07d14)}
.cq-fan{display:grid;gap:30px}
.cq-track{height:8px;background:var(--line,#e4e2de);border-radius:999px;overflow:hidden;margin-top:6px}
.cq-track>div{height:100%;background:var(--ok,#1d7646);transition:width .6s}
.cq-cap{font-size:13.5px;color:var(--ink-2,#3b3a36);margin:12px 0 0;min-height:40px}
.cq-dun .cq-inv{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.cq-pill{font-size:12px;padding:2px 10px;border-radius:999px;font-weight:600}
.cq-pill.cq-info{background:#dde9f7;color:#2563a8}.cq-pill.cq-warn{background:#fbf0d6;color:#8a5a00}.cq-pill.cq-bad{background:#fbe8e6;color:#b3261e}.cq-pill.cq-ok{background:#e2f2e8;color:#1d7646}
.cq-timeline{position:relative;height:8px;background:var(--line,#e4e2de);border-radius:999px;margin:26px 10px 34px}
.cq-tl-fill{position:absolute;left:0;top:0;height:100%;background:var(--accent,#b07d14);border-radius:999px;transition:width .6s}
.cq-tl-mark{position:absolute;top:-4px;transform:translateX(-50%);text-align:center}
.cq-tl-mark i{display:block;width:2px;height:16px;background:var(--line-strong,#cfccc6);margin:0 auto}
.cq-tl-mark span{font-size:11px;color:var(--muted,#5f5e59);display:block;margin-top:2px}
.cq-tl-dot{position:absolute;top:50%;width:18px;height:18px;border-radius:50%;background:var(--ink,#1c1c1a);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transform:translate(-50%,-50%);transition:left .6s}
.cq-mail{border:1px dashed var(--line-strong,#cfccc6);border-radius:8px;padding:8px 12px;font-size:13.5px;color:var(--muted,#5f5e59);transition:all .25s;min-height:38px}
.cq-mail.on{border-style:solid;border-color:var(--accent,#b07d14);background:var(--accent-soft,#fbf1dc);color:var(--ink,#1c1c1a)}
.cq-mail.ok{border-style:solid;border-color:var(--ok,#1d7646);background:var(--ok-soft,#e2f2e8);color:var(--ok,#1d7646);font-weight:600}
.cq-mail.ok{border-style:solid;border-color:var(--ok,#1d7646);background:var(--ok-soft,#e2f2e8);color:var(--ok,#1d7646);font-weight:600}
.cq-mail.ok{border-style:solid;border-color:var(--ok,#1d7646);background:var(--ok-soft,#e2f2e8);color:var(--ok,#1d7646);font-weight:600}
.cq-sync{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:12px;align-items:start}
.cq-srcs{display:grid;gap:8px}
.cq-src{border:1px solid var(--line,#e4e2de);border-radius:10px;padding:10px 12px;font-size:13px;background:var(--panel-2,#f2f1ee);transition:all .25s;opacity:.7}
.cq-src.on{opacity:1;border-color:var(--accent,#b07d14);box-shadow:0 0 0 3px var(--accent-soft,#fbf1dc);background:#fff}
.cq-src.done{opacity:1;background:#fff}
.cq-core{border:2px solid var(--line-strong,#cfccc6);border-radius:12px;padding:12px 14px;font-size:13.5px;transition:all .25s;background:#fff;min-height:120px}
.cq-core.on{border-color:var(--ink,#1c1c1a)}
.cq-recon{margin-top:8px;display:grid;gap:4px;font-size:12.5px}
.cq-recon div{display:flex;justify-content:space-between;gap:8px}
.cq-outs{display:grid;gap:8px;opacity:.35;transition:opacity .25s}
.cq-outs.on{opacity:1}
.cq-outs div{border:1px solid var(--line,#e4e2de);border-radius:10px;padding:10px 12px;font-size:13px;background:var(--accent-soft,#fbf1dc)}
@media (max-width:760px){.cq-flow{grid-template-columns:1fr;gap:6px}.cq-arrow,.cq-fan{transform:rotate(90deg);height:24px;display:flex;align-items:center;justify-content:center}.cq-fan span:not(:first-child){display:none}.cq-sync{grid-template-columns:1fr}.cq-outs{grid-auto-flow:column}}
@media (prefers-reduced-motion:reduce){.cq-node,.cq-track>div,.cq-tl-fill,.cq-tl-dot,.cq-mail,.cq-src,.cq-core,.cq-outs{transition:none}}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
window.CQAnim = { flow, dunning, sync };
})();
