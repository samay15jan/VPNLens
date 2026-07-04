---
title: Lessons Learned
label: Lessons Learned
order: 10
description: Practical engineering insights and reflections gained throughout the development of VPNLens.
---

# VPNLens: Engineering Reflections and Lessons Learned

## Introduction

Software engineering projects are rarely just about writing code; they are vehicles for discovering how complex systems interact. When VPNLens began as a university Internship-I project, the objective was simply to compare two virtual private networks. However, attempting to execute that comparison accurately required a deep dive into the underlying systems that power modern applications.

VPNLens became a masterclass in applied computer science. The journey of building this platform forced a transition from writing localized scripts to designing a robust, distributed architecture. It provided hands-on experience with:

* **Linux Systems Engineering:** Managing kernel routing tables, network namespaces, and bash automation.
* **Cloud Computing:** Navigating Oracle Cloud Infrastructure, compute instances, and virtual cloud networks.
* **Networking:** Understanding MTU fragmentation, TCP/UDP protocols, and NAT traversal.
* **VPN Technologies:** Contrasting stateless kernel modules (WireGuard) with stateful userspace meshes (Headscale).
* **Automation:** Building resilient state machines and asynchronous execution pipelines.
* **Benchmarking Methodology:** Eliminating observer bias and ensuring mathematical reproducibility.
* **DevOps Practices:** Implementing CI/CD via GitHub Actions and containerizing workloads.
* **Infrastructure Design:** Architecting physical separation for metric isolation.
* **Documentation:** Communicating complex architectures to future contributors.
* **Engineering Decision Making:** Learning how to evaluate and accept technical trade-offs.

This document exists to capture the knowledge gained. It is not a technical manual or a troubleshooting guide; it is an engineering reflection. The goal is to document the "why" behind the project's evolution, offering practical insights for students, DevOps engineers, and future contributors navigating similar infrastructure challenges.

---

## Lesson 1 — Engineering Is About Trade-offs

One of the most profound realizations during the development of VPNLens is that there is rarely a universally "perfect" solution in systems engineering. Every technology choice introduces a compromise. Architecture is the practice of choosing the most appropriate solution for the specific constraints of the project, rather than defaulting to the most complex or trendy tool available.

### SQLite vs. PostgreSQL

We chose SQLite over PostgreSQL. PostgreSQL is the industry standard for high-concurrency web applications. However, VPNLens executes benchmarks strictly sequentially. By choosing SQLite, we traded horizontal write scalability for massive gains in operational simplicity. We eliminated a heavy database daemon, reduced the memory footprint on the Control Plane, and simplified backups to copying a single file.

### Caddy vs. Nginx

We chose Caddy over Nginx. Nginx is ubiquitous and highly performant, but managing SSL certificates across four subdomains required external tools like `certbot` and cron jobs. Caddy handles Let's Encrypt provisioning automatically. We traded the vast ecosystem of Nginx for the automated security lifecycle of Caddy, saving hours of deployment debugging.

### Docker Compose vs. Kubernetes

We chose Docker Compose over Kubernetes. Kubernetes is the gold standard for container orchestration, but it introduces immense cognitive overhead and resource consumption. For a two-server benchmarking platform, `k3s` or `minikube` would have consumed RAM that was better utilized by the VPN control planes. Docker Compose provided the exact level of declarative container management we needed without the cluster overhead.

### Email vs. WebSockets

We chose asynchronous Email over real-time WebSockets. Streaming the raw `iperf3` terminal output to the React dashboard sounded impressive. However, holding a TCP connection open over a mobile network for a 10-minute infrastructure stress test is fragile. We traded real-time UI updates for the bulletproof reliability of asynchronous delivery via the Resend API.

### SSH vs. Exposing Benchmark APIs

We chose SSH orchestration over deploying a REST API on the Benchmark Node. Installing a Node.js daemon on the execution node would have increased its attack surface and introduced background CPU noise. We traded the convenience of HTTP webhooks for the pristine, zero-dependency isolation of native SSH.

### Two Servers vs. One Server

We chose a physically isolated Two-Server architecture. Hosting the dashboard, database, and payload generation scripts on one machine was cheaper and easier. However, the CPU interrupts from the web server artificially throttled the VPN throughput metrics. We traded infrastructure cost and orchestration complexity for absolute data validity.

Engineering is not about finding the flawless tool; it is about clearly defining what you are willing to sacrifice to achieve your primary objective.

---

## Lesson 2 — Infrastructure Matters More Than I Expected

Initially, the project was focused strictly on the application layer: writing the React components, designing the SQLite schema, and writing the API routes. However, it quickly became apparent that a benchmarking platform is only as reliable as the infrastructure it runs on.

The focus shifted from software development to infrastructure engineering.

