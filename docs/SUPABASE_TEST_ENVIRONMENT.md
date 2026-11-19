# ZEC CAMPUS HUB — SUPABASE TEST ENVIRONMENT DOCUMENTATION

**Target Environment:** Supabase Cloud Project `zplvfgfmurgghezoyjxh`  
**Host:** `db.zplvfgfmurgghezoyjxh.supabase.co` (PostgreSQL 17.11)  
**Reset Date:** 2026-11-19  
**Status:** Clean Test Seed Active & Healthy

---

## 1. Test Environment Summary

The ZEC Campus Hub database has undergone a safe reset and structured test data seeding. All previous legacy test records were safely removed in strict foreign key order, preserving master schemas, triggers, indexes, and primary administrator accounts.

A complete set of **14 standard test accounts** has been generated and provisioned with confirmed credentials, realistic Tunisian student profiles, custom 3D cartoon avatars, and appropriate department affiliations.

---

## 2. Standard Test Accounts & Credentials

All test accounts use the standard test password:
```text
ZecTest2026!
```

| # | Role / Position | Email | Full Name | Department | Avatar |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Club Administrator** | `admin.test@zec-campus.tn` | Administrator ZEC | Governance (`governance`) | `/avatars/avatar-1.png` |
| **2** | **President** | `president.test@zec-campus.tn` | Nourhene Ben Salem | Governance (`governance`) | `/avatars/avatar-2.png` |
| **3** | **Vice President** | `vp.test@zec-campus.tn` | Mohamed Aziz Kallel | Governance (`governance`) | `/avatars/avatar-3.png` |
| **4** | **Secretary General** | `secretary.test@zec-campus.tn` | Sarra Trabelsi | Governance (`governance`) | `/avatars/avatar-4.png` |
| **5** | **Treasurer** | `treasurer.test@zec-campus.tn` | Farah Rekik | Governance (`governance`) | `/avatars/avatar-5.png` |
| **6** | **HR Manager** | `hr.test@zec-campus.tn` | Yassine Chaari | Governance (`governance`) | `/avatars/avatar-6.png` |
| **7** | **Marketing & Design** | `marketing.test@zec-campus.tn` | Mariem Fakhfakh | Comms & Media (`comms-media`) | `/avatars/avatar-1.png` |
| **8** | **Comms & Engagement** | `comms.test@zec-campus.tn` | Skander Louati | Comms & Media (`comms-media`) | `/avatars/avatar-2.png` |
| **9** | **Events Manager** | `events.test@zec-campus.tn` | Ahmed Drira | Events & Logistics (`events-logistics`) | `/avatars/avatar-3.png` |
| **10**| **Project Manager** | `projects.test@zec-campus.tn` | Khadija Sellami | Events & Logistics (`events-logistics`) | `/avatars/avatar-4.png` |
| **11**| **Sustainable Campus** | `sustainability.test@zec-campus.tn` | Omar Masmoudi | Training & Innovation (`training-innovation`) | `/avatars/avatar-5.png` |
| **12**| **Partnerships Lead** | `partnerships.test@zec-campus.tn` | Amine Bouaziz | Partnerships (`partnerships`) | `/avatars/avatar-6.png` |
| **13**| **Training & Innovation**| `training.test@zec-campus.tn` | Zeineb Ghorbel | Training & Innovation (`training-innovation`) | `/avatars/avatar-1.png` |
| **14**| **Ordinary Member** | `member.test@zec-campus.tn` | Ilyes Hachicha | Training & Innovation (`training-innovation`) | `/avatars/avatar-2.png` |

---

## 3. Seeded Test Data Overview

### 3.1 Projects (`public.projects`)
1. **Zero Carbon Campus Audit 2026**
   - Department: Training & Innovation
   - Owner: Omar Masmoudi (Sustainable Campus Manager)
   - Budget: 1,500.00 TND | Status: `active`
2. **ZEC Hackathon: Green Tech Solutions**
   - Department: Events & Logistics
   - Owner: Khadija Sellami (Project Manager)
   - Budget: 3,500.00 TND | Status: `active`
