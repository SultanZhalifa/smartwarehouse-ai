# Product Backlog

Project: Smart Warehouse Bio Hazard and Pest Detection
Group: 5
Course: Agile Software Development

This backlog covers everything the team committed to building for the SmartGuard AI system. Items are ordered by priority. High priority items are foundational, meaning the system simply cannot work without them. Medium priority items add important value to the demo and the real use case. Low priority items are enhancements that improve the experience but are not critical for the first working version.

Priority levels: High / Medium / Low
Status options: Done / In Progress / Planned


---


## PB-01: Object Detection Model Training

Priority: High
Type: AI / Machine Learning
Status: Done
Assigned to: Fathir

Story: As a warehouse manager, I want the system to automatically recognize dangerous animals in the camera feed so that I do not have to manually watch every camera at all times.

Goal: Train a lightweight YOLO11 model that can accurately identify snakes, cats, geckos, and lizards in a warehouse environment, even under dim lighting conditions.

Detail: Fathir collected over 2,000 images from open datasets and manually annotated them in YOLO format. He applied data augmentation, including brightness reduction, horizontal flipping, and random cropping, to simulate real warehouse conditions where lighting is inconsistent. Training ran for 50 epochs using transfer learning from a COCO-pretrained YOLO11 Nano base. Multiple versions were trained and compared until the accuracy was acceptable for a live demo.

Acceptance Criteria:
- The model detects snakes, cats, geckos, and lizards with confidence above 60 percent on test video
- Detection runs in under 200ms per frame on a CPU without GPU acceleration
- Model file loads correctly when the backend starts and the model name is exposed through the API

Notes: The hardest class to get right was gecko in low light. Fathir ended up running a second fine-tuning pass with additional night-condition images before the confidence was consistent enough.


---


## PB-02: Multi-Zone Camera Architecture

Priority: High
Type: Backend / Integration
Status: Done
Assigned to: Fathir and Sultan

Story: As a warehouse supervisor, I want to monitor multiple warehouse zones simultaneously through different cameras so that I can see the whole facility at once, not just one area.

Goal: Build a backend system where each camera zone runs its own independent inference worker, so four zones can detect animals in parallel without one zone blocking another.

Detail: The original architecture ran a single video loop in the main thread, which meant if Zone A had a slow frame, everything else would freeze. Sultan redesigned this into a per-zone ZoneWorker class where each zone gets its own Python thread with its own OpenCV capture instance and YOLO inference call. Each worker writes its annotated frames to a shared buffer that the MJPEG stream endpoint reads from. Adding more zones later only requires adding a new row to the database.

Acceptance Criteria:
- At least four zones can run simultaneously without freezing each other
- Each zone has an independent Start and Stop control in the dashboard
- If a zone's video source is not available, only that zone shows an error, the others keep running
- Zone configuration persists in the database and is not lost when the server restarts


---


## PB-03: Real-Time Video Streaming with Bounding Boxes

Priority: High
Type: Integration
Status: Done
Assigned to: Fathir and Sultan

Story: As a security officer, I want to see the camera footage with bounding boxes drawn around detected animals so that I can immediately understand what the AI is seeing and where exactly the animal is in the frame.

Goal: Stream processed video frames from the Python backend to the React frontend with minimal latency, with bounding boxes drawn in a clear HUD style that does not obscure the frame.

Detail: The team started with REST polling where the frontend kept requesting new frames, but this caused noticeable choppiness. Sultan researched and implemented MJPEG streaming instead, where the backend sends frames as a continuous multipart HTTP response. The bounding box renderer in detector.py draws corner brackets, a confidence bar, and a label pill with the class name and risk tag. The rendering was intentionally designed to look like a professional surveillance system, not a basic cv2 rectangle.

Acceptance Criteria:
- Video feed loads when a zone is started and plays without major lag
- Bounding boxes appear with correct class labels and risk color coding (red for snake, amber for cat, green for gecko)
- The confidence percentage is visible on each bounding box
- Frame rate is at least 15fps under normal hardware conditions