* **Networking and DNS:** We learned that configuring a React app is irrelevant if the DNS A-records and reverse proxy rules are not properly routing the subdomains.
* **Firewalls:** We learned that host-level `ufw` rules on Ubuntu are useless if the cloud provider's Virtual Cloud Network (VCN) Security Lists are dropping UDP traffic at the hypervisor level.
* **Containers:** Docker isolated our dependencies, but it introduced complex bridge networking constraints. We had to learn how containers interact with the host's kernel routing tables.
* **Cloud VMs:** We discovered that cloud compute instances are not perfectly consistent. Network bandwidth fluctuates based on noisy neighbors and cloud provider routing policies.

Infrastructure became the foundation of VPNLens. If the infrastructure was misconfigured, the software was useless. The project evolved to treat infrastructure as a first-class citizen, requiring as much attention, documentation, and version control as the application source code.

---

## Lesson 3 — Automation Saves More Time Than It Costs

When VPNLens began, the benchmarks were executed manually. An engineer would SSH into the server, run `wg-quick up`, type the `iperf3` commands, and paste the output into a spreadsheet.

This approach was unsustainable. It was error-prone, tedious, and scientifically invalid due to human timing inconsistencies. Automation gradually replaced every repetitive task, proving that the initial time investment in writing scripts pays compounding dividends.

* **`run.sh`, `switch.sh`, and `run-benchmark.sh`:** Moving the execution logic into modular bash scripts eliminated human error. The scripts guaranteed that the environment was torn down, verified, and tested in the exact same sequence every single time.
* **GitHub Actions:** Manually pulling code onto the production server and running `npm build` resulted in downtime and orphaned artifacts. Automating the Docker builds via CI/CD pipelines transformed deployments from a high-risk operation into a simple, reliable `docker compose pull`.
* **Email Reports:** Forcing users to wait on the dashboard for 10 minutes led to browser timeouts. Automating the notification pipeline decoupled the execution state from the user session.

The ultimate value of automation in VPNLens was **reproducibility**. An automated system executes workflows identically at 2:00 PM and 2:00 AM, ensuring that the benchmark metrics reflect the protocols, not the engineer's fatigue.

---

## Lesson 4 — Debugging Is a Core Engineering Skill

A significant realization during this project was that most development time was not spent writing new code. It was spent diagnosing why existing code, or existing infrastructure, was failing.

Debugging real systems is fundamentally different from debugging a localized software script. When a local Python script fails, a stack trace tells you the exact line number. When a distributed infrastructure platform fails, the symptom might manifest in the React dashboard, but the root cause might be a dropped packet in the Linux kernel.

Development time was spent:

* **Reading Logs:** Tailing Docker logs, SSH daemon logs, and `dmesg` kernel logs to track the lifecycle of a request.
* **Understanding Failures:** Learning that an `iperf3` timeout did not mean `iperf3` was broken; it meant the underlying cryptographic handshake had failed.
* **Testing Assumptions:** We assumed Docker's default networking would handle VPN encapsulation. We were wrong. We had to use `tcpdump` to prove that MTU fragmentation was destroying our TCP payloads.
* **Validating Behavior:** Implementing the Verification Ladder in `switch.sh` taught us that a successful interface initialization command (`tailscale up`) does not mean the interface is actually routing traffic yet.

Debugging taught us to build observable systems. Without verbose logging and strict exit codes, distributed systems are black boxes.

---

## Lesson 5 — Cloud Infrastructure Behaves Differently Than Local Development

Building a system on a laptop using `localhost` creates a false sense of security. Deploying VPNLens to Oracle Cloud Infrastructure (OCI) exposed the stark reality of production environments.

* **Networking and Public IPs:** Local containers communicate seamlessly. In the cloud, traffic must traverse public gateways, NATs, and restrictive security groups.
* **Firewalls:** We had to explicitly manage ingress and egress rules for UDP port 51820 (WireGuard) and specific TCP ports for Headscale, bridging the gap between OCI Security Lists and the Ubuntu OS firewall.
* **SSH Orchestration:** Triggering scripts locally is trivial. Triggering them across the internet via SSH requires managing ED25519 key pairs, managing file permissions (`chmod 600`), and handling abrupt socket disconnects when the network is saturated by load testing.
* **Persistence:** Local Docker volumes are easy to wipe. In the cloud, we had to ensure our SQLite database and Headscale cryptographic keys were mounted to safe, persistent host directories to survive container rebuilds.

Cloud infrastructure forces an engineer to think defensively. You must assume the network is hostile, connections will drop, and IP addresses will change.

---

## Lesson 6 — VPN Technologies Are More Than Configuration Files

