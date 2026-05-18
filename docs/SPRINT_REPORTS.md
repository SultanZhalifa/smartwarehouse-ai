# Sprint Reports

Project: Smart Warehouse Bio Hazard and Pest Detection
Group: 5
Course: Agile Software Development


---


## Sprint 1 — Week 1: Project Foundation and Dataset Preparation

Duration: Week 1
Sprint Goal: Get the project off the ground. By the end of this week we should have a running local environment, a structured dataset ready for training, and a basic dashboard skeleton that compiles without errors.


### Progress Completed

The React frontend with Vite and the FastAPI backend can both run locally. The initial SQLite database schema is created on first startup. A dataset of around 1,200 images has been collected and annotated for snake, cat, gecko, and lizard classes. The dashboard skeleton renders four navigable pages with placeholder content.


### Task Distribution

Risly read through the PT. Kawan Lama hackathon brief carefully and broke it down into what the system actually needs to do from the perspective of a real warehouse manager. She documented the risk mitigation protocols for each animal type based on logistics industry standards and BPOM guidelines. This research directly shaped the content of the Risk Analysis page later on.

Sultan handled the technical setup. He initialized the React project using Vite, configured the folder structure so frontend and backend are cleanly separated, set up the Python virtual environment, and wrote the base configuration files including vite.config.js, requirements.txt, and the initial FastAPI app.py.

Fathir focused on dataset collection. He sourced images from Roboflow Universe, Kaggle, and manually downloaded frames from warehouse CCTV footage found online. Each image was annotated using the YOLO bounding box format. By the end of the week he had around 1,200 labeled images across four animal classes.

Misha built the initial React structure: the sidebar navigation component, the routing setup using React Router, the base layout that wraps all pages, and empty placeholder components for the video feed panel and alert list. The project compiles and the page navigation works.


### Challenges

Finding images of geckos in warehouse-like environments was genuinely difficult. Most gecko images online show geckos on clean house walls under good lighting, which looks nothing like a dark warehouse floor or storage shelf. Training on these images would make the model fail in real conditions.


### Solutions

Fathir applied targeted data augmentation to the gecko images: reducing brightness significantly, adding slight blur, and adjusting contrast to simulate the dim uneven lighting of a real warehouse. Sultan also helped by finding a few CCTV video clips from Indonesian warehouse environments on YouTube and extracting frames from them for additional context.


### Plan for Week 2

Start model training. Fathir will run the first training experiment and track accuracy. Sultan will research the streaming architecture so the video can be sent from FastAPI to the browser without high latency. Misha will start integrating the backend API into the frontend components.


---


## Sprint 2 — Week 2: Model Training and Video Streaming

Duration: Week 2
Sprint Goal: Have a working end-to-end pipeline where the model detects animals and the result is visible in the browser with bounding boxes on the live feed.


### Progress Completed

The YOLO11 Nano model is trained to usable accuracy and runs inference on incoming video frames. Video streams from the FastAPI backend to the React frontend without significant lag using MJPEG. The login system with session token authentication is functional. Stat cards on the dashboard display live system data.


### Task Distribution

Risly tested the model on various scenarios including low light, partial visibility, and fast movement. She noted which detection cases worked well and which ones produced false positives, and gave structured feedback to Fathir on which conditions needed more training attention.

Sultan researched streaming options and identified MJPEG streaming as the most practical approach given the team's stack. He worked with Fathir to implement the streaming endpoint correctly and then helped debug the latency issues that came up during the first integration test. He also built the session-based authentication middleware.

Fathir trained the model through three iterations, each time adjusting the dataset composition and augmentation parameters based on the validation results. He built the FastAPI endpoints for video streaming, detection data retrieval, and user login. He also wrote the OpenCV frame processing loop that runs YOLO inference on every captured frame.

Misha connected the video player component to the backend stream URL. She built the stat cards component that polls the system status endpoint every five seconds and displays the current values for active zones, total detection count, and AI inference speed. She also wired up the login form to the authentication endpoint.


### Challenges

The first version of the video integration used REST polling, where the frontend sent a GET request every 100 milliseconds to fetch the latest frame. This caused a noticeable delay because each request had its own HTTP connection overhead, and under load the backend could not keep up with the request rate.


### Solutions

Sultan and Misha switched the architecture to MJPEG streaming, where the backend holds a single HTTP connection open and continuously pushes encoded JPEG frames through it. The frontend just points an img tag at the stream URL. This eliminated the per-request overhead entirely and made the video feel fluid. The tradeoff is that the frontend cannot easily control frame rate, but for this use case it was acceptable.


