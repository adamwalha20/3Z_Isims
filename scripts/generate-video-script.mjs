import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const outputDir = path.resolve(process.cwd(), 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'ZEC_CAMPUS_HUB_VIDEO_TUTORIAL_SCRIPT.pdf');
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true,
  info: {
    Title: 'ZEC Campus Hub — Video Tutorial Script & Storyboard',
    Author: 'ZERO EXCLUSION CARBON POVERTY Campus Club ISIMS',
    Subject: 'Comprehensive 8-Minute Screen Walkthrough & Production Recording Script',
    Keywords: 'ZEC, Video Script, Storyboard, Tutorial, ISIMS, Production',
  },
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Brand Colors
const EMERALD_DARK = '#064e3b';
const EMERALD_PRIMARY = '#059669';
const EMERALD_LIGHT = '#ecfdf5';
const SLATE_DARK = '#0f172a';
const SLATE_MUTED = '#475569';
const BORDER_COLOR = '#e2e8f0';

function drawHeader() {
  doc.rect(50, 25, 495, 20).fill('#f8fafc');
  doc.fontSize(8).fillColor(SLATE_MUTED).text('ZERO EXCLUSION CARBON POVERTY (ZEC) CAMPUS CLUB — ISIMS SFAX', 55, 30);
  doc.fontSize(8).fillColor(EMERALD_PRIMARY).text('VIDEO PRODUCTION STORYBOARD & SCRIPT', 360, 30, { align: 'right' });
  doc.moveTo(50, 48).lineTo(545, 48).lineWidth(0.5).stroke(BORDER_COLOR);
}

function addScene(sceneNumber, title, duration, screenAction, narration, tips) {
  doc.addPage();
  drawHeader();

  doc.moveDown(1.2);
  doc.fontSize(9).fillColor(EMERALD_PRIMARY).text(`SCENE ${sceneNumber} • DURATION: ${duration}`.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveDown(0.2);
  doc.fontSize(16).fillColor(SLATE_DARK).text(title);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.2).stroke(EMERALD_PRIMARY);
  doc.moveDown(0.6);

  // Screen Action Box
  const actionStartY = doc.y;
  doc.rect(50, actionStartY, 495, 52).fill('#f8fafc');
  doc.rect(50, actionStartY, 3, 52).fill(SLATE_MUTED);
  doc.fontSize(8.5).fillColor(EMERALD_DARK).text('VISUAL / ON-SCREEN ACTION:', 60, actionStartY + 8);
  doc.fontSize(8.5).fillColor(SLATE_DARK).text(screenAction, 60, actionStartY + 22, { width: 475 });
  doc.y = actionStartY + 60;

  // Narration Box
  doc.fontSize(10).fillColor(EMERALD_DARK).text('VOICEOVER NARRATION (WORD-FOR-WORD):');
  doc.moveDown(0.3);
  doc.fontSize(9.5).fillColor(SLATE_DARK).lineGap(2.5).text(narration, { align: 'justify' });
  doc.moveDown(0.6);

  // Production Tips
  if (tips && tips.length > 0) {
    const tipsStartY = doc.y;
    doc.rect(50, tipsStartY, 495, 44).fill(EMERALD_LIGHT);
    doc.rect(50, tipsStartY, 3, 44).fill(EMERALD_PRIMARY);
    doc.fontSize(8.5).fillColor(EMERALD_DARK).text('PRODUCTION & EDITING DIRECTIONS:', 60, tipsStartY + 6);
    doc.fontSize(8).fillColor(SLATE_DARK).text(tips, 60, tipsStartY + 20, { width: 475 });
    doc.y = tipsStartY + 50;
  }
}

// ======================== COVER PAGE ========================
doc.rect(0, 0, 595, 842).fill('#0f172a');

doc.rect(50, 100, 495, 642).fill('#ffffff');
doc.rect(50, 100, 495, 12).fill(EMERALD_PRIMARY);