Before this project, setting up a VPN meant following a tutorial and copying a configuration file. VPNLens required a deep, architectural understanding of how these technologies actually operate.

* **WireGuard:** We learned that WireGuard is a stateless, kernel-space marvel. It utilizes Cryptokey Routing. Because it has no concept of a "session," it recovers from network drops almost instantaneously. It taught us about the efficiency of minimizing context switches between userspace and the Linux kernel.
* **Headscale (Tailscale):** We learned the intricacies of stateful mesh networking. Headscale relies on a central coordination server to distribute public keys and manage NAT traversal (STUN/TURN). The data plane utilizes a userspace implementation (`wireguard-go`).

Understanding these architectural differences was more valuable than memorizing `wg-quick` commands. It explained *why* Headscale's Recovery Time was longer than WireGuard's (because it required a stateful handshake) and *why* WireGuard's throughput was higher (kernel integration).

---

## Lesson 7 — Simplicity Wins

In an industry obsessed with microservices, Kubernetes, and infinite scalability, VPNLens was a masterclass in the power of simplicity.

Keeping the architecture understandable was a deliberate priority.

* We chose SQLite because we didn't need a distributed database.
* We used Docker Compose because we didn't need a highly available cluster.
* We postponed Terraform and Ansible because automating the deployment of an unstable benchmarking script was a distraction from fixing the core logic.

Simple systems are easier to reason about, easier to deploy, and infinitely easier to debug. By avoiding unnecessary complexity, we kept the codebase accessible and maintainable. Every abstraction layer you add to a project is another layer you have to debug when things go wrong.

---

## Lesson 8 — AI Is an Accelerator, Not a Replacement

This project was built during the rapid adoption of Large Language Models (LLMs) like ChatGPT and Claude. Using these tools extensively provided a clear understanding of their capabilities and, more importantly, their limitations.

### What AI Handled Successfully

AI acted as a high-speed translator and boilerplate generator. It was exceptional at:

* Writing repetitive React component structures and CSS styling.
* Translating mental concepts into precise syntax (e.g., generating the exact `awk` command to parse latency from a ping output).
* Generating raw SQLite schema definitions based on a list of required fields.
* Assisting in formatting Markdown documentation and Mermaid diagrams.

### What AI Could Not Replace

AI accelerated implementation, but it did not replace engineering. It could not perform:

* **Architecture and Engineering Judgment:** AI did not invent the Two-Server isolation model. It initially suggested running everything on one machine. The physical separation to eliminate CPU observer bias was a human architectural decision.
* **Cloud Deployment and Networking:** AI could not navigate the specific OCI console to open VCN ports.
* **Linux Debugging:** When Docker MTU fragmentation caused the VPNs to drop packets, AI provided generic advice ("check your firewall"). Deep packet inspection via `tcpdump` remained a manual, human engineering task.
* **Testing and Validation:** AI could write the bash scripts, but a human had to run them, observe the routing table collisions, and design the "Stop Everything" teardown state machine.

### The Actual Workflow

The development of VPNLens followed a strict, iterative workflow where AI was utilized as a tool, not a project manager:

**Problem** → **Research** → **Architecture** → **Prompt Engineering** → **AI Generated Code** → **Testing** → **Debugging** → **Iteration** → **Deployment** → **Validation** → **Documentation**

### The Danger of Blind Trust

AI frequently hallucinates. It would confidently suggest `iproute2` flags that did not exist, or propose altering `systemd-networkd` configurations that would sever the cloud server's public internet access. Blindly executing AI-generated infrastructure code is dangerous. The primary lesson was that **you must understand the code AI generates well enough to debug it when it inevitably fails.**

---

## Lesson 9 — Documentation Is Part of Engineering

Engineering does not end when the code compiles; it ends when the system can be understood, maintained, and operated by someone else.

Good documentation is not an afterthought. In VPNLens, the extensive documentation (Architectural Guides, Methodologies, Postmortems) serves multiple purposes:

* **Improves Maintainability:** It ensures that when a bash script fails six months from now, the maintainer understands *why* the script was designed with an exponential backoff retry loop in the first place.
* **Helps Contributors:** It lowers the barrier to entry, explaining the system's boundaries so contributors can add features (like OpenVPN support) without breaking the core orchestration engine.
* **Helps Future Self:** The context behind complex decisions (like MTU clamping) fades quickly. Documenting the investigation preserves that hard-won knowledge.

Writing documentation forces clarity. If a system is too difficult to document, its architecture is likely too complex.

---

## Lesson 10 — Software Evolves

The initial scope of VPNLens was incredibly narrow. It was designed to be a manual comparison of two VPNs. However, the requirements evolved naturally as the project met reality.

**The Evolution:**
VPN Comparison → Dashboard → Automation → Benchmark Platform → Infrastructure Project.

