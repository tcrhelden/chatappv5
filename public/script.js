const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const userList = document.getElementById("users");
let username = null;

fetch("/session-user")
  .then((res) => res.json())
  .then(async (data) => {
    if (!data.username) return (window.location.href = "/");
    username = data.username;
    socket.emit("join", username);
    const resMessages = await fetch("/messages");
    const oldMessages = await resMessages.json();
    oldMessages.forEach((msg) => appendMessage(msg));
  });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit("chatMessage", input.value);
    input.value = "";
  }
});

socket.on("chatMessage", (data) => appendMessage(data));
socket.on("onlineUsers", (users) => {
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u === username ? `${u} (jij)` : u;
    userList.appendChild(li);
  });
});

function appendMessage(data) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>${data.username}</strong> <span style='color:gray;'>${data.time}</span><br>${data.message}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

document.getElementById("logout").addEventListener("click", () => {
  fetch("/logout").then(() => {
    socket.disconnect();
    window.location.href = "/";
  });
});
