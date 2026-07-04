---
title: Introduction
label: Introduction
order: 150
description: Learn about VPNLens, its goals, scope, and design philosophy.
---

# VPNLens: Introduction

## Introduction

VPNLens represents a systematic, engineering-driven approach to evaluating network performance within cloud environments. At its core, VPNLens is an end-to-end automated benchmarking platform designed specifically for deploying, testing, analyzing, and visualizing the performance characteristics of open-source Virtual Private Network (VPN) architectures. 

This document serves as the foundational design rationale for the platform. It does not focus on how to deploy the software, nor does it serve as a manual for interacting with the application programming interface (API). Instead, this document addresses the fundamental questions of *why* VPNLens exists, the specific engineering problems it solves, and the architectural philosophies that guided its transition from a localized university project into a comprehensive infrastructure evaluation platform.

VPNLens is built for Cloud Engineers, Platform Engineers, DevOps practitioners, Linux system administrators, and infrastructure students who require deterministic, reproducible data when selecting network overlay technologies. By eliminating the manual overhead associated with network testing, VPNLens provides a clear, unadulterated view into how different VPN protocols behave under load, bridging the gap between theoretical protocol specifications and real-world operational performance.

---

## Background: The Complexities of Network Benchmarking

In modern infrastructure engineering, evaluating the performance of a network component—particularly a cryptographic tunnel—is a complex and highly variable endeavor. The selection of a VPN architecture dictates the baseline latency, maximum throughput, compute overhead, and reliability of inter-node communication across a fleet of servers or client devices.

Benchmarking network performance is fundamentally different from benchmarking CPU calculations or disk I/O. A network is an inherently volatile environment subject to transient congestion, routing anomalies, kernel-level scheduling variations, and physical hardware constraints. To achieve mathematically significant results, a benchmarking test must isolate the variable under evaluation (the VPN protocol) from external noise. 

When evaluating VPNs, engineers are primarily concerned with the following metrics:
*   **Throughput:** The maximum rate of data transfer across the tunnel, typically measured in Megabits per second (Mbps). Throughput is often constrained by the cryptographic efficiency of the protocol and the server's CPU capacity.
*   **Latency:** The time required for a data packet to travel from the source to the destination and back. In overlay networks, latency includes the time taken to traverse the physical network plus the computational time required for encryption, encapsulation, decapsulation, and decryption.
*   **Packet Loss:** The percentage of transmitted packets that fail to reach their destination, which severely degrades Transmission Control Protocol (TCP) performance due to retransmission delays.
*   **Compute Overhead:** The processor and memory resources consumed by the VPN agent to maintain state and encrypt traffic.
*   **Recovery and Establishment Time:** The duration required for a network interface to initialize, perform cryptographic handshakes, and begin routing packets successfully.

Historically, comparing these metrics across different VPN architectures has been a highly manual, error-prone process. Engineers typically provision servers, manually install dependencies, configure cryptographic keys, manually run `iperf3` and `ping` commands, and copy the terminal output into a spreadsheet. This methodology lacks the rigor, isolation, and reproducibility required for modern infrastructure planning. 

Existing benchmarks found in technical blog posts or marketing materials are often irreproducible. They rarely disclose the exact kernel versions, CPU architectures, network interface card (NIC) offloading settings, or background processes active during the test. Furthermore, manual benchmarks often fail to account for the performance degradation caused by the benchmarking process itself—such as the CPU overhead of an active SSH session used by the human operator observing the test.

---

## Problem Statement: The Fallacy of Manual Testing

The genesis of VPNLens is rooted in the inherent flaws of manual network benchmarking. When testing infrastructure manually, the operator inadvertently introduces variables that compromise the integrity of the data. 

**The Ephemeral Nature of Manual Deployments:**
Deploying a VPN involves modifying the host operating system's network stack, manipulating IP routing tables, and adjusting firewall rules (such as `iptables` or `nftables`). When an engineer manually switches between testing WireGuard and Headscale on the same server, residual routing configurations, lingering state tables, or uncleared memory buffers can skew subsequent tests. Without a deterministic teardown and rebuild process, the environment drifts from its baseline state.

