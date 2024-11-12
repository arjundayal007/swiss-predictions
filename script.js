// Tournament Configuration
const MAX_WINS = 3;
const MAX_LOSSES = 3;
const TOTAL_TEAMS = 16;
const INITIAL_ROUNDS = 2;
const TOTAL_ROUNDS = 5;

// Tournament Data Structures
let teams = [];
let matches = [];
let currentRound = 1;
let matchIdCounter = 0; // Unique identifier for each match

// Team Status Enum
const TeamStatus = {
    ACTIVE: 'Active',
    PROMOTED: 'Promoted',
    ELIMINATED: 'Eliminated'
};

// Initialize Team Input Form
function initializeTeamForm() {
    const teamTableBody = document.getElementById('team-table-body');
    for (let i = 1; i <= TOTAL_TEAMS; i++) {
        const row = document.createElement('tr');

        const seedCell = document.createElement('td');
        seedCell.textContent = i;

        const nameCell = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.required = true;
        nameInput.placeholder = `Team ${i}`;
        nameInput.dataset.seed = i; // Store original seed
        nameCell.appendChild(nameInput);

        row.appendChild(seedCell);
        row.appendChild(nameCell);
        teamTableBody.appendChild(row);
    }
}

// Handle Team Form Submission
document.getElementById('team-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const teamInputs = document.querySelectorAll('#team-table-body input');
    teams = [];
    teamInputs.forEach(input => {
        const team = {
            originalSeed: parseInt(input.dataset.seed),
            currentSeed: parseInt(input.dataset.seed), // Initialize currentSeed same as originalSeed
            name: input.value.trim(),
            wins: 0,
            losses: 0,
            buchholz: 0,
            status: TeamStatus.ACTIVE
        };
        teams.push(team);
    });

    // Sort teams by original seed
    teams.sort((a, b) => a.originalSeed - b.originalSeed);

    // Hide Team Input Section and Show Tournament Section
    document.getElementById('team-input-section').classList.add('hidden');
    document.getElementById('tournament-section').classList.remove('hidden');

    // Show Standings Section
    document.getElementById('standings-section').classList.remove('hidden');

    // Initialize Standings Table
    updateStandings();

    // Generate Initial Pairings
    generatePairings();
});

