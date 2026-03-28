
const toggleBtn = document.getElementById('toggle-dark');
if(toggleBtn){
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });
}

window.addEventListener('load', () => {
    document.body.classList.remove('preload');
});
const contactBtn = document.getElementById("contactBtn");
const popup = document.getElementById("popup");

// Toggle popup visibility when clicking the button
contactBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevents closing immediately
  popup.classList.toggle("show");
});

// Close popup if clicking outside
document.addEventListener("click", () => {
  popup.classList.remove("show");
});