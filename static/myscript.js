document.querySelectorAll('input[name="role"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        if (this.value === "student") {
            document.getElementById("studentContent").style.display = "block";
            document.getElementById("teacherContent").style.display = "none";
        } else {
            document.getElementById("studentContent").style.display = "none";
            document.getElementById("teacherContent").style.display = "block";
        }
    });
});
// Add an event listener for the button click
document.getElementById("signuppage").addEventListener("click", function() {
    // Perform the redirection when the button is clicked
    // Replace 'target-page.html' with the actual URL of the page you want to redirect to
    targetURL = "signup.html";
    window.open(targetURL, "_blank");
});
