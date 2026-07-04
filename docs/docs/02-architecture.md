---
title: Architecture
label: Architecture
order: 140
description: Complete system architecture of VPNLens.
---

# VPNLens: Complete System Architecture

## Objective

This document details the internal architecture of VPNLens. It is written for Platform Engineers, DevOps practitioners, and contributors who wish to understand the structural design of the platform.

The goal of this document is to provide a complete understanding of the system's components, their interactions, and the engineering rationale behind their selection. It answers fundamental questions regarding the separation of concerns, data flow orchestration, and the choice of underlying technologies. A reader should be able to comprehend the entire system lifecycle—from a user requesting a benchmark to the delivery of the final report—without needing to inspect the source code.

---

## System Overview

VPNLens operates on a strict **two-server architecture** deployed on Oracle Cloud Infrastructure (OCI). This physical separation is the most critical design decision in the platform, ensuring that the act of measuring performance does not interfere with the performance being measured.

### Server 1: The Control Plane
Server 1 acts as the orchestration and management hub. It hosts the user-facing applications, the backend API, the database, and the VPN servers (the targets of the benchmark). 

**Responsibilities:**
*   Serving the React frontend application.
*   Running the Node.js backend API and benchmark job queue.
*   Persisting benchmark state and results in an SQLite database.
*   Routing internal traffic and terminating TLS via a Caddy reverse proxy.
*   Hosting the Headscale control server and WireGuard server (`wg-easy`).
*   Orchestrating email delivery via Resend.

**Routing and Domains:**
*   **Frontend:** `https://vpnlens.samay15jan.com`
*   **Backend API:** `https://backend.vpnlens.samay15jan.com`
*   **WireGuard Endpoint:** `https://wg.vpnlens.samay15jan.com`
*   **Headscale Control:** `https://hs.vpnlens.samay15jan.com`

### Server 2: The Benchmark Node
Server 2 is a dedicated, isolated node whose sole purpose is to generate network traffic and record metrics. 

**Responsibilities:**
*   Hosting the VPN clients (WireGuard CLI and Tailscale CLI).
*   Executing state-change orchestration (`switch.sh`).
*   Running payload generation and metric collection (`run-benchmark.sh`).

**Why this separation improves measurement fairness:**
Network throughput and latency (especially in kernel-space implementations like WireGuard) are highly sensitive to CPU interrupts and context switching. If the backend API processes an HTTP request, or the database executes a write operation while an `iperf3` test is running on the same machine, the CPU contention will throttle the network throughput. By completely isolating the Benchmark Node, Server 2 sits idle with near-zero CPU load until a benchmark is initiated, ensuring that 100% of its compute resources are dedicated to the VPN tunnel and payload generation.

---

## High Level Architecture

The following diagram illustrates the topological structure and boundaries of the VPNLens platform.

