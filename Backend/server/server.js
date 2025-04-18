// server.js (Complete with new leaderboard XP endpoint)

require("dotenv").config();
const session = require("express-session");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const cookieParser = require("cookie-parser");
const { ethers } = require('ethers');
const axios = require('axios'); // <<< For backend GraphQL requests

// --- Load Contract ABIs ---
let RewardMechanismABI;
let UserDatabaseABI;
try {
    RewardMechanismABI = require('../artifacts/contracts/RewardMechanism.sol/RewardMechanism.json');
    UserDatabaseABI = require('../artifacts/contracts/UserDatabase.sol/UserDatabase.json'); // Ensure this ABI matches contract
} catch (error) {
    console.error("FATAL ERROR: Could not load required ABI file(s). Check paths in server.js.");
    console.error(error);
    process.exit(1); // Stop server if ABIs are missing
}
// --- End ABI Loading ---

// --- Environment Variable Checks ---
const requiredEnvVars = [
    'SESSION_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
    'ALCHEMY_API_KEY', 'PRIVATE_KEY', 'REWARD_CONTRACT_ADDRESS',
    'USER_DATABASE_CONTRACT_ADDRESS',
    'BACKEND_GITHUB_PAT' // <<< Check for the new backend token
];
requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        console.error(`Error: Environment variable ${envVar} is not set. Server cannot start correctly.`);
        process.exit(1); // Ensure server stops if critical config is missing
    }
});
// --- End Env Var Checks ---

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:8080";
const BACKEND_GITHUB_PAT = process.env.BACKEND_GITHUB_PAT; // Store the backend token
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql'; // Define GraphQL endpoint

// --- Middleware Setup ---
// Ensure CORS is configured correctly for your frontend URL
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Parse cookies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Session Configuration ---
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,             // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,           // Prevent client-side JS from accessing cookie
      maxAge: 24 * 60 * 60 * 1000, // Cookie expiration time (e.g., 24 hours)
      sameSite: process.env.NODE_ENV === "production" ? 'lax' : 'lax' // Adjust SameSite as needed
    }
   })
);

// --- Passport Initialization & Strategy ---
app.use(passport.initialize()); // Initialize Passport middleware
app.use(passport.session());    // Enable session support for Passport

// Configure the GitHub OAuth 2.0 strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback", // Your callback URL
      scope: ["user:email", "read:user", "repo"] // Scopes needed
    },
    // This function is called when GitHub authentication is successful
    function (accessToken, refreshToken, profile, done) {
      // Store the user's profile and access token in the session
      const userProfile = { ...profile, accessToken: accessToken };
      // The 'done' callback signals Passport that authentication is complete
      return done(null, userProfile); // Pass the user profile to serializeUser
    }
  )
);

// Serialize user information into the session
passport.serializeUser((user, done) => {
    // Store relevant user details and the access token
    done(null, {
        id: user.id,
        username: user.username,
        accessToken: user.accessToken, // <<< Store access token here
        displayName: user.displayName,
        photos: user.photos,
        profileUrl: user.profileUrl,
        _json: user._json // Raw profile data if needed
    });
});

// Deserialize user information from the session
passport.deserializeUser((sessionUser, done) => {
    // Retrieve the user object stored during serialization
    done(null, sessionUser); // Makes req.user available in authenticated routes
});

// --- ensureAuthenticated Middleware ---
// Middleware to protect routes that require authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { // Check if user is authenticated via Passport
        return next(); // Proceed to the next middleware or route handler
    }
    // If not authenticated, send an unauthorized error
    res.status(401).json({ error: 'Not authenticated' });
}

// --- Routes ---

// Basic root route
app.get("/", (req, res) => {
    res.send("🚀 GitHub OAuth Server is Running!");
});

// --- GitHub Authentication Routes ---
// Route to initiate GitHub authentication
app.get("/auth/github", passport.authenticate("github")); // Redirects user to GitHub

// GitHub callback route - GitHub redirects here after authentication
app.get(
    "/auth/github/callback",
    passport.authenticate("github", {
        failureRedirect: `${CLIENT_URL}/login-failed`, // Redirect on failure
        successReturnToOrRedirect: '/auth/success'      // Redirect on success (internal route)
    })
);