Bug fixed during this sprint: Video source paths stored in the database were pointing to the old project folder name after a directory rename. Sultan added an auto-migration check in init_camera_zones() that detects broken file paths on startup and updates them to the current correct location.


---


## PB-04: Detection Event Logging to Database

Priority: High
Type: Backend
Status: Done
Assigned to: Fathir

Story: As a warehouse manager, I want every animal detection to be automatically saved with a timestamp and location so that I can review the full history of incidents and identify patterns over time.

Goal: Every confirmed detection event is written to the SQLite database immediately, including the animal type, camera zone, date, time, confidence score, and risk level.

Detail: The detection happens inside the ZoneWorker loop. When a detection clears the confidence threshold and the per-class cooldown timer, the worker appends it to a pending log list. After all bounding boxes are drawn on that frame, the pending logs are flushed and written to the database. This ordering ensures the saved snapshot image already has the bounding boxes on it. The cooldown is configurable and defaults to ten seconds per class per zone to prevent the same animal from flooding the log table.

Acceptance Criteria:
- Detection Logs page shows all saved events with correct type, location, time, and risk level
- Cooldown prevents duplicate entries for the same detection event
- Logs persist after server restart
- Each log entry has a snapshot image that can be viewed in the dashboard


---


## PB-05: Role-Based Authentication and Access Control

Priority: High
Type: Backend / Security
Status: Done
Assigned to: Sultan

Story: As a system administrator, I want to make sure that only authorized personnel can access the dashboard and that different roles have different levels of access so that the system is not accessible to anyone who walks past a workstation.

Goal: Implement a login system with role-based access control that restricts certain pages and actions based on whether the user is an admin, manager, or operator.

Detail: Sultan built the authentication system around bcrypt password hashing with a SHA-256 legacy fallback for older accounts. Session tokens use 256-bit random hex strings stored in memory with a 24-hour expiry. The invite-only registration flow means nobody can create their own account. Admins generate an invite link through the User Management page and share it with new users. Rate limiting is applied to all auth endpoints to slow down brute force attempts. The admin role has access to User Management and all other pages, the manager role can access analytics and settings, and the operator role only sees the Live Monitor and Detection Logs.

Acceptance Criteria:
- Login fails with incorrect credentials and shows a generic error message
- Session expires after 24 hours and user is redirected to login
- Operator users cannot access the User Management or AI Performance pages
- Rate limiting blocks repeated failed login attempts from the same IP


---


## PB-06: Real-Time WebSocket Alert System

Priority: High
Type: Feature / Integration
Status: Done
Assigned to: Fathir and Sultan

Story: As a warehouse worker, I want to receive an instant notification when a dangerous animal is detected so that I can respond immediately without having to keep watching the screen.

Goal: Push detection alerts to all connected dashboard clients in real time through WebSocket so the Recent Alerts panel updates without requiring a page refresh.

Detail: The backend uses FastAPI's WebSocket support and a custom WebSocketManager class that maintains a list of active connections. When a detection event is logged, the manager broadcasts a JSON message to all connected clients. The frontend WarehouseContext listens to this WebSocket and updates the shared logs state, which causes the AlertsPanel to re-render automatically. A heartbeat ping is sent every 25 seconds to prevent idle proxy servers from closing the connection.

Acceptance Criteria:
- New detection appears in the Recent Alerts panel within 2 seconds of being detected
- Alert badge count updates without a page refresh
- WebSocket reconnects automatically if the connection drops
- Toast notification appears for new danger-level detections, with a cooldown to prevent spam


---


## PB-07: Analytics Dashboard and Risk Reports

Priority: Medium
Type: Feature / Frontend
Status: Done
Assigned to: Misha and Risly

Story: As a warehouse manager, I want to see a weekly summary of all detection events with trends and charts so that I can report to PT. Kawan Lama leadership on the pest situation without manually counting through raw log data.