**Observer Effect in Load Generation:**
To execute a benchmark, an engineer typically connects to the target machine via Secure Shell (SSH). When the engineer initiates a high-bandwidth `iperf3` test, the SSH session itself consumes network bandwidth and CPU cycles to encrypt and transmit the real-time terminal output back to the user. This "observer effect" directly competes for resources with the VPN process being measured, particularly on constrained cloud instances.

**Absence of Temporal Standardization:**
Network throughput fluctuates based on time of day, cloud provider noisy-neighbor issues, and transient Internet backbone congestion. Running a manual test for WireGuard at 10:00 AM and a manual test for Headscale at 2:00 PM invalidates a direct comparison. Benchmarks must be run in immediate, automated succession to ensure they are subject to identical macroeconomic network conditions.

**Lack of Centralized, Persistent Reporting:**
Manual benchmarking results in fragmented data—loose CSV files, unformatted JSON blobs, or screenshots of terminal windows. This lacks a centralized repository for historical analysis, making it impossible to share interactive, validated results with a broader engineering team or use the data to justify architectural decisions over time.

In summary, manual benchmarking lacks repeatability, is prone to human error, fails to properly isolate the test environment, and provides no systemic method for aggregating and visualizing the resulting data.

---

## Architectural Divergence: Why WireGuard and Headscale?

To demonstrate the platform's capability, VPNLens was initially engineered to compare two fundamentally different network architectures: WireGuard and Headscale. This selection was highly intentional. It is not merely a comparison of two similar applications; it is an evaluation of two distinct operational models—a raw, kernel-space tunnel versus a stateful, userspace mesh overlay.

### WireGuard: Stateless, Kernel-Integrated Routing
WireGuard was selected to represent the modern standard for point-to-point cryptographic tunnels. It operates heavily in the Linux kernel space (via the `wireguard-linux` module). This integration allows packets to be encrypted and routed with minimal context switching between userspace and kernel space, theoretically resulting in exceptional throughput and minimal latency.

WireGuard utilizes a concept known as Cryptokey Routing. It is fundamentally stateless; there is no traditional "connection" established between peers. If a packet arrives with a valid cryptographic signature that matches a configured peer's public key, it is decrypted and routed. If it fails, it is silently dropped. This hub-and-spoke model requires manual IP address management, manual key distribution, and explicit endpoint configuration, placing the operational burden on the deployment mechanism rather than the protocol itself.

### Headscale: Stateful, Peer-to-Peer Mesh Control Plane
Headscale was selected as the counterpoint. Headscale is the open-source implementation of the Tailscale control plane. Instead of manually configuring endpoints and keys, Headscale nodes authenticate with a central coordination server. The control plane orchestrates the distribution of public keys and assists nodes in establishing direct, peer-to-peer connections using NAT traversal techniques (STUN/TURN).

The data plane for Headscale (the actual tunnel transmitting the payload) typically utilizes `wireguard-go`, a userspace implementation of the WireGuard protocol. This architectural choice trades raw kernel-level performance for operational flexibility, identity-based access control, and seamless traversal of restrictive firewalls. 

**The Rationale for the Comparison:**
VPNLens does not aim to definitively declare one technology superior to the other. Instead, the platform is designed to quantify the exact operational trade-offs. By benchmarking WireGuard, we measure the theoretical maximum performance of a kernel-bound tunnel. By benchmarking Headscale, we measure the performance tax incurred by utilizing a userspace data plane and a stateful control plane in exchange for mesh networking capabilities. Evaluating these two differing architectures required VPNLens to adapt its testing methodology to accommodate both stateless recovery metrics and stateful coordination handshakes.

---

## Project Evolution: From Scripts to Platform

The current architecture of VPNLens is the result of a deliberate, iterative engineering process. The project originated as a university internship requirement (documented across multiple Weekly Progress Reports and a final defense) designed simply to compare WireGuard and Headscale. However, the scope rapidly expanded as the limitations of the initial approach became apparent.

**Stage 1: The Ephemeral Bash Scripts**
The project began as a collection of localized Bash scripts executed manually on a single cloud server. The scripts would bring up a VPN interface, run `ping`, run `iperf3`, and output the results to the terminal. It quickly became evident that the data was inconsistent. The act of running the scripts over SSH skewed the CPU metrics, and managing the state of the network interfaces (ensuring WireGuard was completely torn down before Tailscale initialized) was fragile and error-prone. 