```mermaid
graph TD
    Client([User Browser])
    
    subgraph Server 1: Control Plane
        Caddy[Caddy Reverse Proxy]
        FE[React Frontend]
        BE[Node.js Backend]
        DB[(SQLite Database)]
        WG_Server[WireGuard Server]
        HS_Server[Headscale Server]
        
        Caddy -->|Serve Static| FE
        Caddy -->|Reverse Proxy /api| BE
        Caddy -->|Proxy| WG_Server
        Caddy -->|Proxy| HS_Server
        BE <-->|Read/Write| DB
    end
    
    subgraph Server 2: Benchmark Node
        Scripts[Automation Scripts<br/>switch.sh / run-benchmark.sh]
        WG_Client[WireGuard Client]
        TS_Client[Tailscale Client]
    end
    
    Resend([Resend Email API])

    Client -->|HTTPS| Caddy
    BE -->|SSH Exec| Scripts
    Scripts -->|Network Payload| WG_Server
    Scripts -->|Network Payload| HS_Server
    Scripts -->|POST HTTPS| BE
    BE -->|Trigger Delivery| Resend
    Resend -->|Email with URL| Client


---

## Components

### Frontend

**Responsibilities:** Provide an intuitive user interface to request benchmarks and visualize complex network metrics using time-series graphs and comparative tables.

* **Why React:** The component-based architecture of React allows for highly reusable UI elements (e.g., metric cards, charts). The ecosystem provides robust charting libraries necessary for visualizing latency jitter and CPU overhead.
* **Why Vite:** Vite provides a significantly faster development loop compared to Webpack/Create React App. Its native ES module serving eliminates bundle compilation during local development, aligning with the project's goal of maintaining a fast, engineering-focused workflow.

### Backend

**Responsibilities:** Act as the central state machine. It validates user requests, queues benchmark jobs to prevent concurrent execution, orchestrates the remote Benchmark Node, processes raw incoming metrics, and triggers asynchronous notifications.

* **Benchmark Orchestration:** The backend uses standard SSH protocols to remotely trigger the bash scripts on Server 2.
* **Email:** Integrates with the Resend API to deliver asynchronous payload URLs.
* **API:** Exposes RESTful endpoints for the frontend to submit jobs and retrieve historical data.

### Database

**Responsibilities:** Persist benchmark data, metadata (timestamps, target protocols), and unique reporting hashes.

* **Why SQLite:** In a benchmarking system that enforces sequential testing, database writes occur linearly (one at a time, every few minutes). There is no high-concurrency write demand that necessitates a heavy RDBMS like PostgreSQL. SQLite runs entirely within the backend container, eliminating the need for a separate database process, reducing memory overhead on the Control Plane, and vastly simplifying backup/restore procedures (copying a single `.sqlite` file).
* **Trade-offs:** SQLite lacks robust user permission models and horizontal scalability for writes. However, given VPNLens's architecture and scope, these trade-offs are negligible compared to the operational simplicity gained.

### Reverse Proxy

**Responsibilities:** Route incoming web traffic based on subdomains and terminate TLS/SSL connections.

* **Why Caddy instead of Nginx:** Caddy was chosen exclusively for its automatic, built-in Let's Encrypt certificate management. Nginx requires auxiliary containers (like `certbot`) and cron jobs to manage certificate renewals. For a platform exposing four distinct subdomains (`vpnlens`, `backend`, `wg`, `hs`), Caddy reduces the configuration file size by over 80% and removes an entire class of potential deployment failures related to expired certificates.

### Benchmark Node (Server 2)

**Responsibilities:** Act as a clean-room environment for protocol evaluation.

* **Isolation & Consistency:** This node runs a minimal Linux footprint. By excluding database and web-server workloads, the baseline resource utilization is flat. This consistency is paramount; an `iperf3` test run on Monday will have the same resource availability as one run on Friday.

### VPN Services

* **WireGuard (`wg-easy`):** Deployed via the `wg-easy` Docker image to provide a streamlined, kernel-space VPN endpoint. It serves as the baseline for maximum possible throughput.
* **Headscale:** An open-source implementation of the Tailscale control plane. It coordinates the mesh network keys and routing tables, allowing the Tailscale client on Server 2 to form a userspace data plane tunnel.

---

## Data Flow

The lifecycle of a single benchmarking job involves distinct phases of communication between the components.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant BE as Backend (Server 1)
    participant DB as SQLite
    participant S2 as Benchmark Node (Server 2)
    participant Mail as Resend API

    User->>BE: POST /api/benchmark { email }
    BE->>DB: Create Job (Status: Pending)
    BE->>User: 202 Accepted (Job Queued)
    
    BE->>S2: SSH: Execute switch.sh (Protocol 1)
    S2-->>BE: Interface Ready
    
    BE->>S2: SSH: Execute run-benchmark.sh
    S2->>S2: Generate iperf3/ping traffic
    S2->>BE: POST /api/results { metrics }
    BE->>DB: Store Protocol 1 Results
    
    BE->>S2: SSH: Execute switch.sh (Protocol 2)
    S2-->>BE: Interface Ready
    
    BE->>S2: SSH: Execute run-benchmark.sh
    S2->>S2: Generate iperf3/ping traffic
    S2->>BE: POST /api/results { metrics }
    BE->>DB: Store Protocol 2 Results, Update Job (Complete)
    
    BE->>Mail: API Call: Send Results to Email
    Mail->>User: Email Delivered with Unique URL
    User->>BE: GET /api/results/:hash
    BE-->>User: Serve Final Dashboard JSON

```

