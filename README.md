# School Chat

A small real-time chat widget for up to four members.

## Features

- Up to 4 simultaneous members
- No login
- No registration
- No database required
- Real-time messages with Socket.IO
- Responsive/mobile-friendly UI
- Each visitor takes the lowest free seat (Member 1 to Member 4)
- A fifth visitor is rejected while all four places are occupied
- Disappearing messages: once another member has a message on screen, it stays
  visible for 3 seconds and is then destroyed for everyone, including the sender
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

## Permanent link without a server (GitHub Pages)

The `public` folder also works as a static site. When the Socket.IO server is
not present, the page connects through a free public MQTT relay instead
(`public/relay.js`). Messages pass through that third-party relay, so this mode
is not private and has no uptime guarantee.

Live at: https://rajeev8980.github.io/arkvidya-two-person-chat/

To publish changes to the `public` folder:

```bash
git subtree split --prefix public -b gh-pages
git push origin gh-pages
```

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/rajeev8980/arkvidya-two-person-chat)