doc.fontSize(11).fillColor(EMERALD_PRIMARY).text('MULTIMEDIA & COMMUNICATIONS PRODUCTION', 80, 150, { characterSpacing: 2 });
doc.fontSize(10).fillColor(SLATE_MUTED).text('ZEC CAMPUS CLUB ISIMS • SFAX CHAPTER', 80, 170);

doc.fontSize(24).fillColor(SLATE_DARK).text('MASTERING ZEC CAMPUS HUB', 80, 220);
doc.fontSize(16).fillColor(EMERALD_PRIMARY).text('Complete Video Tutorial Script & Storyboard', 80, 255);
doc.fontSize(11).fillColor(SLATE_MUTED).text('A Professional 8-Minute Screen Walkthrough & Narration Guide', 80, 280);

doc.moveTo(80, 315).lineTo(515, 315).lineWidth(1).stroke(BORDER_COLOR);

doc.fontSize(10).fillColor(SLATE_DARK).text('VIDEO PRODUCTION SPECIFICATIONS:', 80, 340);
doc.fontSize(9).fillColor(SLATE_MUTED)
  .text('• Target Runtime: 7 Minutes 45 Seconds (8 Minutes max)', 95, 360)
  .text('• Resolution: 1080p Full HD (1920x1080) / 60 FPS', 95, 375)
  .text('• Audio Profile: Clear voiceover narration + soft low-fi background ambiance (-22dB)', 95, 390)
  .text('• Platform Url: https://3-z-isims.vercel.app', 95, 405)
  .text('• Target Audience: ISIMS University Students, Bureau Executives, Faculty Advisors', 95, 420);

doc.rect(80, 450, 435, 130).fill('#ecfdf5');
doc.rect(80, 450, 435, 130).lineWidth(0.5).stroke(EMERALD_PRIMARY);

doc.fontSize(9.5).fillColor(EMERALD_DARK).text('EPISODE CHAPTER SYNOPSIS', 95, 465);
doc.fontSize(8.5).fillColor(SLATE_MUTED)
  .text('Scene 1 (0:00 - 0:45): Introduction & The 3ZERO Mission at ISIMS', 95, 485)
  .text('Scene 2 (0:45 - 1:45): Login, Session Persistence & The Live Dashboard', 95, 500)
  .text('Scene 3 (1:45 - 3:00): Active Tasks, Milestone Checklists & XP Verification', 95, 515)
  .text('Scene 4 (3:00 - 4:15): Smart Meeting Center, AI 8D Summaries & Interactive Transcript', 95, 530)
  .text('Scene 5 (4:15 - 5:30): Smart QR Attendance, Physical Check-In & Punctuality Engine', 95, 545)
  .text('Scene 6 (5:30 - 6:45): Bureau Operational Cockpits (Presidency, Training, HR, Finance)', 95, 560)
  .text('Scene 7 (6:45 - 7:30): Admin Governance, 1-Click Rollback & System Telemetry', 95, 575);

doc.fontSize(8.5).fillColor(SLATE_MUTED).text('Produced by Technical Development Unit & Communications Team — ISIMS Sfax', 80, 680);

// ======================== SCENE 1 ========================
addScene(
  1,
  'Introduction & Welcome to ZEC Campus Hub',
  '0:00 – 0:45',
  'Open with high-energy animated intro of the 3ZERO Club logo. Transition into a smooth desktop browser recording navigating to https://3-z-isims.vercel.app. Slow zoom into the green header pill.',
  '"Welcome to the official video guide for ZEC Campus Hub—the digital nerve center of the ZERO EXCLUSION CARBON POVERTY Club at ISIMS Sfax.\n\nInspired by Nobel Peace Laureate Muhammad Yunus, our club is united around three bold pillars: Zero Poverty, Zero Unemployment, and Zero Net Carbon Emissions. To coordinate our student initiatives, physical workshops, and intellectual archives, we built this state-of-the-art campus hub.\n\nWhether you are an active student member earning XP, a bureau officer coordinating a major event, or a newcomer joining us this semester, this video will show you everything you need to know in under eight minutes."',
  'Add lower-third graphic: "Adam Walha — Lead Technical Architect & ZEC Admin". Overlay subtle chime sound on logo reveal.'
);

