const socket = typeof io === "function" ? io() : createRelay();

const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("messageInput");
const statusEl = document.getElementById("status");
const widget = document.getElementById("chatWidget");
const closedCard = document.getElementById("closedCard");
const fullScreen = document.getElementById("fullScreen");
const closeBtn = document.getElementById("closeBtn");
const openBtn = document.getElementById("openBtn");
const installBtn = document.getElementById("installBtn");

let installPrompt = null;

let myMember = null;

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(message) {
  const mine = message.member === myMember;
  const el = document.createElement("div");
  el.className = `message ${mine ? "mine" : "theirs"}`;

  if (!mine) {
    const sender = document.createElement("span");
    sender.className = "sender";
    sender.textContent = `Member ${message.member}`;
    el.appendChild(sender);
  }

  el.appendChild(document.createTextNode(message.text));
  messagesEl.appendChild(el);
  scrollToBottom();
}

function setStatus(count, max) {
  const you = myMember ? `You are Member ${myMember} • ` : "";
  if (count <= 1) {
    statusEl.textContent = `${you}waiting for others to join (up to ${max})`;
  } else {
    statusEl.textContent = `${you}${count} of ${max} members online`;
  }
}

socket.on("member-assigned", ({ memberNumber }) => {
  myMember = memberNumber;
});

socket.on("members", ({ count, max }) => {
  setStatus(count, max);
});

socket.on("chat-history", (history) => {
  history.forEach(addMessage);
  scrollToBottom();
});

socket.on("new-message", (message) => {
  addMessage(message);
});

socket.on("room-full", ({ max }) => {
  document.getElementById("fullMessage").textContent =
    `Only ${max} members can use this chat at the same time.`;
  fullScreen.style.display = "flex";
  widget.style.display = "none";
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  socket.emit("send-message", text);
  input.value = "";
  resizeInput();
  input.focus();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 110) + "px";
}

input.addEventListener("input", resizeInput);

closeBtn.addEventListener("click", () => {
  widget.style.display = "none";
  closedCard.style.display = "block";
});

openBtn.addEventListener("click", () => {
  closedCard.style.display = "none";
  widget.style.display = "flex";
  input.focus();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

scrollToBottom();