### Plan for Week 3

Build the WebSocket-based alert system so detections appear in real time without polling. Complete the Risk Analysis page. Implement detection cooldown to prevent log flooding. Do a full end-to-end test session and fix any remaining bugs before the demo.


---


## Sprint 3 — Week 3: Alert System, Analytics, and Production Hardening

Duration: Week 3
Sprint Goal: Finish all remaining features, fix the critical bugs found during internal testing, and make the system solid enough to run reliably in front of judges.


### Progress Completed

The WebSocket alert system is live. Every detection triggers an automatic entry in the database and a real-time push to all connected dashboard clients. The Risk Analysis page displays weekly charts and zone activity data from the real database. The alert panel shows categorized risk badges. The authentication system is hardened with rate limiting and bcrypt password hashing. All critical bugs found during testing have been resolved.


### Task Distribution

Risly wrote the content for the Risk Analysis page, including the handling protocol descriptions for each animal type. She tested the entire flow from camera start to alert display and gave detailed written feedback on every issue she found, organized by severity. She also prepared the presentation materials for the hackathon.

Sultan focused on production hardening. He found and fixed the false positive issue where thick cables were being logged as snakes. He also fixed the video source path bug where the system failed to find demo video files after the project folder was renamed, by adding an automatic path migration check on startup. He moved the invite tokens and password reset codes from in-memory storage to persistent SQLite tables so they survive server restarts. He also tightened the security configuration including the Secret Key and rate limiting.

Fathir implemented the complete detection logging pipeline: every confirmed detection writes to the database with full metadata, a snapshot image is saved to disk with bounding boxes already drawn on it, and the event is broadcast through the WebSocket manager. He also added the per-class per-zone cooldown timer to prevent the same detection from flooding the log table.

Misha rebuilt the Recent Alerts panel based on feedback that it was growing infinitely and becoming unusable when many detections occurred. The new version shows a maximum of 20 alerts with a fixed height and internal scroll, a per-alert dismiss button, and a Clear All button. She also fixed the footer link that was pointing to the wrong route and causing a full page reload.


### Challenges

During testing, when both Zone B and Zone D were running simultaneously with the Cat and Snake demo videos looping, the Recent Alerts panel filled up rapidly and became unusable. Users had to scroll through dozens of entries to see recent alerts, and the toast notifications appeared every few seconds without stopping.

A separate bug was discovered where video source paths stored in the database were pointing to the old project directory name from a previous development session. This caused a 500 Internal Server Error whenever a zone was started.


### Solutions

For the alert panel overflow, Misha set a hard cap of 20 displayed alerts and replaced the plain anchor tag footer link with a React Router Link pointing to the correct route. Sultan added a cooldown per risk level for toast notifications so they only appear every 8 seconds for danger events and every 12 seconds for warnings, preventing the flood.

For the broken video paths, Sultan added a validation step inside init_camera_zones() that checks whether the stored source path actually exists on disk at startup. If it does not exist but the default configured path does, the database entry is automatically updated. This means the system self-corrects without requiring manual database edits.


---


## Daily Sprint Log

The team used the group chat as the primary medium for daily standups throughout all three sprints. Every morning, each active member posted a short update covering three points: what they finished since the last update, what they planned to work on that day, and whether anything was blocking them.

Below are representative examples from the actual daily log:

"Yesterday I finished annotating the last batch of snake images, around 200 more. Today I'm starting the first training run on the full dataset. No blockers."

"Yesterday I got the MJPEG stream working on the backend side. Today I'm connecting it to the img tag on the frontend and checking the latency. Blocker: the stream URL returns 401 when accessed without a token, need to figure out how to pass the token through an img tag."

"Yesterday I wrote the handling protocol content for gecko and lizard. Today I'm reviewing Fathir's detection data to make sure the risk levels in the database match what I wrote. No blockers."

"Yesterday I fixed the cable false positive issue by adding more negative samples to the training data. Today I'm running the fine-tuning pass. Blocker: laptop is overheating during training, switched to Google Colab."

"Yesterday I rebuilt the AlertsPanel with a fixed height and dismiss buttons. Today I'm fixing the router link that's pointing to the wrong path. No blockers."

Whenever a blocker lasted more than a day, Sultan would step in during the standup to either pair with the blocked member directly or redistribute the task to someone with more bandwidth. This kept the overall sprint velocity consistent even when individual issues slowed someone down.