// ======================== SCENE 2 ========================
addScene(
  2,
  'Logging In, Navigation & Real-Time Dashboard',
  '0:45 – 1:45',
  'Show member signing in with email. Demonstrate instant session resumption. Cursor circles the top-right XP badge, the green "Live Supabase Synced" status, and the Notification Bell.',
  '"Accessing the hub is instant and seamless. Simply sign in with your student email address. Once logged in, your session remains persistent across mobile and desktop browsers.\n\nLook at the top header: you immediately see your current XP balance, active tier rank, and real-time connectivity status. When other officers make changes or post announcements, your screen updates dynamically without needing to refresh.\n\nOn mobile, our thumb-friendly bottom navigation gives you immediate access to your Home dashboard, active Tasks, Leaderboard Rankings, and the Club Calendar."',
  'Highlight the Realtime Sync pill with a green glowing pulsing border effect. Demonstrate responsive switch to mobile viewport.'
);

// ======================== SCENE 3 ========================
addScene(
  3,
  'Task Workflows, Deliverables & Earning XP',
  '1:45 – 3:00',
  'Click into the Tasks tab. Open a sample task: "Design Social Media Graphics for Climate Workshop". Check off sub-items. Click "Submit for Verification". Show real-time review status.',
  '"Tasks are the engine of club progress. When you open the Tasks section, you will see deliverables assigned directly to you or open for volunteers within your department.\n\nEach task features a clear description, milestone checklist, deadline in Africa/Tunis time, and an explicit XP reward. As you complete items, check them off in real time. Once your work is ready, attach your deliverables and click \'Submit for Verification\'.\n\nYour department lead will review your submission. Once approved, the configured XP points are automatically credited to your account, leveling up your rank on the campus leaderboard!"',
  'Zoom in on the XP badge counter animating from 420 XP to 455 XP. Display an alert badge: "+35 XP Awarded — Milestone Verified".'
);

// ======================== SCENE 4 ========================
addScene(
  4,
  'Smart Meeting Center & AI-Powered Archives',
  '3:00 – 4:15',
  'Navigate to Meetings tab. Click an upcoming meeting to show the direct "Join Google Meet" link. Then open a past meeting: play video recording, click on a transcript sentence to jump playback, highlight 8D AI summary.',
  '"Next is one of the most powerful modules: the Smart Meeting Center. All club members have full visibility into our meeting schedule. When a meeting is live, you can click \'Join Google Meet\' to jump straight into the call—no friction, no passwords.\n\nMissed a crucial meeting? Don\'t worry. Open past archives to find a synchronized video recording paired with word-by-word transcripts. Search for any term—like \'Sponsor\' or \'Budget\'—and click the timestamp to jump video playback to that exact second.\n\nBelow each recording, our AI generates an 8-dimensional summary: covering decisions, financials, risks, and actionable assignments that bureau officers can convert into real hub tasks with one click."',
  'Show mouse clicking the word "Budget Approved" in the transcript; video immediately jumps to 14:32 with sound sync.'
);

