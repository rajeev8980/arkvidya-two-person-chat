const socket = io();

const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("messageInput");
const statusEl = document.getElementById("status");
const widget = document.getElementById("chatWidget");
const closedCard = document.getElementById("closedCard");
const fullScreen = document.getElementById("fullScreen");
const closeBtn = document.getElementById("closeBtn");
const openBtn = document.getElementById("openBtn");

let myMember = null;
let welcomed = false;

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(message) {
  const el = document.createElement("div");
  el.className = `message ${message.member === myMember ? "mine" : "theirs"}`;
  el.textContent = message.text;
  messagesEl.appendChild(el);
  scrollToBottom();
}

function setStatus(count) {
  if (count >= 2) {
    statusEl.textContent = "Both members are connected";
  } else {
    statusEl.textContent = "Waiting for the other member…";
  }
}

socket.on("member-assigned", ({ memberNumber }) => {
  myMember = memberNumber;
  statusEl.textContent = memberNumber === 1
    ? "You are Member 1 • waiting for Member 2"
    : "You are Member 2 • connected";
});

socket.on("members", ({ count }) => {
  setStatus(count);
});

socket.on("chat-history", (history) => {
  history.forEach(addMessage);
  scrollToBottom();
});

socket.on("new-message", (message) => {
  addMessage(message);
});

socket.on("room-full", () => {
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

scrollToBottom();