// Internal success route - redirects to the frontend dashboard after successful login
app.get('/auth/success', (req, res) => {
    console.log("GitHub authentication successful for user:", req.user?.username);
    res.redirect(`${CLIENT_URL}/dashboard`); // Redirect to frontend dashboard
});

// --- User Routes ---
// Route to get the authenticated user's data
app.get("/user", ensureAuthenticated, (req, res) => {
    // req.user contains the deserialized user object including the access token
    res.status(200).json(req.user);
});

// Route to log the user out
app.get("/logout", (req, res, next) => {
    req.logout((err) => { // Passport logout function
        if (err) {
            console.error("Error during logout:", err);
            return next(err); // Pass error to error handler
        }
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                // Still try to clear cookie and respond
            }
            res.clearCookie("connect.sid"); // Clear the session cookie
            console.log("User logged out successfully.");
            res.status(200).json({ message: "Logged out successfully" });
        });
    });
});

// --- Application Specific API Routes ---

// Existing Reward Allocation Endpoint (Keep as is)
app.post('/api/allocate-level-rewards', ensureAuthenticated, async (req, res) => {
    // --- Your existing reward allocation logic ---
    // Access req.body for level, etc.
    // Interact with RewardMechanism contract using PRIVATE_KEY wallet
    console.log(`API CALL: POST /api/allocate-level-rewards | User: ${req.user?.username}`);
    // Placeholder logic - replace with your actual implementation
    const { level, targetWallet } = req.body;
    if (!level || !targetWallet || !ethers.isAddress(targetWallet)) {
        return res.status(400).json({ error: 'Invalid input for reward allocation.' });
    }
    try {
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const rewardContract = new ethers.Contract(process.env.REWARD_CONTRACT_ADDRESS, RewardMechanismABI.abi, signer);
        // Example: const tx = await rewardContract.allocateReward(targetWallet, level);
        // console.log(`Reward allocation tx sent: ${tx.hash}`);
        res.status(200).json({ success: true, message: `Reward allocation initiated for level ${level} to ${targetWallet}.` /*, txHash: tx.hash */ });
    } catch (error) {
        console.error("Error in /api/allocate-level-rewards:", error);
        res.status(500).json({ success: false, error: 'Failed to allocate rewards.', details: error.message });
    }
});

