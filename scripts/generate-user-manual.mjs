import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const outputDir = path.resolve(process.cwd(), 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'ZEC_CAMPUS_HUB_USER_MANUAL.pdf');
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true,
  info: {
    Title: 'ZEC Campus Hub — Official User Manual',
    Author: 'ZERO EXCLUSION CARBON POVERTY Campus Club ISIMS',
    Subject: 'Comprehensive User Manual for Members, Bureau Officers, Secretary & Admin',
    Keywords: 'ZEC, ISIMS, User Manual, 3ZERO Club, Smart Campus Hub',
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

function drawHeader(title) {
  doc.rect(50, 25, 495, 20).fill('#f8fafc');
  doc.fontSize(8).fillColor(SLATE_MUTED).text('ZERO EXCLUSION CARBON POVERTY (ZEC) CAMPUS CLUB — ISIMS SFAX', 55, 30);
  doc.fontSize(8).fillColor(EMERALD_PRIMARY).text('OFFICIAL PLATFORM USER MANUAL', 380, 30, { align: 'right' });
  doc.moveTo(50, 48).lineTo(545, 48).lineWidth(0.5).stroke(BORDER_COLOR);
}

function addChapterHeader(num, title) {
  doc.addPage();
  drawHeader();
  
  doc.moveDown(1.5);
  doc.fontSize(10).fillColor(EMERALD_PRIMARY).text(`CHAPTER ${num}`.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveDown(0.2);
  doc.fontSize(20).fillColor(SLATE_DARK).text(title, { underline: false });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).stroke(EMERALD_PRIMARY);
  doc.moveDown(0.8);
}

function addSectionTitle(title) {
  doc.moveDown(0.6);
  doc.fontSize(12).fillColor(EMERALD_DARK).text(title);
  doc.moveDown(0.3);
}

function addParagraph(text) {
  doc.fontSize(9.5).fillColor(SLATE_DARK).lineGap(2.5).text(text, { align: 'justify' });
  doc.moveDown(0.5);
}

function addBullet(bulletTitle, bulletText) {
  doc.fontSize(9).fillColor(SLATE_DARK).text(`• `, { continued: true });
  doc.fontSize(9).fillColor(EMERALD_DARK).text(`${bulletTitle}: `, { continued: true });
  doc.fontSize(9).fillColor(SLATE_MUTED).text(bulletText);
  doc.moveDown(0.2);
}

function addCallout(title, body) {
  const startY = doc.y;
  doc.rect(50, startY, 495, 42).fill(EMERALD_LIGHT);
  doc.rect(50, startY, 4, 42).fill(EMERALD_PRIMARY);
  doc.fontSize(9).fillColor(EMERALD_DARK).text(`PRO-TIP: ${title}`, 65, startY + 6);
  doc.fontSize(8.5).fillColor(SLATE_DARK).text(body, 65, startY + 20, { width: 465 });
  doc.y = startY + 48;
}

// ======================== COVER PAGE ========================
doc.rect(0, 0, 595, 842).fill('#064e3b');

doc.rect(50, 100, 495, 642).fill('#ffffff');
doc.rect(50, 100, 495, 12).fill(EMERALD_PRIMARY);

doc.fontSize(12).fillColor(EMERALD_PRIMARY).text('ZERO EXCLUSION CARBON POVERTY', 80, 150, { characterSpacing: 2 });
doc.fontSize(10).fillColor(SLATE_MUTED).text('ISIMS SFAX STUDENT CHAPTER • PLATFORM DOCUMENTATION', 80, 170);

doc.fontSize(28).fillColor(SLATE_DARK).text('ZEC CAMPUS HUB', 80, 220);
doc.fontSize(18).fillColor(EMERALD_PRIMARY).text('Complete Production User Manual', 80, 255);
doc.fontSize(12).fillColor(SLATE_MUTED).text('A Step-by-Step Practical Operational Handbook for All Roles', 80, 285);

doc.moveTo(80, 320).lineTo(515, 320).lineWidth(1).stroke(BORDER_COLOR);

doc.fontSize(10).fillColor(SLATE_DARK).text('COVERAGE & AUDIENCE:', 80, 345);
doc.fontSize(9.5).fillColor(SLATE_MUTED)
  .text('• General Student Members (Tasks, QR Passes, Meetings, Leaderboard)', 95, 365)
  .text('• Bureau Officers (Presidency, Training, HR, Marketing, Treasury, Sustainability)', 95, 385)
  .text('• Secretary General (Documentation, Decisions, Attendance, Minutes)', 95, 405)
  .text('• Club Administrator (Governance, Security, Mandates, System Telemetry)', 95, 425);

doc.rect(80, 460, 435, 120).fill('#f8fafc');
doc.rect(80, 460, 435, 120).lineWidth(0.5).stroke(BORDER_COLOR);

doc.fontSize(9).fillColor(EMERALD_DARK).text('SYSTEM SPECIFICATIONS & COMPLIANCE', 95, 475);
doc.fontSize(8.5).fillColor(SLATE_MUTED)
  .text('• Platform Domain: https://3-z-isims.vercel.app', 95, 495)
  .text('• Canonical Club Timezone: Africa/Tunis (UTC+1 Year-Round)', 95, 510)
  .text('• Real-Time Publication: 15 PostgreSQL Supabase Tables Synchronized', 95, 525)
  .text('• Automated Verification Suite: 105 Test Assertions Passing (100%)', 95, 540)
  .text('• Version: Release v2.4-Production-Gold (November 2026)', 95, 555);

doc.fontSize(9).fillColor(SLATE_MUTED).text('Published by the Executive Bureau & Technical Development Unit — ISIMS Sfax', 80, 680);

// ======================== CHAPTER 1 ========================
addChapterHeader(1, 'Introduction & Overview of ZEC Campus Hub');

addSectionTitle('1.1 The 3ZERO Club Movement & ISIMS Sfax Chapter');
addParagraph('The ZERO EXCLUSION CARBON POVERTY (ZEC) Campus Club at the Higher Institute of Computer Science and Multimedia of Sfax (ISIMS) is part of the global Nobel Peace Laureate Muhammad Yunus 3ZERO movement: Zero Poverty, Zero Unemployment, and Zero Net Carbon Emissions.');
addParagraph('The ZEC Campus Hub (accessible at https://3-z-isims.vercel.app) is the official digital nerve center designed and engineered to streamline club operations, track student green initiatives, coordinate physical training sessions, archive intellectual meeting memory, and gamify environmental contributions through an auditable Experience Points (XP) system.');

addSectionTitle('1.2 Platform Architecture & Guiding Principles');
addParagraph('Unlike static club sites, ZEC Campus Hub is an event-driven, real-time collaboration ecosystem. Every single action—whether checking into a workshop at the Smart Green Lab, submitting a task deliverable, or assigning a mandate—is verified cryptographically, synced instantly across all active connected browsers, and permanently logged in an immutable audit ledger.');

addSectionTitle('1.3 Target Roles & Persona Breakdown');
addBullet('Ordinary Member', 'Any registered ISIMS student who joins the club. Can view tasks, browse public meetings, access attendance passes, earn XP, and climb the leaderboard.');
addBullet('Bureau Officer', 'Elected or appointed executive committee members who lead specific departments (e.g., Training, Treasury, HR, Marketing, Sustainability). Holds operational cockpit access to assign work and manage resources.');
addBullet('Secretary General', 'The administrative custodian responsible for drafting and publishing meeting minutes, archiving institutional decisions, and verifying physical session presence.');
addBullet('Club Administrator', 'The technical and constitutional authority (primary mandate: adamwalha20@gmail.com) who manages member privileges, assigns bureau positions, inspects telemetry, and executes safety rollbacks.');

addCallout('Access Everywhere', 'ZEC Campus Hub is a fully responsive Progressive Web Application. You can pin it to your smartphone home screen for one-tap access to your QR pass and meeting calendar.');

// ======================== CHAPTER 2 ========================
addChapterHeader(2, 'Getting Started & Account Access');

addSectionTitle('2.1 Account Authentication & Security');
addParagraph('Access to ZEC Campus Hub is guarded by Supabase Authentication. Club members sign in using their registered institutional or verified personal email address. New club members are registered during semester recruitment drives through the HR department portal.');

addSectionTitle('2.2 Persistent Sessions & Multi-Device Login');
addParagraph('Once authenticated, session tokens are securely persisted in encrypted HTTP cookies. You do not need to sign in repeatedly when opening the application on your phone before a physical workshop.');

addSectionTitle('2.3 Role-Based Access Control (RBAC)');
addParagraph('The platform evaluates permissions dynamically at both the API/Database level (via PostgreSQL Row Level Security policies) and the User Interface layer:');
addBullet('Ordinary Member View', 'Streamlined interface displaying personal deliverables, public club events, meeting archives, and the member leaderboard.');
addBullet('Bureau View', 'Unlocks Department Cockpits, task creation tools, event management modals, and member verification queues.');
addBullet('Admin View', 'Exclusively reserved for the verified club administrator, providing full access to governance mandates, audit rollback, and live infrastructure telemetry.');

addCallout('Role Switcher Preview', 'Executive officers holding multiple assignments can toggle between role perspectives using the role pill dropdown in the top navigation header.');

// ======================== CHAPTER 3 ========================
addChapterHeader(3, 'Member Navigation & Daily Workflow');

addSectionTitle('3.1 Desktop & Mobile Navigation Layout');
addParagraph('The interface follows Google Stitch design aesthetics, featuring clean emerald borders, slate typography, high contrast cards, and fluid transition animations:');
addBullet('Top Bar', 'Shows Chapter status, active role selector, Realtime Sync indicator, Notification Bell, and user avatar.');
addBullet('Bottom App Bar (Mobile)', 'Provides rapid thumbs-reach navigation: Home (Dashboard), Tasks, Ranking (Leaderboard), Events, and All Pages directory.');
addBullet('Sidebar Navigation (Desktop)', 'Displays categorized links for Governance, Operations, Documentation, Financials, and Logistics.');

addSectionTitle('3.2 Recommended Daily Workflow');
addParagraph('Active members are advised to follow this routine:');
addBullet('Step 1: Check In', 'Open the Hub every morning to review unread notifications and scheduled meeting reminders.');
addBullet('Step 2: Review Tasks', 'Navigate to Tasks to check active sprint deadlines and submit completed work for XP validation.');
addBullet('Step 3: Attend & Scan', 'When attending physical workshops, open My Attendance QR to check in seamlessly at the door.');
addBullet('Step 4: Meeting Archives', 'If you missed a meeting, open the Smart Meeting Center to review the AI summary and key decisions in 3 minutes.');

// ======================== CHAPTER 4 ========================
addChapterHeader(4, 'Task Management & Contribution Tracking');

addSectionTitle('4.1 The Task Lifecycle Workflow');
addParagraph('Task management powers accountability across all projects and departments. Tasks follow a strict four-state workflow:');
addBullet('To Do', 'Task has been formulated and assigned to a member with an explicit XP reward, deadline, and instructions.');
addBullet('In Progress', 'The member is actively executing the task and checking off sub-deliverable items.');
addBullet('In Review', 'The assignee has completed all checklist items and submitted evidence (links, files, or notes). The task is locked awaiting verification.');
addBullet('Completed', 'An authorized bureau officer or admin approves the submission. Configured XP is credited to the member account immediately.');

addSectionTitle('4.2 Submitting Work for XP Verification');
addParagraph('Members cannot award themselves XP. When all checklist items are marked complete, a "Submit for Verification" action button appears. Clicking this triggers an automated notification to the Department Lead.');

addCallout('Anti-Abuse Conflict of Interest Check', 'A bureau officer who is assigned a task cannot approve their own submission. Another officer or the Administrator must verify the deliverable to maintain integrity.');

// ======================== CHAPTER 5 ========================
addChapterHeader(5, 'Smart Meeting Center');

addSectionTitle('5.1 Public Meeting Visibility & Institutional Memory');
addParagraph('Every meeting conducted by ZEC Campus Club—from general assemblies to department scrums—is permanently archived in the Smart Meeting Center. General members have full visibility into upcoming schedules, agendas, and historical archives.');

addSectionTitle('5.2 Joining Google Meet Directly');
addParagraph('Members do not need to wait inside the Hub to attend an online call. The "Join Meeting" button opens Google Meet directly in a new window or mobile app without requiring intermediate authentication.');

addSectionTitle('5.3 Video Recordings, Transcripts & Interactive Seeking');
addParagraph('Past meetings feature an embedded media player synchronized with word-by-word timestamped transcripts. Clicking any sentence or speaker segment in the transcript instantly seeks the recording to that exact second.');

addSectionTitle('5.4 8-Dimensional AI Meeting Summaries');
addParagraph('Every recorded session is processed into an 8D executive synthesis:');
addBullet('1. Executive Overview', 'High-level purpose and outcomes of the session.');
addBullet('2. Key Discussions', 'Major topics debated by attendees.');
addBullet('3. Decisions Adopted', 'Official club resolutions agreed upon.');
addBullet('4. Action Items', 'Concrete tasks assigned to specific members with target deadlines.');
addBullet('5. Financial & Resource Implications', 'Budget authorizations or sponsor impacts.');
addBullet('6. Risks & Blockers', 'Identified obstacles and mitigation strategies.');
addBullet('7. Next Milestones', 'Upcoming checkpoints.');
addBullet('8. Attendance Quorum', 'Validated participants and absentees.');

addCallout('One-Click Task Conversion', 'Bureau officers can click "Convert to Hub Task" on any AI action item to automatically instantiate an actionable task in the assignee’s backlog.');

// ======================== CHAPTER 6 ========================
addChapterHeader(6, 'Smart QR Attendance & Check-In System');

addSectionTitle('6.1 Personal Dynamic Member Pass');
addParagraph('Every registered member possesses a unique digital pass accessible via Profile > "My Attendance QR". The pass contains an opaque cryptographic verification token that prevents credential spoofing or URL tampering.');

addSectionTitle('6.2 Physical Session Check-In Routine');
addBullet('Arrival at Venue', 'Students present their smartphone screen to the attendance desk.');
addBullet('Scanner Verification', 'The session organizer scans the QR code using the in-app camera scanner.');
addBullet('Instant Punctuality Evaluation', 'The system evaluates arrival time against the Africa/Tunis session start time:');
addBullet('Present (On Time)', 'Checked in before or within the configured late threshold (e.g. +10 mins). Full XP (+15 XP) is granted.');
addBullet('Late Arrival', 'Checked in after the threshold. Partial XP (+10 XP) is granted.');
addBullet('Manual Fallback Search', 'If a student phone battery dies, the organizer can search the member by name or student ID and record manual attendance with verification.');

// ======================== CHAPTER 7 ========================
addChapterHeader(7, 'Notifications & Email Automation');

addSectionTitle('7.1 Multi-Channel Communication Matrix');
addParagraph('ZEC Campus Hub maintains a unified notification bus. Members are alerted via:');
addBullet('In-App Notification Bell', 'Real-time badge counter updating on new tasks, meeting updates, or XP awards.');
addBullet('Automated Email Reminders', 'Scheduled notifications sent via Resend for meeting reminders (24h and 1h prior) and impending task deadlines.');
addBullet('System Alerts', 'Urgent club-wide broadcasts and administrative announcements pinned to the top of the dashboard.');

addSectionTitle('7.2 Timezone Invariants (Africa/Tunis)');
addParagraph('All scheduled reminder timestamps, meeting calendars, and cron triggers operate strictly under Africa/Tunis time (UTC+1 year-round). Members abroad will always see meeting hours anchored to campus time.');

// ======================== CHAPTER 8 ========================
addChapterHeader(8, 'XP, Gamification & Leaderboard');

addSectionTitle('8.1 Experience Points (XP) Economy');
addParagraph('XP quantifies each member’s active contribution to the 3ZERO vision. XP cannot be bought or transferred; it is awarded solely through verified actions:');
addBullet('Physical Workshop Attendance', '+15 XP (On Time) / +10 XP (Late)');
addBullet('General Meeting Presence', '+10 XP');
addBullet('Standard Task Completion', '+20 XP to +50 XP (based on complexity)');
addBullet('Project Milestone Delivery', '+100 XP');

addSectionTitle('8.2 Rank Hierarchy & Milestones');
addBullet('Novice', '0 – 99 XP (Initial joining tier)');
addBullet('Contributor', '100 – 299 XP (Active participant)');
addBullet('Core Member', '300 – 699 XP (Reliable project driver)');
addBullet('Master', '700 – 1,499 XP (Department cornerstone)');
addBullet('Legend', '1,500+ XP (Distinguished campus leader)');

// ======================== CHAPTER 9 ========================
addChapterHeader(9, 'Bureau Workspace & Department Cockpits');

addSectionTitle('9.1 Specialized Operational Workspaces');
addParagraph('Executive officers access tailored control centers:');
addBullet('President Cockpit', 'Executive dashboard monitoring overall club health, strategic milestones, departmental budget utilization, and executive board decisions.');
addBullet('Training & Innovation Cockpit', 'Dedicated center to plan technical workshops, monitor trainer availability, track attendee skill progression, and manage innovation project incubators.');
addBullet('Treasury & Financial Cockpit', 'Double-entry ledger manager, cash balance tracker, sponsorship disbursement log, and expense receipt auditor.');
addBullet('HR & Recruitment Cockpit', 'Student recruitment pipeline, membership approvals, member skill inventory, and retention metrics.');
addBullet('Marketing & Sustainability Cockpits', 'Social campaigns, campus carbon footprint tracker, and eco-initiatives.');

// ======================== CHAPTER 10 ========================
addChapterHeader(10, 'Secretary General & Documentation Management');

addSectionTitle('10.1 Meeting Minutes Production');
addParagraph('The Secretary General can compile and export official club meeting minutes directly from recorded sessions, incorporating attendance logs, agenda items, debates, and final resolutions.');

addSectionTitle('10.2 Official Decision Registry');
addParagraph('All constitutional, financial, and organizational decisions approved during executive meetings are published to the searchable Club Decision Registry, ensuring institutional continuity year over year.');

// ======================== CHAPTER 11 ========================
addChapterHeader(11, 'Administrator Governance & Console');

addSectionTitle('11.1 Mandate Assignment & Access Control');
addParagraph('The Administrator Console (/admin) provides supreme governance controls:');
addBullet('Executive Mandates', 'Assign verified registered students to one of the 12 constitutional bureau mandates.');
addBullet('Audit Log Inspection', 'Every administrative change is recorded with actor ID, timestamp, and metadata diff.');
addBullet('One-Click Undo Rollback', 'Accidental mandate or role assignments can be reverted instantly with a single click, restoring the member’s previous mandate.');

addSectionTitle('11.2 System Telemetry & Health Probes (/admin/health)');
addParagraph('Real-time infrastructure diagnostic screen monitoring:');
addBullet('PostgreSQL Ping Latency', 'Millisecond query responsiveness.');
addBullet('Auth Service', 'Token validation health.');
addBullet('Realtime Publication', 'Count of actively published PostgreSQL tables.');
addBullet('Storage Engine', 'Supabase S3 bucket availability.');
addBullet('Email Dispatch Queue', 'Pending vs. dispatched reminder counts.');

// ======================== CHAPTER 12 ========================
addChapterHeader(12, 'Frequently Asked Questions & Troubleshooting');

addSectionTitle('12.1 Common User Scenarios');
addBullet('Q: What if I lose my phone or the screen is cracked during attendance?', 'A: Inform the session desk officer. They can use the "Manual Fallback Search" tab in the scanner to look up your student ID and verify your attendance.');
addBullet('Q: Why did I receive only +10 XP instead of +15 XP for a workshop?', 'A: If you check in after the configured Late Threshold (typically 10 minutes after scheduled start), the system automatically categorizes the scan as Late Arrival.');
addBullet('Q: How do I know if my task deliverable was approved?', 'A: You will receive an immediate in-app notification and your XP balance on the top header will increment automatically.');
addBullet('Q: Who should I contact for technical support or access issues?', 'A: Contact the Technical Development Lead or email adamwalha20@gmail.com.');

// ======================== FOOTER & PAGE NUMBERING ========================
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  if (i > 0) {
    doc.fontSize(8).fillColor(SLATE_MUTED).text(
      `ZEC Campus Hub User Manual — Page ${i + 1} of ${range.count}`,
      50,
      800,
      { align: 'center', width: 495 }
    );
  }
}

doc.end();

writeStream.on('finish', () => {
  console.log(`Successfully generated user manual PDF at: ${outputPath}`);
});