// Generate Pairings Based on Current Round
function generatePairings() {
    let pairings = [];

    if (currentRound <= INITIAL_ROUNDS) {
        if (currentRound === 1) {
            // Round 1: 1 vs 9, 2 vs 10, ..., 8 vs16
            for (let i = 0; i < TOTAL_TEAMS / 2; i++) {
                const team1 = teams[i];
                const team2 = teams[i + TOTAL_TEAMS / 2];
                if (!team1 || !team2) {
                    console.error(`Invalid pairing in Round 1: Team1 or Team2 is undefined. i=${i}`);
                    continue;
                }
                pairings.push({
                    id: matchIdCounter++,
                    round: currentRound,
                    team1: team1,
                    team2: team2,
                    outcome: null,
                    isBo1: true
                });
            }
        } else if (currentRound === 2) {
            // Round 2: Reseed based on Round 1 outcomes
            const round1Matches = matches.filter(m => m.round === 1);
            const winners = round1Matches.filter(m => m.outcome === 'Team1Win' || m.outcome === 'Bye').map(m => m.team1);
            const losers = round1Matches.filter(m => m.outcome === 'Team2Win').map(m => m.team2);

            // Log winners and losers
            console.log(`Round 1 Winners (${winners.length}):`, winners.map(t => t.name));
            console.log(`Round 1 Losers (${losers.length}):`, losers.map(t => t.name));

            // Sort winners by originalSeed ascending
            winners.sort((a, b) => a.originalSeed - b.originalSeed);
            // Assign newSeed 1-8
            winners.forEach((team, index) => {
                team.currentSeed = index + 1;
            });

            // Sort losers by originalSeed ascending
            losers.sort((a, b) => a.originalSeed - b.originalSeed);
            // Assign newSeed 9-16
            losers.forEach((team, index) => {
                team.currentSeed = index + 9;
            });

            // Combine reseeded teams
            const reseededTeams = winners.concat(losers);

            // Verify that we have 16 teams
            if (reseededTeams.length !== TOTAL_TEAMS) {
                console.error(`Reseeded teams count mismatch. Expected ${TOTAL_TEAMS}, got ${reseededTeams.length}`);
            }

            // Generate Upper Bracket Pairings: 1 vs5, 2 vs6, 3 vs7,4 vs8
            for (let i = 0; i < 4; i++) {
                const team1 = reseededTeams[i];
                const team2 = reseededTeams[i + 4];
                if (!team1 || !team2) {
                    console.error(`Invalid upper bracket pairing in Round 2: Team1 or Team2 is undefined. i=${i}`);
                    continue;
                }
                pairings.push({
                    id: matchIdCounter++,
                    round: currentRound,
                    team1: team1,
                    team2: team2,
                    outcome: null,
                    isBo1: true
                });
            }

            // Generate Lower Bracket Pairings:9 vs13,10 vs14,11 vs15,12 vs16
            for (let i = 8; i < 12; i++) {
                const team1 = reseededTeams[i];
                const team2 = reseededTeams[i + 4];
                if (!team1 || !team2) {
                    console.error(`Invalid lower bracket pairing in Round 2: Team1 or Team2 is undefined. i=${i}`);
                    continue;
                }
                pairings.push({
                    id: matchIdCounter++,
                    round: currentRound,
                    team1: team1,
                    team2: team2,
                    outcome: null,
                    isBo1: true
                });
            }
        }
    } else {
        // Swiss Pairings: Pair teams based on current standings and Buchholz
        pairings = swissPairings();
    }

    // Add pairings to matches array
    matches.push(...pairings);
    console.log(`Generated Pairings for Round ${currentRound}:`, pairings.map(m => `${m.team1.name} vs ${m.team2 ? m.team2.name : 'Bye'}`));

    displayMatches(pairings);
}

