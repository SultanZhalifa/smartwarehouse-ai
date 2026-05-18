# Team Roles and Responsibilities

Project: Smart Warehouse Bio Hazard and Pest Detection
Group: 5
Course: Agile Software Development


## Product Owner

**Risly Maria Theresia Worung** — 001202400069

Risly holds the product vision. She is the one who decided from the start that this project needs to solve a real operational problem at PT. Kawan Lama, not just show off technology. She translated the hackathon brief into concrete user needs, determined which features should actually matter for the managers and warehouse supervisors who will use the system, and kept the team from building things that sound impressive but add no real value.

Her responsibilities throughout the project included validating each sprint output, writing the executive summary with language that is understandable to non-technical stakeholders, and confirming the acceptance criteria for every product backlog item before the team moved on. When the team debated whether to add a feature or not, Risly was the one who made the final call on priority.

She also researched the real-world handling protocols for snake incidents in Indonesian warehouse environments, which became the basis for the content on the Risk Analysis page.


## Scrum Master

**Sultan Zhalifunnas Musyaffa** — 001202400200

Sultan runs the sprint process. He plans the sprint goals at the beginning of each week, tracks what each person is working on, and unblocks the team when something gets stuck. He is not the manager in a hierarchical sense, but more like the person who makes sure the daily rhythm stays intact so the team does not lose momentum.

When technical problems came up, like the MJPEG streaming lag or the video path bug where the system could not find demo videos after a folder rename, Sultan either fixed it himself or figured out who should handle it and how. He also made sure commits were made daily, which matters for showing active project development to the dosen and to the hackathon judges.

On the development side, Sultan contributes directly to the backend and handles deployment, configuration, authentication hardening, and integration between components.


## Developer (Backend and AI)

**Fathir Barhouti Awlya** — 001202400054

Fathir owns the AI and backend pipeline end to end. He collected the raw image datasets, did the manual annotation work in YOLO format, ran the training experiments on the YOLO11 Nano model, and evaluated performance until the accuracy was usable for a live demo.

On the backend, he built the FastAPI application structure, the OpenCV video processing loop, the per-zone worker thread architecture that allows multiple camera zones to run simultaneously, and the detection logging system that writes every event to the SQLite database. He also managed the WebSocket broadcasting so alerts can be pushed to the frontend in real time.


## Developer (Frontend and UI)

**Misha Andalusia** — 001202400040

Misha built the frontend. She is responsible for the entire monitoring dashboard, from the layout and page structure down to the individual UI components. The Live Monitor, Detection Logs, Risk Analysis, Settings, and User Management pages are all her work.

She also handled the integration layer between frontend and backend, connecting the React components to the FastAPI REST endpoints so the detection logs, camera statuses, analytics charts, and alert panels all display live data rather than static placeholders. The visual design choices, color scheme, dark mode implementation, and responsive layout are also her responsibility.