// ======================== SCENE 5 ========================
addScene(
  5,
  'Smart QR Attendance & Mobile Check-In',
  '4:15 – 5:30',
  'Switch to mobile recording. Go to Profile > "My Attendance QR". Then switch to the desk organizer view opening the Camera Scanner. Scan the QR code. Show green success badge: "Present (On Time) +15 XP".',
  '"For physical sessions—like workshops at the Smart Green Lab or conferences in the auditorium—we use our Smart QR Attendance system.\n\nEvery member has a permanent personal QR pass in their profile. Simply pull up your QR code on your phone when arriving at the venue.\n\nTo ensure institutional integrity, the Attendance Scanner is strictly accessible to only the Secretary General, Vice President, President, and Club Administrator. When an authorized officer scans your code, the system evaluates your arrival against the official start time in Africa/Tunis. If you arrive within the grace period, you are marked \'Present (On Time)\' and awarded full XP immediately.\n\nRunning late? Arriving past the threshold automatically records a Late status with adjusted XP. And if your phone battery dies, officers can use the manual search fallback to verify your attendance without delays."',
  'Side-by-side split screen: Member holding phone with QR code on the left, Desk scanner scanning and displaying instant green verification badge on the right.'
);

// ======================== SCENE 6 ========================
addScene(
  6,
  'Bureau Operational Cockpits & Governance',
  '5:30 – 6:45',
  'Switch user role to Bureau. Open the President Cockpit, then Training & Innovation Cockpit, and Treasury Ledger. Highlight budget balances, recruitment queues, and session creators.',
  '"If you are elected or appointed to the Executive Bureau, your dashboard unlocks specialized Operational Cockpits tailored to your mandate.\n\nThe President Cockpit oversees club-wide KPIs, department health, and constitutional milestones. The Training & Innovation Cockpit manages technical tracks, trainer schedules, and student incubator projects.\n\nTreasurers manage our live double-entry ledger, verifying receipts and cashflow balances with real database persistence. Meanwhile, HR managers review semester recruitment applications and track member engagement trends."',
  'Add glowing cursor focus around the "Export Audit Ledger" button and department switcher tabs.'
);

// ======================== SCENE 7 ========================
addScene(
  7,
  'Admin Governance, Undo Safety & System Telemetry',
  '6:45 – 7:30',
  'Navigate to /admin. Assign a bureau role, then click "Undo" to demonstrate safety rollback. Navigate to /admin/health to show live database latency, Auth, and Realtime probes.',
  '"Governance integrity is paramount. In the Administrator Console, our club admin manages official mandates and permissions.\n\nEvery administrative action is tracked in an auditable ledger. Made a mistake? With our 1-click Undo feature, the admin can instantly revert any mandate assignment back to its previous state safely.\n\nFurthermore, our System Telemetry page continuously monitors database query latency, Supabase Auth health, Realtime table publications, and automated reminder email queues to guarantee zero downtime during campus events."',
  'Show live latency graph flashing 18ms (Green - Optimal) and all 5 telemetry checks showing checkmarks.'
);

// ======================== SCENE 8 ========================
addScene(
  8,
  'Conclusion, Community & Next Steps',
  '7:30 – 8:00',
  'Return to the main homepage. Camera pans over the animated leaderboard and upcoming tree-planting event banner. Closing animation with ISIMS and 3ZERO Club contacts.',
  '"ZEC Campus Hub is more than just software—it is our shared commitment to environmental sustainability, digital innovation, and student leadership at ISIMS Sfax.\n\nCheck out the platform today at 3-z-isims.vercel.app, explore your tasks, download your QR pass, and help us accelerate the journey toward Zero Poverty, Zero Unemployment, and Zero Carbon Emissions.\n\nThank you for watching, and see you at our next session!"',
  'Display closing slide: "Website: 3-z-isims.vercel.app • Contact: adamwalha20@gmail.com • Sfax, Tunisia". Fade to black.'
);

// ======================== FOOTER & PAGE NUMBERING ========================
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  if (i > 0) {
    doc.fontSize(8).fillColor(SLATE_MUTED).text(
      `ZEC Campus Hub Video Tutorial Script — Page ${i + 1} of ${range.count}`,
      50,
      800,
      { align: 'center', width: 495 }
    );
  }
}

doc.end();

writeStream.on('finish', () => {
  console.log(`Successfully generated video script PDF at: ${outputPath}`);
});