// Endpoint to Update Contract XP for Logged-in User (Keep as is)
// This uses the LOGGED-IN USER's GitHub token to calculate XP and updates the contract.
app.post('/api/grant-github-xp', ensureAuthenticated, async (req, res) => {
    const githubUsername = req.user?.username;
    const accessToken = req.user?.accessToken; // Uses the LOGGED IN user's token
    console.log(`API CALL: POST /api/grant-github-xp (Update Contract XP) | GitHub User: ${githubUsername}`);
    const { walletAddress } = req.body;

    // --- Input Validation ---
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      console.error(`Validation Error (grant-github-xp): Invalid or missing wallet address: ${walletAddress}`);
      return res.status(400).json({ success: false, error: 'Valid Ethereum wallet address is required.' });
    }
    if (!githubUsername || !accessToken) {
      console.error(`Validation Error (grant-github-xp): Missing GitHub username or access token in session for user ${githubUsername}`);
      return res.status(401).json({ success: false, error: 'User GitHub authentication data missing or invalid.' });
    }
    console.log(`Validated Input (grant-github-xp): Wallet Address=${walletAddress} for user ${githubUsername}`);
    // --- End Validation ---

    try {
        // --- 1. Fetch GitHub Data using USER'S token ---
        // Assuming CJS: Use require for Octokit
        const { Octokit } = require("@octokit/rest");
        const octokit = new Octokit({ auth: accessToken });

        console.log(`(grant-github-xp) Fetching recent public events for user: ${githubUsername}`);
        // Example: Fetch recent events (adjust as needed)
        const response = await octokit.rest.activity.listPublicEventsForUser({
            username: githubUsername,
            per_page: 100, // Fetch up to 100 events
            page: 1
        });
        const eventCount = response.data.length;
        const calculatedXp = 50 * eventCount; // Your XP calculation logic
        console.log(`(grant-github-xp) Calculated XP: ${calculatedXp} (based on ${eventCount} events) for ${githubUsername}`);

        // --- 2. Blockchain Setup ---
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
        const xpUpdaterWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider); // Server's wallet
        const userDatabaseContract = new ethers.Contract(
            process.env.USER_DATABASE_CONTRACT_ADDRESS,
            UserDatabaseABI.abi,
            xpUpdaterWallet // Use server's wallet to sign the transaction
        );
        console.log(`(grant-github-xp) XP Updater wallet: ${xpUpdaterWallet.address}`);
        console.log(`(grant-github-xp) Target UserDatabase contract: ${await userDatabaseContract.getAddress()}`);

        // --- 3. Execute updateUserXP Transaction ---
        console.log(`(grant-github-xp) Calling updateUserXP(${walletAddress}, ${calculatedXp})`);
        const tx = await userDatabaseContract.updateUserXP(walletAddress, calculatedXp);
        console.log(`(grant-github-xp) Update Contract XP transaction sent for ${walletAddress}. Hash: ${tx.hash}`);

        res.status(200).json({
            success: true,
            message: `GitHub XP update (on-chain) initiated for wallet ${walletAddress}. Calculated XP: ${calculatedXp}.`,
            txHash: tx.hash,
            calculatedXP: calculatedXp
        });

    } catch (error) {
        console.error(`Error during /api/grant-github-xp for ${walletAddress} (User: ${githubUsername}):`, error);
        let statusCode = 500;
        let clientMessage = 'Failed to update XP due to a server error.';
        let reason = error.message || "Unknown error";
        // Add more detailed error checking if needed (e.g., contract revert reasons)
         res.status(statusCode).json({
            success: false,
            error: clientMessage,
            details: reason
        });
    }
});


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++ NEW: Backend Helper Function to Fetch GitHub Contributions +++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
async function fetchGithubContributionsForUser(username) {
    // Uses the secure BACKEND token, not the user's token
    if (!BACKEND_GITHUB_PAT) {
        console.error("CRITICAL: BACKEND_GITHUB_PAT is not configured on the backend.");
        return 0; // Return 0 contributions if token is missing
    }
     if (!username) {
        console.warn("fetchGithubContributionsForUser called with no username.");
        return 0; // Skip if no username
     }

    // Define GraphQL query (e.g., contributions in the last year)
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const toDate = today.toISOString();
    const fromDate = oneYearAgo.toISOString();

    const query = `
      query GetUserContributions($username: String!, $from: DateTime!, $to: DateTime!) {
        # Fetch user by login (username)
        user(login: $username) {
          # Get contributions within the specified date range
          contributionsCollection(from: $from, to: $to) {
            # Access the contribution calendar for the total count
            contributionCalendar {
              totalContributions
            }
          }
        }
      }
    `;
    const variables = { username: username, from: fromDate, to: toDate };

    try {
        // Use axios to make the POST request to GitHub's GraphQL endpoint
        const response = await axios.post(
            GITHUB_GRAPHQL_ENDPOINT,
            { query, variables }, // Request body contains query and variables
            {
                headers: {
                    'Authorization': `Bearer ${BACKEND_GITHUB_PAT}`, // Use the secure backend token
                    'Content-Type': 'application/json',
                    'Accept': 'application/json', // Specify expected response format
                },
                timeout: 15000 // Set a timeout (e.g., 15 seconds) to prevent hanging requests
            }
        );

        // Handle GraphQL errors returned within the 200 OK response
        if (response.data.errors) {
            console.error(`GitHub GraphQL error for user ${username}:`, JSON.stringify(response.data.errors));
            if (response.data.errors.some(e => e.type === 'NOT_FOUND')) {
                console.warn(`GitHub user ${username} not found via GraphQL.`);
            }
            return 0; // Return 0 contributions on GraphQL specific errors
        }

        // Safely access the nested contribution data using optional chaining (?.)
        // Default to 0 if any part of the path is null or undefined
        const totalContributions = response.data.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ?? 0;
        // Optional: Log success for debugging
        // console.log(`Successfully fetched contributions for ${username}: ${totalContributions}`);
        return totalContributions;

    } catch (error) {
        // Handle Axios request errors (network, timeout, HTTP status codes like 4xx/5xx)
        console.error(`Axios error fetching GitHub contribution stats for ${username}: ${error.message}`);
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
             console.error(`Timeout fetching GitHub data for ${username}.`);
        } else if (error.response) {
            // Log details if the error is from the GitHub API response
            console.error(`GitHub API HTTP Error for ${username}: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            // Handle specific statuses if needed (e.g., 401 bad token, 403 rate limit/forbidden)
        }
        return 0; // Return 0 contributions on any fetch error
    }
}


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++ NEW: API Endpoint for Frontend Leaderboard XP Fetch +++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Fetches GitHub XP for a list of users provided by the frontend.
// Uses the secure BACKEND_GITHUB_PAT, not individual user tokens.
// Does NOT require user authentication for this specific endpoint.
app.post('/api/leaderboard-xp', async (req, res) => {
    const { users } = req.body; // Expecting { users: [{ wallet: "0x...", username: "githubUser1"}, ...] }
    const startTime = Date.now(); // For timing the request

    // Basic validation of the incoming request body
    if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Invalid request body: "users" array expected.' });
    }
    // Check if the backend token is configured (essential for this endpoint)
    if (!BACKEND_GITHUB_PAT) {
         console.error("FATAL: BACKEND_GITHUB_PAT is not configured. Cannot fetch leaderboard XP.");
         return res.status(500).json({ error: 'Server configuration error preventing GitHub XP fetch.' });
    }

    console.log(`API CALL: POST /api/leaderboard-xp | Received request to fetch XP for ${users.length} users.`);

    try {
        // Use Promise.allSettled to fetch XP for all users concurrently.
        // This ensures that even if some GitHub API calls fail, others can succeed.
        const xpPromises = users.map(async (user) => {
            // Validate individual user object structure
            if (!user || !user.username || !user.wallet || !ethers.isAddress(user.wallet)) {
                console.warn("Skipping user in batch due to missing/invalid wallet or username:", user);
                // Provide a consistent structure for skipped/invalid entries
                return { wallet: user?.wallet || 'invalid_input', xp: 0, status: 'skipped' };
            }
            // Call the helper function to get contribution count
            const contributionCount = await fetchGithubContributionsForUser(user.username);
            // Calculate XP based on your defined formula
            const xp = contributionCount * 50; // Example: 50 XP per contribution
            // Return the result for this user
            return { wallet: user.wallet, xp: xp, status: 'fulfilled' };
        });

        // Wait for all promises to settle (either resolve successfully or fail)
        const results = await Promise.allSettled(xpPromises);

        // Process the settled results to create the final data array
        const xpData = results.map(result => {
             if (result.status === 'fulfilled') {
                 // If the promise was fulfilled, return its value ({ wallet, xp, status })
                 return result.value;
             } else {
                 // If a promise rejected unexpectedly (should be rare if helper catches errors)
                 console.error("Unexpected promise rejection during batch XP fetch:", result.reason);
                 // You might want to log this, but return a default structure
                 // Trying to find the wallet here is difficult, so use a placeholder
                 return { wallet: 'unknown_error', xp: 0, status: 'rejected' };
             }
         }).filter(data => data.wallet !== 'unknown_error'); // Filter out any unexpected errors


        const duration = Date.now() - startTime;
        console.log(`Backend successfully processed XP batch request for ${xpData.length} users in ${duration}ms.`);
        // Send the processed XP data back to the frontend
        res.json({ xpData: xpData }); // Response structure: { xpData: [{ wallet, xp, status }, ...] }

    } catch (error) {
        // Catch errors in the overall batch processing logic (e.g., issues with Promise.allSettled itself)
        console.error("Critical error processing GitHub XP batch request:", error);
        res.status(500).json({ error: 'Failed to process GitHub XP data due to an internal server error.' });
    }
});


// Add these endpoints to your server.js

// server.js


// ... other imports and setup ...

app.get('/api/pending-withdrawals', async (req, res) => {
    // ensureAuthenticated checks GitHub login, which might be okay for basic auth,
    // but the core logic doesn't depend on req.user for *fetching* data anymore.
    console.log("API CALL: GET /api/pending-withdrawals"); // Log entry

    try {
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
        const rewardContract = new ethers.Contract(
            process.env.REWARD_CONTRACT_ADDRESS,
            RewardMechanismABI.abi,
            provider // Use provider for read-only calls
        );

        // --- REMOVED OWNER CHECK ---
        // The frontend handles showing this section only to the connected owner.
        // This endpoint just fetches the data.

        console.log(`Fetching WithdrawalRequested events from ${process.env.REWARD_CONTRACT_ADDRESS}...`);
        const filter = rewardContract.filters.WithdrawalRequested();
        // Consider limiting the block range if performance becomes an issue,
        // but fetching all is simpler for now if event count is manageable.
        const events = await rewardContract.queryFilter(filter);
        console.log(`Found ${events.length} historical WithdrawalRequested events.`);

        if (events.length === 0) {
            console.log("No historical requests found. Returning empty list.");
            return res.json({ pendingRequests: [] });
        }

        console.log("Checking current status for each unique user from historical requests...");
        const uniqueRequesters = [...new Set(events.map(event => event.args.user))]; // Get unique addresses
        console.log(`Checking status for ${uniqueRequesters.length} unique requesters.`);

        const pendingRequestsPromises = uniqueRequesters.map(async (userAddr) => {
            try {
                // Fetch the CURRENT request state directly using the public mapping getter
                const requestState = await rewardContract.withdrawalRequests(userAddr);
                // requestState is a struct/tuple like: { amount: value, isPending: boolValue } or [value, boolValue]
                // Access the isPending flag correctly based on how ethers returns it (usually by name or index)
                const isPending = requestState.isPending; // Or requestState[1] if returned as array

                if (isPending) {
                    // Find the *latest* event for this user to get a relevant timestamp/txHash if needed
                    const latestEvent = events
                        .filter(e => e.args.user === userAddr)
                        .sort((a, b) => b.blockNumber - a.blockNumber)[0]; // Get latest event for this user

                    const block = await latestEvent.getBlock(); // Fetch block details for timestamp

                    console.log(` -> Pending request found for ${userAddr}, Amount: ${ethers.formatUnits(requestState.amount, 18)}`);
                    return {
                        user: userAddr,
                        amount: ethers.formatUnits(requestState.amount, 18), // Use amount from current state
                        // Use timestamp/txHash from the latest relevant event
                        requestTimestamp: block ? block.timestamp : Math.floor(Date.now() / 1000), // Fallback timestamp
                        txHash: latestEvent ? latestEvent.transactionHash : 'N/A',
                        isPending: true
                    };
                } else {
                    // console.log(` -> Request NOT pending for ${userAddr}`); // Optional log
                    return null; // Indicate not currently pending
                }
            } catch (err) {
                 console.error(`Error checking status for user ${userAddr}:`, err.message);
                 return null; // Treat errors as not pending for safety
            }
        });

        // Wait for all status checks to complete
        const results = await Promise.all(pendingRequestsPromises);

        // Filter out the null entries (requests that are no longer pending or failed)
        const currentlyPending = results.filter(r => r !== null);
        console.log(`Found ${currentlyPending.length} currently pending requests.`);

        res.json({ pendingRequests: currentlyPending });

    } catch (error) {
        console.error("Error fetching pending withdrawals:", error);
        res.status(500).json({
            error: 'Failed to fetch pending withdrawals',
            details: error.message // Send error details (consider hiding in production)
        });
    }
});

// --- Ensure the /api/approve-withdrawal endpoint is correct ---
// server.js - /api/approve-withdrawal

app.post('/api/approve-withdrawal', async (req, res) => {
    console.log("API CALL: POST /api/approve-withdrawal - START");
    try {
        const { userAddress } = req.body;
        if (!userAddress || !ethers.isAddress(userAddress)) {
            console.error(">>> Validation FAIL: Invalid userAddress:", userAddress); // Added log
            return res.status(400).json({ error: 'Invalid userAddress provided.' });
        }
        console.log(">>> Validation OK: userAddress =", userAddress); // Added log

        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const rewardContract = new ethers.Contract(
            process.env.REWARD_CONTRACT_ADDRESS,
            RewardMechanismABI.abi,
            signer
        );
        console.log(`>>> Signer Address: ${signer.address}, Contract: ${process.env.REWARD_CONTRACT_ADDRESS}`); // Added log

        console.log(">>> Checking owner..."); // Added log
        const owner = await rewardContract.owner();
        console.log(`>>> Owner from Contract: ${owner}`); // Added log
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.error(`>>> Owner Verification FAIL: Signer ${signer.address} != Owner ${owner}`); // Added log
            return res.status(403).json({ error: 'Backend signer is not authorized to approve withdrawals.' });
        }
        console.log(">>> Owner Verification OK"); // Added log

        console.log(`>>> Checking request status for ${userAddress}...`); // Added log
        const request = await rewardContract.withdrawalRequests(userAddress);
        console.log(`>>> Request Status from Contract: isPending=${request.isPending}`); // Added log
        if (!request.isPending) {
            console.warn(`>>> Pending Check FAIL: Request not pending for ${userAddress}.`); // Added log
            return res.status(400).json({ error: 'No pending request found for this user to approve.' });
        }
        console.log(`>>> Pending Check OK: Request is pending. Amount: ${ethers.formatUnits(request.amount, 18)}`); // Added log

        console.log(`>>> Attempting TO SEND approval transaction for ${userAddress}...`); // Added log
        // ****** THE ACTION ******
        const tx = await rewardContract.approveWithdrawal(userAddress);
        // ****** If it gets past here, the next log WILL appear ******

        console.log(`>>> Approval transaction SENT. Hash: ${tx.hash}.`); // << THE MISSING LOG

        res.json({
            success: true,
            message: `Withdrawal approval transaction sent for ${userAddress}`,
            txHash: tx.hash
        });
        console.log("API CALL: POST /api/approve-withdrawal - SUCCESS"); // Added log

    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("API CALL: POST /api/approve-withdrawal - CAUGHT ERROR");
        console.error("Error Type:", error.constructor.name);
        // Log specific useful properties if they exist
        if(error.code) console.error("Error Code:", error.code); // e.g., INSUFFICIENT_FUNDS, CALL_EXCEPTION, UNSUPPORTED_OPERATION
        if(error.reason) console.error("Error Reason:", error.reason); // Revert reason if it's a CALL_EXCEPTION
        if(error.transaction) console.error("Error Transaction Data:", error.transaction); // Contains details like to, from, data, nonce
        if(error.receipt) console.error("Error Receipt:", error.receipt); // Populated if tx was mined but failed
        console.error("Error Message:", error.message);
        console.error("Full Error Stack:", error.stack); // Full trace
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        const reason = error.reason || error.message || 'Unknown error'; // Extract reason if possible
        res.status(500).json({
            error: 'Failed to approve withdrawal',
            details: reason
        });
    }
});
// --- Generic Error Handler (Keep this LAST) ---
// Catches any errors not handled by specific route handlers
app.use((err, req, res, next) => {
  console.error('Unhandled error caught by final handler:', err.stack || err); // Log the full error stack
  // Send a generic error message to the client, especially in production
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;
  // Use error status code if available, otherwise default to 500
  res.status(err.status || 500).json({ error: message });
});


// --- Server Start Logic ---
app.listen(PORT, () => {
  console.log(`\n✅ Express Server listening on http://localhost:${PORT}`);
  console.log(`--------------------------------------------------`);
  console.log(`🔑 Reward Contract Address: ${process.env.REWARD_CONTRACT_ADDRESS}`);
  console.log(`🔑 User Database Address: ${process.env.USER_DATABASE_CONTRACT_ADDRESS}`);
  console.log(`🔑 Server Wallet Address (for Tx): ${new ethers.Wallet(process.env.PRIVATE_KEY).address}`);
  // Log confirmation that the backend PAT is loaded (or warn if not)
  if(BACKEND_GITHUB_PAT) {
      console.log(`🔑 Backend GitHub PAT: Loaded (ends with ...${BACKEND_GITHUB_PAT.slice(-4)})`);
  } else {
      // This case should be prevented by the initial env var check, but good redundancy
      console.error(`❌ CRITICAL WARNING: Backend GitHub PAT is NOT LOADED! Leaderboard XP fetch will fail.`);
  }
   console.log(`--------------------------------------------------\n`);
});