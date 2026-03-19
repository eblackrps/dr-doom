// All interactive console content for Level 1
// Each console has an id, title, and paginated content screens
// anystackarchitect.com is woven in as the field manual source

export const CONSOLE_DATA = {

  // Main Server Floor — spawn room overview
  'console-spawn-overview': {
    title: 'SYSTEM STATUS — MAIN SERVER FLOOR',
    subtitle: 'NODE: GTCCDPMIQ01 // SITE-A',
    lines: [
      { label: 'UPTIME', value: '14d 06h 22m', status: 'ok' },
      { label: 'VM COUNT', value: '247 / 250', status: 'warn' },
      { label: 'DATASTORE', value: '78% USED', status: 'warn' },
      { label: 'REPLICATION', value: 'LAG: 4h 22m', status: 'err' },
      { label: 'LAST BACKUP', value: 'FAILED — 14h AGO', status: 'err' },
      { label: 'SITE-B LINK', value: 'NO RESPONSE', status: 'err' },
    ],
    tip: {
      heading: 'DR TIP // RTO & RPO BASICS',
      body: [
        'RTO (Recovery Time Objective) defines the maximum acceptable',
        'downtime after a disaster. RPO (Recovery Point Objective) defines',
        'the maximum acceptable data loss measured in time.',
        '',
        'If your RTO is 4 hours, your entire DR stack must be capable',
        'of restoring operations within 4 hours — not just technically',
        'possible, but tested and documented.',
        '',
        'An untested DR plan is not a DR plan. It is a hypothesis.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
      ],
    },
  },

  // Storage Vault — backup chain status
  'console-storage-vault': {
    title: 'BACKUP CHAIN STATUS — STORAGE VAULT',
    subtitle: 'VEEAM BACKUP & REPLICATION v13',
    lines: [
      { label: 'FULL BACKUP', value: 'SUN 02:00 — OK', status: 'ok' },
      { label: 'INCREMENTAL', value: 'DAILY — FAILED', status: 'err' },
      { label: 'RETENTION', value: '14 RESTORE POINTS', status: 'ok' },
      { label: 'IMMUTABLE', value: 'S3 OBJECT LOCK: ON', status: 'ok' },
      { label: 'CAPACITY', value: '42TB / 80TB', status: 'ok' },
      { label: 'ENCRYPTION', value: 'AES-256 — ACTIVE', status: 'ok' },
    ],
    tip: {
      heading: 'DR TIP // THE 3-2-1-1-0 RULE',
      body: [
        '3 copies of data.',
        '2 different storage media types.',
        '1 copy offsite.',
        '1 copy offline or immutable (air-gapped or object-locked).',
        '0 errors verified by automated restore testing.',
        '',
        'The extra 1 and the 0 are what ransomware changed.',
        'Before 2020, 3-2-1 was sufficient. It no longer is.',
        'Immutability is not optional in a modern DR architecture.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
      ],
    },
  },

  // Storage Vault — second terminal (hardened repo)
  'console-storage-hardened': {
    title: 'HARDENED REPOSITORY CONFIG',
    subtitle: 'LINUX IMMUTABLE BACKUP TARGET',
    lines: [
      { label: 'OS', value: 'RHEL 9.4 — MINIMAL', status: 'ok' },
      { label: 'SINGLE-USE', value: 'YES — NO SSH ROOT', status: 'ok' },
      { label: 'IMMUTABILITY', value: 'XFS + CHATTR +i', status: 'ok' },
      { label: 'NETWORK', value: 'ISOLATED VLAN 99', status: 'ok' },
      { label: 'LAST VERIFY', value: '7 DAYS AGO', status: 'warn' },
    ],
    tip: {
      heading: 'DR TIP // HARDENED REPOSITORIES',
      body: [
        'A Veeam Hardened Repository is a Linux server configured as',
        'a single-purpose immutable backup target. The key requirements:',
        '',
        '- Dedicated OS install, no other workloads',
        '- SSH enabled only during initial config, then disabled',
        '- No persistent root SSH keys',
        '- Backup files set immutable via per-job retention lock',
        '- Isolated network segment — no route to production',
        '',
        'The goal: even if an attacker has domain admin, they cannot',
        'reach or modify the backup files.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
      ],
    },
  },

  // Network Core — topology display
  'console-network-core': {
    title: 'NETWORK TOPOLOGY — CORE SPINE',
    subtitle: 'SITE-A INFRASTRUCTURE',
    lines: [
      { label: 'CORE-SW-01', value: 'UP — 100GbE', status: 'ok' },
      { label: 'CORE-SW-02', value: 'UP — 100GbE', status: 'ok' },
      { label: 'REPL-LINK', value: 'DOWN — PACKET LOSS', status: 'err' },
      { label: 'MGMT VLAN', value: '10.0.0.0/24 — OK', status: 'ok' },
      { label: 'BACKUP VLAN', value: '10.99.0.0/24 — OK', status: 'ok' },
      { label: 'WAN LINK', value: '1Gbps — DEGRADED', status: 'warn' },
    ],
    tip: {
      heading: 'DR TIP // NETWORK SEGMENTATION FOR DR',
      body: [
        'Your backup and replication traffic should never share a',
        'network segment with production workloads or management.',
        '',
        'Recommended VLAN structure for DR:',
        '- VLAN 10: Production VMs',
        '- VLAN 20: vSphere Management (ESXi, vCenter)',
        '- VLAN 99: Backup & Replication (isolated)',
        '- VLAN 100: DR Site interconnect (dedicated WAN)',
        '',
        'Isolation prevents backup storms from impacting production',
        'and limits lateral movement if backup infrastructure is',
        'compromised by ransomware.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
      ],
    },
  },

  // Cold Aisle — environmental monitoring
  'console-cold-aisle': {
    title: 'ENVIRONMENTAL MONITORING — COLD AISLE',
    subtitle: 'DATACENTER PHYSICAL SYSTEMS',
    lines: [
      { label: 'INLET TEMP', value: '18.2°C — NOMINAL', status: 'ok' },
      { label: 'HUMIDITY', value: '45% — NOMINAL', status: 'ok' },
      { label: 'CRAC UNIT 1', value: 'OPERATIONAL', status: 'ok' },
      { label: 'CRAC UNIT 2', value: 'FAULT — OFFLINE', status: 'err' },
      { label: 'PDU-A', value: 'LOAD: 62%', status: 'ok' },
      { label: 'PDU-B', value: 'LOAD: 58%', status: 'ok' },
    ],
    tip: {
      heading: 'DR TIP // PHYSICAL INFRASTRUCTURE IN DR SCOPE',
      body: [
        'Most DR plans cover data. The best DR plans also cover',
        'physical failure scenarios:',
        '',
        '- CRAC unit failure: what is your cooling runout time?',
        '- PDU failure: are all racks dual-corded to separate PDUs?',
        '- Generator: how long does fuel last? When was it load-tested?',
        '- UPS: what is runtime at current load? When was battery replaced?',
        '',
        'A server room that loses cooling hits thermal shutdown in',
        'minutes. Your RTO assumes the physical plant is operational.',
        'Verify that assumption in writing.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
      ],
    },
  },

  // Management Console Room — the ARCHITECT terminal (blog integration)
  'console-architect-kb': {
    title: 'ARCHITECT KNOWLEDGE BASE',
    subtitle: 'FIELD MANUAL // anystackarchitect.com',
    lines: [
      { label: 'SOURCE', value: 'ANYSTACKARCHITECT.COM', status: 'ok' },
      { label: 'ARTICLES', value: '37 — DR / VEEAM / VMWARE', status: 'ok' },
      { label: 'LAST SYNC', value: 'CURRENT', status: 'ok' },
      { label: 'CLEARANCE', value: 'FIELD ENGINEER', status: 'ok' },
    ],
    tip: {
      heading: 'FIELD MANUAL // ANYSTACKARCHITECT.COM',
      body: [
        'This terminal is synchronized with the AnyStack Architect',
        'field manual. All DR runbooks, Veeam configuration guides,',
        'and infrastructure architecture references are sourced from:',
        '',
        '    anystackarchitect.com',
        '',
        'Written by engineers. For engineers.',
        'No vendor fluff. No marketing copy.',
        'Hands-on sysadmin and enterprise architect content covering:',
        '  - Veeam v13 backup & replication',
        '  - VMware vSphere 8 / VCF',
        '  - DR design patterns and runbooks',
        '  - Multi-tenant MSP architecture',
        '',
        'The game you are playing is a DR exercise.',
        'The site is the manual that gets you through it.',
      ],
    },
  },

  // Emergency Exit corridor — transition point
  'console-exit-gate': {
    title: 'EMERGENCY EXIT — LEVEL TRANSITION',
    subtitle: 'PROCEED TO STORAGE CATACOMBS',
    lines: [
      { label: 'LEVEL 1', value: 'VM FLOOR — COMPLETE', status: 'ok' },
      { label: 'LEVEL 2', value: 'STORAGE CATACOMBS', status: 'warn' },
      { label: 'THREAT LEVEL', value: 'ELEVATED', status: 'warn' },
      { label: 'RTO REMAINING', value: '01:44:22', status: 'err' },
    ],
    tip: {
      heading: 'DR TIP // DOCUMENT EVERYTHING',
      body: [
        'A DR runbook that exists only in your head is a single point',
        'of failure. When the incident happens at 3AM and you are sick,',
        'the person running the recovery needs written procedures.',
        '',
        'Minimum runbook contents:',
        '- Recovery priority order (which systems first)',
        '- Step-by-step restore procedures with screenshots',
        '- Credentials location (vault reference, not actual creds)',
        '- Escalation contacts with personal phone numbers',
        '- Vendor support contract numbers',
        '- Last test date and result',
        '',
        'Test the runbook by having someone else execute it.',
        'If they get stuck, the runbook is incomplete.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
      ],
    },
  },
};