---

## Benchmark Lifecycle

The actual execution on Server 2 follows a strict sequence to capture various performance dimensions without overlap.

1. **Start Benchmark:** Backend invokes Server 2.
2. **Switch VPN:** `switch.sh` tears down any existing active interfaces (e.g., `wg-quick down wg0`). It clears IP tables and memory buffers, then brings up the target interface (e.g., `tailscale up`).
3. **Verify:** The script loops a basic ping to the Control Plane's internal tunnel IP to confirm cryptographic handshake and route establishment.
4. **Ping (Latency/Loss):** 100 ICMP echo requests are sent. Minimum, maximum, average latency, and packet loss percentages are recorded.
5. **iperf3 Upload:** A TCP throughput test pushing data from Server 2 to Server 1.
6. **iperf3 Download:** A TCP throughput test pulling data from Server 1 to Server 2 (using the `-R` reverse flag).
7. **CPU:** During the `iperf3` tests, `top -b -n 1` is parsed to capture the compute overhead of the protocol's encryption process.
8. **Memory:** `free -m` is parsed during payload transfer to capture RAM footprint.
9. **Recovery:** The interface is forced down and brought back up, timing the exact milliseconds required to pass traffic again.
10. **POST:** The Bash script formats these variables into a JSON string and uses `curl` to POST back to the Backend API.
11. **Repeat:** The process is repeated for the second VPN architecture.
12. **Generate Report:** The backend consolidates both JSON payloads into a single database row linked to a unique URL hash.

---

## Communication Flow

Understanding the protocols used for component interaction explains the system's security and reliability bounds.

* **Frontend ↔ Backend:** Standard **HTTPS/REST**. The React app communicates with the Express backend via JSON over TLS (terminated by Caddy).
* **Backend ↔ SQLite:** Direct **File I/O**. Since SQLite is embedded, the Node.js process reads and writes directly to the `.sqlite` file on the persistent Docker volume.
* **Backend ↔ Server 2 (Triggering):** **SSH**. The Node.js backend uses an SSH client library to authenticate via RSA keys with Server 2. This was chosen because it requires zero agent installation on Server 2; OpenSSH is natively available on all Linux distributions.
* **Server 2 ↔ Backend (Result Delivery):** **HTTPS/REST**. Once the bash script finishes, it sends a `curl` POST request back to the backend. This asynchronous callback model prevents the SSH connection from needing to remain open for the entire 5-10 minute duration of the tests, mitigating SSH timeout issues.
* **Backend ↔ Resend:** **HTTPS/REST**. The backend uses the Resend SDK to trigger transactional emails.

---

## Repository Structure

The codebase is organized into distinct domain boundaries.

* **`backend/`**: Contains the Node.js Express server, job queue logic, SQLite schema definitions, and Resend integrations. This is separated so it can be containerized independently of the UI.
* **`configs/`**: Holds the infrastructure state. Includes the `docker-compose.yml` and the `Caddyfile`. Centralizing configs ensures that the deployment environment is strictly defined in source control.
* **`docs/`**: Holds the Markdown documentation (like this file) and PDF artifacts of the academic origins (WPRs, synopsis).
* **`src/`**: Contains the React frontend logic, components, and charting configurations.
* **`public/`**: Static assets for the frontend (favicons, manifest files).
* **`scripts/`**: Contains `switch.sh` and `run-benchmark.sh`. These are stored in the repo for version control but are physically executed on Server 2.

---

## Design Decisions

Every architectural constraint in VPNLens serves a specific purpose regarding data validity.

**Two Servers:** As detailed in the System Overview, this guarantees CPU and network isolation, preventing web traffic from corrupting benchmarking data.

**SQLite:** Reduces infrastructure complexity, lowers RAM usage on the control plane, and perfectly matches the linear, sequential write pattern of a benchmarking queue.

**Docker & Docker Compose:** Guarantees reproducibility. A complex benchmarking system cannot rely on "it works on my machine" manual host configuration. Containers ensure that Node.js, Caddy, and the VPN servers execute identically across any cloud provider.