// Display Matches for the Current Round
function displayMatches(pairings) {
    document.getElementById('current-round-number').textContent = currentRound;

    const matchesDisplay = document.getElementById('matches-display');
    matchesDisplay.innerHTML = '';

    if (pairings.length === 0) {
        matchesDisplay.textContent = 'No matches to display for this round.';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['Match', 'Team 1', 'Score', 'Team 2', 'Score', 'Result'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    pairings.forEach((match, index) => {
        const row = document.createElement('tr');

        // Match Number
        const matchNumberCell = document.createElement('td');
        matchNumberCell.textContent = index + 1;
        row.appendChild(matchNumberCell);

        // Team 1
        const team1Cell = document.createElement('td');
        team1Cell.textContent = match.team1 ? match.team1.name : 'N/A';
        row.appendChild(team1Cell);

        // Score Input for Team 1
        const score1Cell = document.createElement('td');
        if (match.team2) {
            const score1Input = document.createElement('input');
            score1Input.type = 'number';
            score1Input.min = 0;
            score1Input.placeholder = '0';
            score1Input.id = `score1-${match.id}`;
            score1Cell.appendChild(score1Input);
        } else {
            score1Cell.textContent = '-';
        }
        row.appendChild(score1Cell);

        // Team 2
        const team2Cell = document.createElement('td');
        team2Cell.textContent = match.team2 ? match.team2.name : 'Bye';
        row.appendChild(team2Cell);

        // Score Input for Team 2
        const score2Cell = document.createElement('td');
        if (match.team2) {
            const score2Input = document.createElement('input');
            score2Input.type = 'number';
            score2Input.min = 0;
            score2Input.placeholder = '0';
            score2Input.id = `score2-${match.id}`;
            score2Cell.appendChild(score2Input);
        } else {
            score2Cell.textContent = '-';
        }
        row.appendChild(score2Cell);

        // Result Button or Display
        const resultCell = document.createElement('td');
        if (!match.outcome) {
            const submitButton = document.createElement('button');
            submitButton.textContent = 'Submit';
            submitButton.dataset.matchId = match.id;
            submitButton.onclick = () => submitMatchResult(match.id);
            resultCell.appendChild(submitButton);
        } else {
            const resultText = document.createElement('span');
            if (match.outcome === 'Bye') {
                resultText.textContent = 'Bye';
            } else if (match.outcome === 'Team1Win') {
                resultText.textContent = `${match.team1.name} Wins`;
            } else if (match.outcome === 'Team2Win') {
                resultText.textContent = `${match.team2.name} Wins`;
            } else {
                resultText.textContent = 'Completed';
            }
            resultCell.appendChild(resultText);
        }
        row.appendChild(resultCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    matchesDisplay.appendChild(table);
}

// Submit Match Result
function submitMatchResult(matchId) {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
        alert('Match not found.');
        return;
    }

    if (match.outcome) {
        alert('Match already has a result.');
        return;
    }

    if (match.team2) {
        const score1Element = document.getElementById(`score1-${match.id}`);
        const score2Element = document.getElementById(`score2-${match.id}`);
        const score1 = parseInt(score1Element.value);
        const score2 = parseInt(score2Element.value);

        // Validate scores
        if (isNaN(score1) || isNaN(score2)) {
            alert('Please enter valid scores for both teams.');
            return;
        }

        // BO1 Score Validation
        if (match.isBo1) {
            if (!validateBo1Scores(score1, score2)) {
                alert('Invalid scores for BO1 match.\nA team must reach at least 7 rounds to win, or be the first to 8 rounds if the score reaches 6-6.');
                return;
            }
        }

        // Determine Outcome
        if (score1 > score2) {
            match.outcome = 'Team1Win';
            match.team1.wins += 1;
            match.team2.losses += 1;
        } else if (score2 > score1) {
            match.outcome = 'Team2Win';
            match.team2.wins += 1;
            match.team1.losses += 1;
        } else {
            alert('Scores cannot be tied in BO1 matches.');
            return;
        }
    } else {
        // Handle Bye: Automatic win for Team1
        match.outcome = 'Bye';
        match.team1.wins += 1;
        match.team2 = null;
    }

    // Update Team Statuses
    updateTeamStatus(match.team1);
    if (match.team2) updateTeamStatus(match.team2);

    // Update Standings
    updateStandings();

    // Update Matches Display for Current Round
    displayMatches(matches.filter(m => m.round === currentRound));

    // Check if All Matches in Current Round are Completed
    const allMatchesCompleted = matches.filter(m => m.round === currentRound).every(m => m.outcome !== null);
    if (allMatchesCompleted) {
        // Show Next Round Button if not reached TOTAL_ROUNDS
        if (currentRound < TOTAL_ROUNDS) {
            document.getElementById('next-round-button').classList.remove('hidden');
        } else {
            // Tournament Completed
            alert('Tournament Completed!');
        }
    }
}

// Validate BO1 Scores
function validateBo1Scores(score1, score2) {
    // A team must reach at least 7 rounds to win
    // If both teams reach 6, first to 8 wins
    if (score1 < 7 && score2 < 7) return false;
    if (score1 >= 7 && score2 <= 7) return true;
    if (score2 >= 7 && score1 <= 7) return true;
    return false;
}

// Update Team Status Based on Wins and Losses
function updateTeamStatus(team) {
    if (team.wins >= MAX_WINS) {
        team.status = TeamStatus.PROMOTED;
    } else if (team.losses >= MAX_LOSSES) {
        team.status = TeamStatus.ELIMINATED;
    } else {
        team.status = TeamStatus.ACTIVE;
    }
}

// Update Standings Table
function updateStandings() {
    const standingsBody = document.getElementById('standings-table-body');
    standingsBody.innerHTML = '';

    // Calculate Buchholz Scores
    calculateBuchholz();

    // Sort Teams: Wins Desc, Buchholz Desc, Original Seed Asc
    const sortedTeams = [...teams].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        return a.originalSeed - b.originalSeed;
    });

    sortedTeams.forEach(team => {
        const row = document.createElement('tr');

        // Seed
        const seedCell = document.createElement('td');
        seedCell.textContent = team.currentSeed;
        row.appendChild(seedCell);

        // Team Name
        const nameCell = document.createElement('td');
        nameCell.textContent = team.name;
        row.appendChild(nameCell);

        // Wins
        const winsCell = document.createElement('td');
        winsCell.textContent = team.wins;
        row.appendChild(winsCell);

        // Losses
        const lossesCell = document.createElement('td');
        lossesCell.textContent = team.losses;
        row.appendChild(lossesCell);

        // Buchholz
        const buchholzCell = document.createElement('td');
        buchholzCell.textContent = team.buchholz;
        row.appendChild(buchholzCell);

        // Status
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        if (team.status === TeamStatus.PROMOTED) {
            statusSpan.textContent = TeamStatus.PROMOTED;
            statusSpan.classList.add('status-promoted');
        } else if (team.status === TeamStatus.ELIMINATED) {
            statusSpan.textContent = TeamStatus.ELIMINATED;
            statusSpan.classList.add('status-eliminated');
        } else {
            statusSpan.textContent = TeamStatus.ACTIVE;
            statusSpan.classList.add('status-active');
        }
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);

        standingsBody.appendChild(row);
    });
}

// Calculate Buchholz Scores
function calculateBuchholz() {
    // Reset Buchholz
    teams.forEach(team => {
        team.buchholz = 0;
    });

    // Sum the performance of each opponent
    matches.forEach(match => {
        if (match.outcome) {
            if (match.outcome === 'Team1Win' || match.outcome === 'Team2Win') {
                const winner = match.outcome === 'Team1Win' ? match.team1 : match.team2;
                const loser = match.outcome === 'Team1Win' ? match.team2 : match.team1;

                // Winner's Buchholz increases by (loser's wins - loser's losses)
                winner.buchholz += (loser.wins - loser.losses);

                // Loser's Buchholz increases by (winner's wins - winner's losses)
                loser.buchholz += (winner.wins - winner.losses);
            }
            // Byes do not affect Buchholz
        }
    });
}

// Handle Next Round Generation
document.getElementById('next-round-button').addEventListener('click', function() {
    // Hide Next Round Button
    this.classList.add('hidden');

    // Increment Round FIRST
    currentRound += 1;

    // Generate Pairings for Next Round
    generatePairings();
});

// Swiss Pairing Algorithm with Buchholz
function swissPairings() {
    const activeTeams = teams.filter(t => t.status === TeamStatus.ACTIVE);

    // Sort active teams by wins descending, then Buchholz descending, then original seed ascending
    const sortedTeams = activeTeams.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        return a.originalSeed - b.originalSeed;
    });

    const pairings = [];
    const used = new Set();

    for (let i = 0; i < sortedTeams.length; i++) {
        const team1 = sortedTeams[i];
        if (used.has(team1)) continue;

        for (let j = i + 1; j < sortedTeams.length; j++) {
            const team2 = sortedTeams[j];
            if (used.has(team2)) continue;

            // Check if they have played before
            const hasPlayed = matches.some(m =>
                (m.team1 === team1 && m.team2 === team2) ||
                (m.team1 === team2 && m.team2 === team1)
            );

            if (!hasPlayed) {
                pairings.push({
                    id: matchIdCounter++,
                    round: currentRound,
                    team1: team1,
                    team2: team2,
                    outcome: null,
                    isBo1: false // BO3 for Swiss matches
                });
                used.add(team1);
                used.add(team2);
                break;
            }
        }
    }

    // Handle Odd Number of Teams by Assigning Bye
    const remainingTeams = sortedTeams.filter(t => !used.has(t));
    if (remainingTeams.length > 0) {
        const byeTeam = remainingTeams[0];
        pairings.push({
            id: matchIdCounter++,
            round: currentRound,
            team1: byeTeam,
            team2: null,
            outcome: null,
            isBo1: false // BO3 if it's a bye
        });
    }

    return pairings;
}

// Initialize the Team Form on Page Load
window.onload = initializeTeamForm;