Goal: Build an analytics page that shows detection trends over time, zone activity heatmaps, type distribution charts, and a downloadable risk report.

Detail: Misha built the Risk Analysis page using Recharts for the visualization components. The charts pull data from the analytics API endpoint which runs SQL aggregation queries over the logs table. Risly reviewed the chart data and wrote the interpretation text so the page makes sense even to someone who has never used the system before. Sultan added a PDF export button that generates a formatted incident report based on the current date range selection.

Acceptance Criteria:
- Weekly trend line chart shows detection count per day for the selected period
- Zone activity breakdown shows which zones had the most detections
- Type distribution shows the ratio of snake versus cat versus gecko detections
- The page loads within 3 seconds even with a large number of log entries


---


## PB-08: Persistent Invite Token and Password Reset System

Priority: Medium
Type: Backend / Security
Status: Done
Assigned to: Sultan

Story: As an admin, I want invite tokens and password reset codes to survive server restarts so that users I invited do not get a broken link just because we restarted the backend.

Goal: Move invite tokens and password reset codes from in-memory dictionaries to persistent SQLite tables so they are durable across restarts.

Detail: Before this fix, invite tokens lived in a Python dict that was wiped every time uvicorn restarted. Sultan added two new tables to the database schema: invite_tokens and password_reset_codes. The auth routes were rewritten to read and write these tables instead of in-memory storage. He also added a duplicate invite guard that checks whether a pending invite already exists for the same username or email before creating a new one. A new admin-only endpoint at /api/admin/reset-codes lets admins see active reset OTPs from the dashboard without checking server logs.

Acceptance Criteria:
- Invite links still work after the backend is restarted
- Password reset codes are visible in the admin Reset OTPs panel
- Duplicate invites for the same email are rejected with a clear error message
- Expired tokens are cleaned up automatically


---


## PB-09: AI Performance Monitoring Page

Priority: Medium
Type: Feature / Frontend
Status: Done
Assigned to: Misha and Fathir

Story: As a technical lead, I want to see the live performance metrics of the AI model so that I can tell whether inference is running fast enough and whether the model accuracy meets the requirements.

Goal: Build a page that displays real model performance data including inference time, mAP scores, precision, recall, and training history, all pulled from actual training artifacts rather than hardcoded values.

Detail: Fathir exposed a model-info endpoint that reads the YOLO training results.csv file and parses the training metrics from it. Misha built the frontend page that displays these metrics in a clean format with trend lines for the training curve. The inference time shown on the stat card updates in real time based on the average processing time across all active zones.

Acceptance Criteria:
- mAP, precision, and recall values shown on the page match the actual training output
- Inference time displayed in the stat card updates when zones are active
- Training curve chart shows the actual epoch-by-epoch history from results.csv
- Page shows a loading state instead of fake values when data is unavailable


---


## PB-10: Settings, Preferences, and User Management

Priority: Low
Type: Feature / Frontend / Backend
Status: Done
Assigned to: Misha and Sultan

Story: As an administrator, I want to manage user accounts from within the dashboard and let each user customize basic preferences like language and dark mode so that the system feels like a complete product rather than a prototype.

Goal: Build a Settings page and User Management page that allow admins to invite users, reset passwords, edit roles, and delete accounts, while all users can toggle dark mode and switch the interface language.

Detail: Misha built the Settings and User Management pages with modal dialogs for each action. Sultan built the backend endpoints for user CRUD operations, role changes, and password reset with temporary passwords. The dark mode toggle applies a CSS class to the document body and persists the preference in localStorage. Language switching between English and Bahasa Indonesia is handled by a custom hook that loads the correct translation object based on the current locale setting.

Acceptance Criteria:
- Admin can invite a new user by generating a link that works for 72 hours
- Admin can reset a user's password and the user is forced to change it on next login
- Dark mode toggle works immediately and persists after page reload
- Language toggle switches all interface text without a full page reload
