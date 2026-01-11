# STATELINK – Complete Feature List

---
TODO

* create testcases
* add email confirmation
* add better context tags (like drug hangover)


---

## Group Dynamics


- **Admin Controls:**
  - Interval Mode: Toggle between "Fixed" (static times) and "Random" (stochastic pings)
  - Frequency: Set how many pings occur within a x hour or x week cycle
  - Quiet Hours: Define specific "Do Not Disturb" windows (e.g., 23:00 to 07:00)

---

## The Vibe Check Loop

- **Edit:** Be able to change the ratings from the last 24 hours.
- **History View:** Personal  trend visualization (line chart/sparkline)

---

## PWA & Technical Automation

- **PWA Installation:**
  - Web Manifest configuration for standalone mode
  - Custom "Add to Home Screen" UI instructions
  - Service Worker implementation for offline viewing of recent data
- **Cron Jobs (Vercel Cron):**
  - Minute-by-minute evaluation of group ping logic
  - Calculation of "Random" ping windows based on daily frequency
- **Web-Push Engine:**
  - Payload delivery to the Service Worker
  - Local notification rendering with deep-links to the rating screen

---

## Design & Privacy

- **Minimalist UI:** Focused on whitespace, high contrast for readability, and large touch targets
- **Dark Mode Support:** Automatic based on system preferences
- **Responsive Layout:** Optimized primarily for mobile viewport widths
- **Privacy by Design:** No public profiles, no friend lists, no external sharing
- **Data Scoping:** Strict database-level isolation ensuring users only see data for their specific groupID
- **GDPR Compliance:** Full user data export and deletion capabilities
- **Open Source:** Entire codebase available on GitHub for transparency and community contributions
- 