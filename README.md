# Asta — Real-Time Multiplayer Auction Game

**Asta** is a browser-based multiplayer auction game where players compete by submitting bids in real time. An auction host creates a private game room, sets the total budget, and manages the auction, while participants join using a unique room code.

The project explores real-time client-server communication and shared game state through a lightweight web application built with Node.js and Socket.IO.

## Features

- **Multiplayer rooms** — Create an auction and let participants join using a unique six-character room code.
- **Real-time updates** — Synchronize participant lists and submitted bids across connected clients using WebSockets.
- **Budget distribution** — Distribute a predefined total budget among participants using a randomized, Gaussian-based allocation algorithm, normalized to preserve the total amount.
- **Live bidding** — Allow participants to submit bids within their allocated budget, with offers displayed in descending order.
- **Auction management** — Provide a dedicated host interface to monitor participants, start the auction, and determine the winner based on the highest submitted bid.
- **Browser-based interface** — Separate interfaces for the auction host and participants, accessible without installing a dedicated client application.

## Tech Stack

- **Backend:** Node.js, Express
- **Real-time communication:** Socket.IO
- **Frontend:** HTML, CSS, JavaScript
- **Architecture:** Event-driven client-server application

## How It Works

1. The host creates an auction and specifies the total available budget.
2. Participants join the room using its unique code and choose a nickname.
3. Once the auction starts, the server distributes the budget among the participants.
4. Participants submit their bids through the browser, and updates are broadcast to the connected clients.
5. The host ends the auction, and the participant with the highest recorded bid is declared the winner.

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/as-x0/Asta-2
cd Asta-2
npm install
```

### Run the Application

```bash
npm start
```

Open `http://localhost:3000` in your browser.

To test multiplayer functionality, open the application in multiple browser windows or on different devices connected to the same network. For access from other devices, configure the server to listen on an appropriate network interface and use the host machine's local IP address.

## Project Goals

Asta was developed to explore the implementation of a multiplayer web application, with a focus on:

- Real-time communication between clients and server.
- Event-driven application logic.
- Management of shared state across multiple participants.
- Randomized resource allocation under a fixed total budget.
- Separation of host and participant workflows.