We realized manual tests were flawed. So we automated them. We realized reading terminal logs was tedious. So we built a dashboard. We realized keeping users waiting caused browser timeouts. So we built an asynchronous email pipeline.

Software development is an exercise in managing scope evolution. The project was allowed to grow organically, solving the immediate bottlenecks (accuracy, usability, reliability) at each stage, eventually transforming a simple academic requirement into a comprehensive infrastructure evaluation platform.

---

## Lesson 11 — Finishing Is Harder Than Starting

Starting a project is exciting. Writing the initial architecture, spinning up the first cloud server, and running the first successful test are highly motivating milestones.

However, finishing the project—the final 10%—requires immense discipline.

* Refactoring messy scripts into modular functions.
* Writing comprehensive error handling for edge cases.
* Drafting thousands of words of Markdown documentation.
* Capturing clean screenshots.
* Formatting the `README.md` and standardizing the GitHub repository.

The final 10% often takes 50% of the time. It is the difference between a collection of scripts sitting on a laptop and a polished open-source project that others can actually use and learn from.

---

## Lesson 12 — Build Projects That Teach You Something

The final benchmark numbers generated by VPNLens—the specific latency or throughput of WireGuard versus Headscale on an Oracle Cloud server—are not the greatest outcome of this project. Those numbers will be obsolete the moment OCI upgrades their hypervisors or the Linux kernel receives a networking patch.

The real outcome of VPNLens was the process of building it.

By pushing this project to completion, it provided an accelerated, hands-on education in Linux administration, network routing, bash automation, cloud deployments, and distributed systems engineering. It transformed abstract concepts into concrete, debuggable problems.

The most valuable projects are the ones that force you outside of your comfort zone, requiring you to learn the underlying infrastructure that supports your code.

---

## Advice To Students

If you are a student reading this and preparing to build your own systems engineering project, consider the following practical advice:

* **Start Simple:** Do not start with Kubernetes and Terraform. Start with a bash script on a single VM. Add complexity only when the simple solution explicitly fails.
* **Automate Repetitive Work:** If you have to type a command more than three times, script it. Automation enforces consistency.
* **Read Documentation:** Stack Overflow and AI can provide quick fixes, but reading the official documentation for tools like `iproute2` or Docker Networking builds foundational understanding.
* **Understand Systems:** Code runs on hardware. Learn how the Linux kernel, CPU scheduling, and network interfaces impact your application's performance.
* **Deploy to Real Infrastructure:** Localhost hides network latency, firewall issues, and deployment complexity. Push your code to a real cloud server as early as possible.
* **Don't Fear Debugging:** A broken system is an opportunity to learn exactly how it works. Embrace `tcpdump`, `strace`, and verbose logging.
* **Document Everything:** Write down what you tried, what failed, and why you chose a specific solution. Your future self will thank you.
* **Finish What You Start:** The hardest lessons are learned in the final 10% of polish and deployment. Push through the friction.
* **Use AI Responsibly:** Use AI to write boilerplate and suggest syntax, but never deploy infrastructure code you do not fundamentally understand.

---

## Advice To Future Contributors

For engineers looking to contribute to the VPNLens repository:

* **Understand the Architecture First:** Before altering the React frontend, understand that it relies on a decoupled, asynchronous backend queue. Read the Architecture Decision Records (ADRs).
* **Keep Automation Modular:** If adding support for a new protocol (like OpenVPN), confine the initialization logic to `switch.sh`. Do not pollute the metric collection logic in `run-benchmark.sh`.
* **Prefer Reproducibility Over Features:** A new feature is only valuable if it does not compromise the mathematical isolation of the Benchmark Node.
* **Write Documentation Alongside Code:** If you change how the SSH orchestration works, update the API and Scripts documentation in the same Pull Request.
* **Think Long-Term:** Ensure that your contributions align with the project's philosophy of operational simplicity and infrastructure-as-code principles.

---

## Final Reflection

VPNLens started as an Internship-I university requirement. It could have been completed in a weekend by manually running a few network tests and writing a static report.

Instead, during development, it became much more than an academic submission. It became an opportunity to deeply explore cloud infrastructure, Linux networking, automated orchestration, benchmarking methodology, and systems engineering.

The greatest achievement of VPNLens was not building a React dashboard, and it was not collecting the benchmark numbers. The true achievement was learning how to design, build, debug, automate, and fully document a complete distributed system. It proved that the most effective way to master complex technologies is to attempt to orchestrate them in a hostile, real-world cloud environment.

Build projects that challenge your assumptions. Document your engineering journey—failures and all—honestly. Continue learning through the friction of real-world problems. The code you write today will eventually be rewritten, but the systems engineering principles you learn in the process will remain foundational.