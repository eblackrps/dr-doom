const BOOT_LINES = [
  { text: 'BIOS v2.4.1 — DR DOOM SYSTEMS INC.', cls: 'info', delay: 0 },
  { text: 'Initializing POST...', cls: 'ok', delay: 180 },
  { text: 'CPU: DR-9000 QUAD-CORE @ 4.2GHz ... OK', cls: 'ok', delay: 320 },
  { text: 'RAM: 256GB ECC DDR5 ... OK', cls: 'ok', delay: 450 },
  { text: 'Loading kernel: doom-recovery-3.1.0-amd64 ...', cls: 'ok', delay: 600 },
  { text: 'Mounting /dev/sda1 [TYPE: EXT4] ... OK', cls: 'ok', delay: 750 },
  { text: 'Starting systemd ... OK', cls: 'ok', delay: 850 },
  { text: 'Starting networking ... OK', cls: 'ok', delay: 950 },
  { text: 'Connecting to Veeam Backup Server @ 10.0.0.5 ...', cls: 'ok', delay: 1100 },
  { text: 'WARNING: Last backup job: FAILED — 14h ago', cls: 'warn', delay: 1250 },
  { text: 'WARNING: Replication lag detected: 4h 22m', cls: 'warn', delay: 1380 },
  { text: 'ERROR: Site B heartbeat: NO RESPONSE', cls: 'err', delay: 1500 },
  { text: 'ERROR: Ransomware signature detected in /vmfs/volumes/...', cls: 'err', delay: 1650 },
  { text: 'CRITICAL: RTO BREACH IN 02:00:00', cls: 'err', delay: 1800 },
  { text: '---------------------------------------------------', cls: 'info', delay: 1950 },
  { text: 'Deploying DR Engineer asset...', cls: 'ok', delay: 2100 },
  { text: 'Loading threat intel feed: anystackarchitect.com ...', cls: 'info', delay: 2200 },
  { text: 'Feed authenticated. DR runbook v3.1 loaded.', cls: 'ok', delay: 2350 },
  { text: 'Loading Three.js render engine ... OK', cls: 'ok', delay: 2500 },
  { text: 'Generating level geometry ... OK', cls: 'ok', delay: 2400 },
  { text: 'Applying CRT post-processing pipeline ... OK', cls: 'ok', delay: 2520 },
  { text: 'Calibrating input subsystems ... OK', cls: 'ok', delay: 2650 },
  { text: 'Loading DR Arsenal: 7 weapons initialized ... OK', cls: 'ok', delay: 2750 },
  { text: 'Phase 0 engine online. All systems nominal.', cls: 'ok', delay: 2800 },
  { text: '---------------------------------------------------', cls: 'info', delay: 2900 },
  { text: 'RTO IS TICKING, ENGINEER. PICK UP THE REPLICATION SHOTGUN.', cls: 'err', delay: 3050 },
];

function isForwardedStart() {
  try {
    const params = new URLSearchParams(window.location.search);
    return window.self !== window.top || params.has('ref');
  } catch {
    return true;
  }
}

export function boot() {
  return new Promise((resolve) => {
    const log = document.getElementById('boot-log');
    const prompt = document.getElementById('boot-prompt');
    const bootScreen = document.getElementById('boot-screen');
    const requireKeyboardConfirm = isForwardedStart();
    let readyToDismiss = false;
    let dismissed = false;

    if (prompt) {
      prompt.textContent = requireKeyboardConfirm
        ? '▸ PRESS ENTER TO CONTINUE'
        : '▸ CLICK OR PRESS ENTER TO CONTINUE';
    }

    // Render each line with its delay
    BOOT_LINES.forEach(({ text, cls, delay }) => {
      setTimeout(() => {
        const line = document.createElement('div');
        line.className = `boot-line ${cls}`;
        line.textContent = `> ${text}`;
        log.appendChild(line);
        // Animate in
        requestAnimationFrame(() => {
          line.style.opacity = '1';
        });
        // Scroll to bottom
        log.scrollTop = log.scrollHeight;
      }, delay);
    });

    // Show "click to start" after last line
    const lastDelay = BOOT_LINES[BOOT_LINES.length - 1].delay + 400;
    setTimeout(() => {
      readyToDismiss = true;
      prompt.style.display = 'block';
    }, lastDelay);

    const handleKeydown = (e) => {
      if (e.code === 'Enter' || (!requireKeyboardConfirm && e.code === 'Space')) dismiss();
    };

    const handleClick = () => dismiss();

    const dismiss = () => {
      if (dismissed || !readyToDismiss) return;
      dismissed = true;
      bootScreen?.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeydown);
      bootScreen.style.transition = 'opacity 0.4s';
      bootScreen.style.opacity = '0';
      setTimeout(() => {
        bootScreen.style.display = 'none';
        resolve();
      }, 400);
    };

    if (!requireKeyboardConfirm) {
      bootScreen.addEventListener('click', handleClick);
    }

    window.addEventListener('keydown', handleKeydown);
  });
}