**Stage 2: Orchestration Backend and Decoupling**
To solve the observer effect, the architecture was split. A Node.js and Express backend was introduced, hosted on a separate Control Plane server. The benchmarking scripts were isolated on a dedicated, untouched Benchmark Node. The backend acted as a state machine, remotely orchestrating the execution of the scripts via webhooks and SSH commands. This isolation guaranteed that the Benchmark Node's compute resources were dedicated entirely to payload encryption and network routing, yielding highly deterministic data.

**Stage 3: Dashboard Visualization and Data Persistence**
With reliable data generation established, the next requirement was interpretation. Analyzing raw JSON logs was inefficient. A React/Vite frontend was developed to visualize the metrics through time-series charts and comparative tables. Concurrently, a SQLite database was implemented within the backend to persist the benchmark results. SQLite was chosen over heavier relational databases to minimize the memory footprint on the Control Plane, keeping the infrastructure lightweight and easy to replicate.

**Stage 4: Asynchronous Execution and Unique Reporting**
Network benchmarking is a time-bound process; a full suite of throughput, latency, and CPU evaluations across multiple protocols takes several minutes. Standard HTTP requests from a frontend dashboard to a backend API are prone to timeouts during long-running tasks. 

To address this, VPNLens evolved into an asynchronous job processor. The user initiates a benchmark via the dashboard, and the backend queues the job, immediately returning an acknowledgment. Once the Benchmark Node completes the rigorous testing sequence, the backend parses the results, stores them in SQLite, and generates a mathematically unique identifier for the run. 

**Stage 5: Email Notification Integration**
Because the user is no longer forced to keep their browser tab open waiting for the HTTP response, an asynchronous notification system was required. The Resend API was integrated into the platform. Upon benchmark completion, the platform dynamically generates an email containing a secure, permanent, and shareable URL linking directly to the specific benchmark results. 

This evolution transformed a localized, manual testing requirement into a fully automated, multi-tiered infrastructure platform capable of providing enterprise-grade observability into network performance.

---

## Project Goals

The overarching objective of VPNLens is to provide absolute clarity regarding network infrastructure performance. To achieve this, the project adheres to several core goals:

1.  **Total Automation:** Every phase of the benchmarking lifecycle—from interface state toggling, tunnel verification, load generation, data capture, and teardown—must be executed programmatically without human intervention.
2.  **Absolute Reproducibility:** A benchmark run executed today must follow the exact same programmatic sequence as a benchmark run executed a year from now. Environmental configuration (via Docker) and test execution must be deterministic.
3.  **Strict Metric Isolation:** The platform must mathematically ensure that the metrics collected (CPU usage, memory consumption, throughput) belong exclusively to the VPN protocol and the OS network stack, untainted by the platform's own web servers or database writes.
4.  **Accessible Visualization:** Raw network data is difficult to interpret. The platform must provide an intuitive interface to chart latency distributions, compare peak vs. average resource utilization, and highlight protocol inefficiencies.
5.  **Shareable Intelligence:** Infrastructure decisions are rarely made in isolation. VPNLens must provide immutable, easily distributable reports via unique URLs, allowing teams to review historical benchmarks and validate deployment choices collaboratively.

---

## Non-Goals

Defining what a platform *should not* do is as critical as defining its features. VPNLens intentionally restricts its scope to maintain architectural purity.

*   **Not a VPN Provider or Client Manager:** VPNLens is not designed to manage day-to-day corporate VPN access, handle user provisioning, or act as an SD-WAN controller. It evaluates technologies; it does not operate them for end-users.
*   **Not a Production Monitoring Tool:** The platform generates artificial synthetic loads (`iperf3`) to measure maximum capacity in an isolated environment. It is not a passive observability tool (like Prometheus or Datadog) designed to monitor live, production user traffic.
*   **Not a Security Auditing Framework:** While VPNLens measures the performance impact of cryptography, it does not analyze the strength of the ciphers, perform penetration testing on the tunnels, or validate the cryptographic implementation of the underlying protocols.

---

## Design Philosophy

The architecture and codebase of VPNLens are governed by a strict engineering philosophy prioritizing reliability over feature bloat.

