# STATELINK – TO DO's


* remove the popup after creating group in onboarding 
* add email confirmation
* add password reset
* download should contain the vibe checkin codes
* be able to change the ratings from the last 24 hours.
* confirm that the vibe coding is showing the last 7 days correctly.
* create testcases

---

## Group Dynamics & The Vibe Check Loop
 

- **Admin Controls:**
  - Interval Mode: Toggle between "Fixed" (static times) and "Random" (stochastic pings)
  - Frequency: Set how many pings occur within a x hour or x week cycle
  - Quiet Hours: Define specific "Do Not Disturb" windows (e.g., 23:00 to 07:00)
- **Cron Jobs (Vercel Cron):**
  - Minute-by-minute evaluation of group ping logic
  - Calculation of "Random" ping windows based on daily frequency
- **Web-Push Engine:**
  - Payload delivery to the Service Worker
  - Local notification rendering with deep-links to the rating screen

