# Arkvidya Tiny Two-Person Chat

A small real-time chat widget inspired by the supplied Arkvidya screenshots.

## Features

- Exactly 2 simultaneous members
- No login
- No registration
- No database required
- Real-time messages with Socket.IO
- Responsive/mobile-friendly UI
- First visitor becomes Member 1
- Second visitor becomes Member 2
- Third visitor is rejected while both places are occupied
- Last 100 messages are kept in server memory

## Run in Cursor / terminal

1. Install Node.js (LTS).
2. Open this folder in Cursor.
3. Open Terminal.
4. Run:

```bash
npm install
npm start
```

5. Open:

http://localhost:3000

## Test two people on one computer

Open the URL in two different browser windows (or one normal window and one incognito window).

The first window becomes Member 1 and the second becomes Member 2.

## Test on two phones/computers on the same Wi-Fi

Find the computer's local IP address, for example:

```text
192.168.1.10
```

Then on the second device open:

```text
http://192.168.1.10:3000
```

Both devices must be on the same network.

## Important

This version stores messages only in server memory. Restarting the server clears the messages.

For internet use, deploy the Node.js app to a host that supports WebSockets (for example a Node-compatible hosting service), then place the widget on your website if desired.