**Infrastructure as Code (IaC) and Immutability:**
The entire platform relies on containerization. Every component (React, Node.js, Caddy, `wg-easy`, Headscale) is defined in Docker Compose configurations. This ensures that the Control Plane can be destroyed and recreated deterministically across any cloud provider. The environment is treated as immutable; changes are made to the configuration files, never live patched on the server.

**Asynchronous Simplicity:**
Component boundaries are kept simple and asynchronous. The dashboard does not hold state waiting for the benchmark node. The benchmark node does not know about the database. Data flows in a unidirectional pipeline: Request -> Queue -> Execute -> Store -> Notify. This decoupled design prevents cascading failures and simplifies debugging.

**Engineering Truth over Marketing Claims:**
VPN vendors frequently publish best-case scenario metrics. VPNLens is designed to strip away the marketing layer and evaluate the engineering truth. By deploying the protocols in a neutral cloud environment (OCI) and subjecting them to identical, unbiased programmatic load, the platform exposes the real-world trade-offs of kernel vs. userspace networking.

---

## The Imperative of Automation

Why did automation become the central thesis of this platform? Because in systems engineering, a manual process is a broken process.

When attempting to measure "Recovery Time" (the exact millisecond duration it takes for a disrupted tunnel to resume routing packets), human reflexes are insufficient. A human operator cannot simultaneously reset a network interface, monitor a continuous ICMP stream, parse the timestamp of the first successful reply, and calculate the delta with acceptable precision. 

Automation is not merely a convenience feature in VPNLens; it is the fundamental mechanism that validates the data. By relying on highly synchronized Bash scripting (`run-benchmark.sh`) executed on an isolated Linux kernel, the platform eliminates timing drift. 

Furthermore, automation decouples the execution of the test from the presence of the engineer. An engineer can trigger a benchmark simulating massive network load, close their laptop, and review the detailed, graphical results delivered to their inbox hours later. This paradigm shift transitions benchmarking from an active, tedious chore into a passive, highly reliable infrastructure function.

---

## Scope and Future Trajectory

Currently, VPNLens supports the automated deployment, configuration, and performance evaluation of WireGuard and Headscale (Tailscale) architectures, utilizing Oracle Cloud Infrastructure (OCI) instances managed via Docker and shell orchestration. 

While the platform is fully operational, the roadmap envisions further expansion to solidify its position as a comprehensive infrastructure evaluation tool:
*   **Infrastructure Automation:** Future iterations will replace manual server provisioning with Terraform state files and replace manual script deployment with Ansible playbooks, pushing the platform closer to a single-click deployment model.
*   **Protocol Expansion:** The state machine is designed to be extensible. Future development will introduce support for traditional protocols like OpenVPN and IPsec (StrongSwan), as well as modern mesh alternatives like Nebula or ZeroTier.
*   **Ephemeral Environments:** Advancing the architecture to provision the Benchmark Node dynamically via cloud APIs just before a test, and destroying it immediately after, ensuring a pristine operating system state for every single execution and minimizing cloud compute costs.

---

## Target Audience

VPNLens is designed for a specific technical demographic:
*   **Cloud & Platform Engineers:** Professionals tasked with designing internal corporate networks, connecting multi-cloud environments, or evaluating secure overlay networks.
*   **DevOps Practitioners:** Engineers who value CI/CD principles and wish to see how infrastructure testing can be automated and quantified.
*   **Researchers & Students:** Academic individuals analyzing the performance delta between kernel-space and userspace network processing, or studying the implications of peer-to-peer NAT traversal algorithms.
*   **Linux Enthusiasts & Self-Hosters:** Individuals seeking empirical data to decide which VPN architecture is best suited for their personal infrastructure or homelabs.

---

## Conclusion

VPNLens evolved from a simple comparison requirement into a robust orchestration platform because the problem of network benchmarking demanded a systemic solution. Manual testing provides anecdotes; automated benchmarking provides data. 

By aggressively isolating the test environment, orchestrating load generation programmatically, persisting historical data, and decoupling execution through asynchronous notifications, VPNLens delivers an engineering-grade view into VPN performance. It abstracts the tedious complexity of network testing, allowing infrastructure engineers to focus on architectural decisions rather than test execution. 

The following sections of this documentation will detail the specific implementation of this philosophy, beginning with a deep dive into the Two-Server Architecture.
