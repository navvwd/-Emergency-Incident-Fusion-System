# EIFS Android App — Setup

## Open in Android Studio
1. Open Android Studio
2. File → Open → select the `android/` folder
3. Wait for Gradle sync (1-2 minutes first time)
4. If sync fails: File → Invalidate Caches → Restart

## Run on your phone
1. Connect phone via USB
2. Phone: Settings → About Phone → tap Build Number 7 times
3. Phone: Settings → Developer Options → USB Debugging ON
4. Android Studio: Run → Run 'app' (green play button)
5. Select your phone from the device list

## For fusion testing with a friend
Your phone runs the Android app.
Your friend opens this URL in their phone browser (same WiFi):
  http://YOUR_PC_IP:5173
Find your PC IP: open Command Prompt → type ipconfig → look for IPv4 Address

Both submit a report about the same location.
Dashboard shows 1 merged incident = fusion is working.

## Switch between local and production URL
Open android/app/src/main/java/com/eifs/app/MainActivity.java
Change the APP_URL constant:
  Local dev:   http://YOUR_PC_IP:5173
  Emulator:    http://10.0.2.2:5173
  Production:  https://your-app.vercel.app
