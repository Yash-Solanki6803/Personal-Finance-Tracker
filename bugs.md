1. If I add a salary of the same date as a previous salary. It should be overridden, but instead it creates a new entry.
   - Expected Behavior: The new salary entry should replace the existing one for that date.

2. The login works with any password. It is bypassed. Fix that.
3. On successful login, the user is not redirected to the dashboard.
   - Expected Behavior: After a successful login, the user should be taken to the dashboard page. Instead he is redirected back to login page after a split second.
4. The project doesn't support multi user database. When two users are logged in, they see each other's data.
   - Expected Behavior: Each user should only see their own data when logged in.
5. Need a way to clear all data for a specific user without deleting the seeded data.
   - Expected Behavior: Implement a feature that allows clearing user-specific data while retaining the seeded data for the application.
6. Should show the name of the current logged in user on the dashboard.
   - Expected Behavior: The dashboard should display the name of the user who is currently logged in.
7. The progress goes to 100% for a goal when I create a SIP from it. Instead it should properly calculate the progress based on the SIP amount.
   - Expected Behavior: The progress percentage for a goal should be calculated based on the amount allocated through SIPs, not automatically set to 100%.
8. I need a xlsx export of my data.
   - Expected Behavior: Implement a feature that allows users to export their data in XLSX format for easier analysis and record-keeping.
