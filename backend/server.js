
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/votingSystem', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define schemas and models
const VoteSchema = new mongoose.Schema({
    email: { type: String, required: true },
    participant: { type: String, required: true },
});

const VoteCountSchema = new mongoose.Schema({
    participant: { type: String, required: true },
    count: { type: Number, default: 0 },
});

const Vote = mongoose.model('Vote', VoteSchema);
const VoteCount = mongoose.model('VoteCount', VoteCountSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Predefined password for all users
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'vote123';

// Load eligible users from JSON file
function loadEligibleUsers() {
    try {
        const rawData = fs.readFileSync('eligible-users.json');
        return JSON.parse(rawData);
    } catch (err) {
        console.error('Error loading eligible users:', err);
        return [];
    }
}

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use an app password or environment variable
    },
});

// Function to send emails
async function sendVotingEmails() {
    const eligibleUsers = loadEligibleUsers();

    for (const email of eligibleUsers) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Voting Link and Credentials',
            text: `Hello,

You are eligible to vote in our voting system. Use the following credentials to log in and cast your vote:

Default Password: ${DEFAULT_PASSWORD}
Voting Link: http://localhost:3000/vote

Happy Voting!
`,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${email}`);
        } catch (error) {
            console.error(`Error sending email to ${email}:`, error);
        }
    }
}

// Send voting emails on server start
sendVotingEmails()
    .then(() => console.log('Voting emails sent successfully.'))
    .catch(err => console.error('Error sending voting emails:', err));

// Route: User Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (password !== DEFAULT_PASSWORD) {
        return res.status(400).json({ message: 'Incorrect password.' });
    }

    // Check if the email is eligible to vote
    const eligibleUsers = loadEligibleUsers();
    if (!eligibleUsers.includes(email)) {
        return res.status(403).json({ message: 'You are not eligible to vote.' });
    }

    res.status(200).json({ message: 'Login successful.' });
});

// Route: Cast Vote
app.post('/api/vote', async (req, res) => {
    const { email, participantName } = req.body;

    if (!email || !participantName) {
        return res.status(400).json({ message: 'Email and participant name are required.' });
    }

    try {
        // Prevent duplicate voting
        const existingVote = await Vote.findOne({ email });
        if (existingVote) {
            return res.status(400).json({ message: 'You have already voted.' });
        }

        // Save the vote
        await Vote.create({ email, participant: participantName });

        // Increment the vote count for the participant
        const voteCount = await VoteCount.findOne({ participant: participantName });
        if (voteCount) {
            voteCount.count += 1;
            await voteCount.save();
        } else {
            await VoteCount.create({ participant: participantName, count: 1 });
        }

        res.status(200).json({ message: 'Vote successfully cast!' });
    } catch (error) {
        console.error('Error casting vote:', error);
        res.status(500).json({ message: 'Error casting vote.', error });
    }
});

// Route: Get Vote Counts
app.get('/api/votes', async (req, res) => {
    try {
        const voteCounts = await VoteCount.find();
        res.status(200).json(voteCounts);
    } catch (error) {
        console.error('Error fetching vote counts:', error);
        res.status(500).json({ message: 'Error fetching vote counts.', error });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
