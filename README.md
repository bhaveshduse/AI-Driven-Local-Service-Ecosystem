# 🌐 Swayam: AI-Driven Local Service Ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](#)
[![MERN Stack](https://img.shields.io/badge/MERN_Stack-Production_Ready-4CAF50?style=flat)](#)
[![AI Inference](https://img.shields.io/badge/AI_Latency-<%201500ms-red)](#)

**Swayam** is a production-ready, three-sided marketplace (Customer, Vendor, Admin) built on the MERN stack. Designed to bridge the gap between local service providers and community needs, the platform leverages advanced AI zero-shot classification to map user requests to services seamlessly. It features real-time geospatial search, secure manual escrow, and robust administrative governance.

---

## 🚀 Technical Highlights & Key Features

* **🧠 AI Semantic Service Routing:** Implemented a robust fallback architecture utilizing Hugging Face's `BART-large-MNLI` for zero-shot classification, with Gemini acting as a semantic fallback. Optimized for production with **sub-1500ms inference latencies**.
* **⚡ Real-Time Booking Engine:** Integrated `Socket.IO` for instantaneous bi-directional communication between customers and vendors during the booking lifecycle.
* **📍 Geospatial Search & Geofencing:** Engineered location-aware discovery, allowing users to find the closest available experts and minimizing vendor travel times.
* **🛡️ Enterprise-Grade Security & Auth:** Developed a custom JWT-based multi-role authentication system guarding Customer, Vendor, and Admin routes. Includes automated vendor document verification.
* **💳 Secure Escrow & UPI Payments:** Designed a manual escrow workflow featuring OTP-based job completion verification and integrated UPI payment verification flows.
* **📈 Administrative Governance:** Built a comprehensive React admin dashboard featuring real-time platform analytics, dispute resolution workflows, and automated service provisioning tools.

---

## 💻 Tech Stack

**Frontend:**
* React.js (TypeScript)
* Tailwind CSS
* Lucide React (Icons & UI elements)

**Backend & Infrastructure:**
* Node.js & Express.js
* Socket.IO (Real-time WebSockets)
* Custom JWT Authentication Middleware

**Database:**
* MongoDB & Mongoose (Geospatial querying & indexing)

**AI & Machine Learning:**
* `facebook/bart-large-mnli` (Primary zero-shot classifier via Hugging Face Inference API)
* Google Gemini (Secondary semantic routing & diagnostics)

---

## ⚙️ Architecture Overview

Swayam operates on a decoupled client-server architecture. The frontend utilizes a modular React custom hook pattern (e.g., `useCatalog`, `useGeolocation`) to maintain clean state management and handle race conditions via `AbortController`. The Node.js backend handles heavy geospatial queries and routes unformatted user queries through the dual-layer AI categorization pipeline before interacting with the database.

---

## 🛠️ How to Run Locally

Follow these steps to set up the Swayam ecosystem on your local machine.

### Prerequisites
* Node.js (v18 or higher)
* MongoDB (Local instance or Atlas URI)
* API Keys: Hugging Face Access Token, Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Foxydevp/AI-Driven-Local-Service-Ecosystem-.git](https://github.com/Foxydevp/AI-Driven-Local-Service-Ecosystem-.git)
   cd AI-Driven-Local-Service-Ecosystem-