3. **Zero Waste Digital Media Sprint**
   - Department: Communications & Media
   - Owner: Mariem Fakhfakh (Marketing & Design Lead)
   - Budget: 800.00 TND | Status: `active`
4. **Corporate Green Tech Alliance**
   - Department: Partnerships & Sponsorships
   - Owner: Amine Bouaziz (Partnerships Lead)
   - Budget: 5,000.00 TND | Status: `active`

### 3.2 Tasks (`public.tasks`)
- `f0000000-0000-0000-0000-000000000001`: **Audit Amphi A & Labs Electrical Consumption**
  - Department: Training & Innovation | Creator: Omar Masmoudi | Assignee: Ilyes Hachicha (Member)
  - Status: `in_progress` | Priority: `high` | Requires Verification: `true`
- `f0000000-0000-0000-0000-000000000002`: **Design Official Hackathon Banners & Posters**
  - Department: Communications & Media | Creator: Mariem Fakhfakh | Assignee: Skander Louati (Comms)
  - Status: `waiting_verification` | Priority: `medium` | Requires Verification: `true`
- `f0000000-0000-0000-0000-000000000003`: **Reserve ISIMS Main Auditorium & Audio/Visual Gear**
  - Department: Events & Logistics | Creator: Ahmed Drira | Assignee: Khadija Sellami (Projects)
  - Status: `done` | Priority: `high` | Verified by: Nourhene Ben Salem (President) | XP Awarded: `true`
- `f0000000-0000-0000-0000-000000000004`: **Draft Industry Sponsorship Proposal Dossier**
  - Department: Partnerships | Creator: Amine Bouaziz | Assignee: Amine Bouaziz
  - Status: `in_progress` | Priority: `urgent` | Requires Verification: `true`
- `f0000000-0000-0000-0000-000000000005`: **Update Club Member Directory & Issue QR Badges**
  - Department: Governance | Creator: Sarra Trabelsi | Assignee: Yassine Chaari (HR)
  - Status: `in_progress` | Priority: `medium` | Requires Verification: `false`

### 3.3 Events (`public.events`)
- **3Zero Innovation Summit 2026**
  - Date: November 28, 2026 | Location: ISIMS Conference Hall & Amphi 1
  - Organizer: Ahmed Drira (Events Manager) | Status: `published` | Visibility: `club`
- **Green Tech & IoT Coding Bootcamp**
  - Date: December 05, 2026 | Location: Lab 3Z - Innovation Hub
  - Organizer: Zeineb Ghorbel (Training Manager) | Status: `published` | Visibility: `department`

### 3.4 Smart Meetings (`public.meetings`)
- **Executive Board Weekly Governance Sync** (Confidential executive meeting)
- **Comms & Media Sprint Review** (Departmental meeting)
- **ZEC General Assembly & All-Hands** (Club-wide general assembly)

### 3.5 QR Attendance Session (`public.sessions`)
- **General Assembly November Attendance Session**
  - Date: November 16, 2026 | Status: `closed`
  - Seeded attendees with on-time check-ins and verified XP: Ilyes Hachicha (+20 XP), Nourhene Ben Salem (+20 XP), Yassine Chaari (+20 XP).

### 3.6 Official Announcements (`public.announcements`)
- **Welcome to ZEC Campus Hub — Official Launch** (Pinned, published by President)
- **Green Tech Hackathon 2026 — Call for Student Teams** (Published by Events Manager)

---

## 4. Primary Administrator Accounts Preservation

The following primary administrator accounts were completely protected and preserved during the reset:
- `adamwalha20@gmail.com` (Super Admin)
- `adamwalha2@gmail.com` (Administrator)
- `adamwalha.isims@gmail.com` (Administrator)

---

## 5. Automated Reset Verification Command

To re-run test assertions against the live environment:
```bash
npm test
```
To build and verify production bundles:
```bash
npm run build
```
