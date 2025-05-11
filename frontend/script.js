const apiUrl = 'http://localhost:3000/api';

// Predefined participants
const participants = ['Dhoni', 'Kohli', 'Rohit'];

/**
 * Handles user login.
 */
function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const fpassword = 'vote123'; // Expected password

    // Validation
    if (!email || !password) {
        alert('Please enter both email and password to login.');
        return;
    }

    if (password !== fpassword) {
        alert('Incorrect password. Please try again.');
        return;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Simulate successful login
    sessionStorage.setItem('email', email);
    alert(`Welcome, ${email}!`);
    showVotingSection();
}

/**
 * Validates email format.
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Displays the voting section and dynamically loads participants.
 */
function showVotingSection() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('voting').style.display = 'block';

    const participantsDiv = document.getElementById('participants');
    participantsDiv.innerHTML = ''; // Clear previous participants

    participants.forEach((participant) => {
        const button = document.createElement('button');
        button.textContent = participant;
        button.className = 'participant-button';
        button.onclick = () => vote(participant);
        participantsDiv.appendChild(button);
    });
}

/**
 * Handles voting for a participant.
 */
function vote(participantName) {
    const email = sessionStorage.getItem('email');

    // Check if email exists in session storage
    if (!email) {
        alert('You must log in to vote.');
        return;
    }

    fetch(`${apiUrl}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, participantName }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert('Vote successfully cast!');
                logout(); // Automatically log out after voting
            } else {
                alert(data.message || 'You are not authorized to vote or have already voted.');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Error casting your vote. Please try again.');
        });
}

/**
 * Logs out the user and clears session data.
 */
function logout() {
    sessionStorage.removeItem('email');
    document.getElementById('login').style.display = 'block';
    document.getElementById('voting').style.display = 'none';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
}

/**
 * Automatically show the voting section if the user is already logged in.
 */
window.onload = () => {
    const email = sessionStorage.getItem('email');
    if (email) {
        showVotingSection();
    }
};