**Caddy:** Selected over Nginx strictly to offload the cognitive overhead of managing Let's Encrypt certificates for four subdomains.

**React & Node.js:** Node.js handles asynchronous, event-driven tasks (like job queuing and SSH callbacks) exceptionally well. React provides the most robust ecosystem for rendering complex comparative charts based on the JSON payloads.

**Email Reports & Unique URLs:** Network tests take time. Forcing a user to wait on a loading spinner for 10 minutes leads to dropped HTTP connections and poor user experience. Asynchronous processing via an email callback is the industry standard for long-running compute jobs. Unique URLs ensure results are immutable and easily shareable among engineering teams.

**SSH Orchestration:** Using SSH to trigger scripts avoids the need to build, secure, and maintain a custom agent API on the Benchmark Node.

**Sequential Benchmarks:** Parallelization is explicitly forbidden in this architecture. Running two `iperf3` tests simultaneously splits the physical NIC bandwidth and CPU time scheduling, rendering both metrics entirely invalid. The backend enforces a strict FIFO (First-In-First-Out) queue.

---

## Scalability

VPNLens was intentionally designed for accuracy, not high-throughput scaling.

**Current Limitations:** Because benchmarks are strictly sequential, the platform can only process a handful of jobs per hour. The database is SQLite, which cannot scale horizontally across multiple instances.

**Why the Architecture Remains Simple:** Scaling this platform (e.g., adding Kafka, PostgreSQL, or Kubernetes) would violate the core design philosophy of "simple, reproducible deployments." The goal is accurate evaluation, not serving millions of concurrent users.

**Future Evolution:**

* **Terraform & Ansible:** Replacing manual provisioning with Infrastructure as Code to fully automate the creation of Server 1 and Server 2.
* **Additional Benchmark Nodes:** Modifying the backend queue to dispatch jobs to a pool of Server 2 nodes, allowing parallel benchmarks *across different nodes*, but strictly maintaining the rule of one benchmark per node.
* **Multiple VPNs & Cloud Providers:** Expanding the orchestration scripts to support OpenVPN, IPsec, and deploying nodes in AWS/GCP to test inter-cloud latency.

---

## Security

* **HTTPS:** All web traffic is strictly encrypted via Caddy and Let's Encrypt.
* **SSH Keys:** The Backend authenticates to the Benchmark Node using an ED25519/RSA SSH keypair, completely disabling password authentication.
* **Email Validation:** Results are tied to the email address provided, preventing spam and ensuring the requester receives their specific data.
* **Unique Report Tokens:** Benchmark URLs utilize long, cryptographically secure hashes (e.g., UUIDv4). They cannot be easily enumerated or scraped by third parties.
* **Future Improvements:** Implementing strict API rate limiting, adding Cloudflare proxy layers to absorb DDoS attacks against the Caddy server, and hardening the Docker networking namespaces.

---

## Lessons Learned

The architecture of VPNLens is a product of iterative discovery.

Initially, the project was conceived as a static evaluation—a one-time manual comparison between WireGuard and Headscale. We quickly learned that manual network benchmarking is fundamentally flawed. Running `iperf3` over SSH skewed the CPU results due to the overhead of SSH encrypting the terminal output. Failing to cleanly tear down the Linux network stack between protocol switches resulted in routing table collisions.

These lessons forced the evolution from a simple script into a robust platform. The Two-Server model was adopted specifically to cure the "observer effect." The queue system was implemented because overlapping tests corrupted the data. The architecture evolved organically to protect the integrity of the metrics.

---

## Conclusion

The architecture of VPNLens reflects a rigorous approach to systems evaluation. By isolating load generation, enforcing sequential execution, and automating the testing lifecycle, the platform guarantees that its output reflects the genuine performance characteristics of the underlying VPN protocols, rather than the noise of the testing environment.

This foundation enables accurate, data-driven decisions. The logical next step in understanding VPNLens is examining how this theoretical architecture maps to physical cloud resources, which is detailed in the Infrastructure setup documentation.
