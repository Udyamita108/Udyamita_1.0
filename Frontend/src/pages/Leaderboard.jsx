// src/components/Leaderboard.jsx (or appropriate path)

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ethers } from "ethers";
import axios from 'axios'; // <<< Import axios for backend API calls
import UserDatabaseABI from "../abis/UserDatabase.json"; // <<< Ensure this path is correct
import Navbar from "@/components/Navbar.jsx"; // <<< Ensure this path is correct

// <<< Ensure this is the correct address of your deployed UserDatabase contract >>>
const CONTRACT_ADDRESS = "0xe92cFff8436007F804F2ec05AF83851AD3dA9945";

// <<< Define your backend API URL (use environment variable in a real app) >>>
// Make sure this matches the port your backend server is running on (default 5000 in server.js)
const BACKEND_API_URL ='http://localhost:5000';

const Leaderboard = () => {
  // --- State Variables ---
  const [users, setUsers] = useState([]); // Holds the final merged user data for display
  const [loading, setLoading] = useState(true); // Tracks overall loading state
  const [error, setError] = useState(null); // Stores any error messages

  // --- Refs for Ethers objects ---
  const contractRef = useRef(null);
  const providerRef = useRef(null);

  // --- Memoized fetchUsers Function (Modified Logic) ---
  const fetchUsers = useCallback(async (isInitialFetch = false) => {
    if (isInitialFetch) {
      setLoading(true);
      setError(null); // Clear previous errors on a fresh initial load
    }
    console.log("Leaderboard Fetch Sequence: Starting...");

    let baseUsersFromContract = []; // To store users fetched from contract

    try {
      // === STEP 1: Initialize Ethers Provider and Contract (if needed) ===
      if (!contractRef.current) {
        if (!window.ethereum) {
          // Use a specific error message or state for this case
          throw new Error("MetaMask (or other Web3 provider) not detected. Please install it to view the leaderboard.");
        }
        // Initialize provider and contract instance
        providerRef.current = new ethers.BrowserProvider(window.ethereum);
        contractRef.current = new ethers.Contract(
          CONTRACT_ADDRESS,
          UserDatabaseABI.abi,
          providerRef.current // Connect provider for read-only calls
        );
        console.log("Leaderboard Fetch Sequence: Provider and Contract initialized.");
      }

      // === STEP 2: Fetch Base User Data from Smart Contract ===
      console.log("Leaderboard Fetch Sequence: Calling contract getAllUsers()...");
      // Call the read-only function on the contract
      const allUsersRaw = await contractRef.current.getAllUsers();
      console.log("Leaderboard Fetch Sequence: Raw data received from contract:", allUsersRaw);

      // Handle case where contract returns no users
      if (!allUsersRaw || allUsersRaw.length === 0) {
        console.log("Leaderboard Fetch Sequence: No users found in the smart contract.");
        setUsers([]); // Set state to empty array
        // No need to call backend if there are no users
        if (isInitialFetch) setLoading(false);
        return; // Exit the function early
      }

      // === STEP 3: Prepare User List for Backend XP Fetch ===
      // Map the raw contract data to a cleaner format and filter out invalid entries
      const usersForBackend = allUsersRaw.map(rawUser => {
          // Basic validation and extraction
          const wallet = rawUser.wallet && rawUser.wallet !== ethers.ZeroAddress ? rawUser.wallet : null;
          const username = rawUser.username || null; // Get GitHub username
          return { wallet, username };
        })
        .filter(user => user.wallet && user.username); // IMPORTANT: Only include users with both wallet AND GitHub username

      // Store the more complete user data from the contract temporarily for later merging
      baseUsersFromContract = allUsersRaw.map(rawUser => ({
        wallet: rawUser.wallet && rawUser.wallet !== ethers.ZeroAddress ? rawUser.wallet : "N/A",
        username: rawUser.username || "Unknown", // Display "Unknown" if username missing
        // You could potentially keep the contract XP here too if desired for comparison/fallback
        // contractXP: Number(rawUser.xp || 0)
      })).filter(user => user.wallet !== "N/A"); // Filter out zero addresses


      // Handle case where no users have valid wallet/username combination
      if (usersForBackend.length === 0) {
        console.log("Leaderboard Fetch Sequence: No users with valid wallet and username found after filtering contract data.");
        // Display the users found, but they will have 0 XP
        setUsers(baseUsersFromContract.map(u => ({ ...u, xp: 0 })).sort((a, b) => b.xp - a.xp));
        if (isInitialFetch) setLoading(false);
        return; // Exit if no users to query backend for
      }

      // === STEP 4: Fetch XP Data from Backend API ===
      console.log(`Leaderboard Fetch Sequence: Calling backend API '/api/leaderboard-xp' for ${usersForBackend.length} users...`);
      // Make the POST request to your backend endpoint
      const backendResponse = await axios.post(
        `${BACKEND_API_URL}/api/leaderboard-xp`, // Your backend endpoint URL
        { users: usersForBackend } // Send the list: [{ wallet, username }, ...]
      );

      // Extract the XP data from the backend response
      const xpDataFromBackend = backendResponse.data.xpData; // Expecting { xpData: [{ wallet, xp, status }, ...] }
      console.log("Leaderboard Fetch Sequence: XP data received from backend:", xpDataFromBackend);

      // Validate the backend response structure
      if (!xpDataFromBackend || !Array.isArray(xpDataFromBackend)) {
        console.error("Leaderboard Fetch Sequence: Invalid XP data format received from backend:", xpDataFromBackend);
        throw new Error("Received invalid XP data format from the server.");
      }

      // === STEP 5: Merge Contract Data and Backend XP Data ===
      // Create a Map for efficient lookup of XP by wallet address
      const xpMap = new Map();
      xpDataFromBackend.forEach(item => {
        if (item.wallet && typeof item.xp === 'number') {
           xpMap.set(item.wallet, item.xp);
        }
      });

      // Merge the XP data into the base user list from the contract
      const mergedUsers = baseUsersFromContract.map(user => {
        // Find the XP for this user's wallet in the map, default to 0 if not found
        const githubXP = xpMap.get(user.wallet) ?? 0;
        return {
          ...user, // Keep original wallet, username from contract
          xp: githubXP // Assign the XP fetched from the backend
        };
      });

      // === STEP 6: Sort by GitHub XP and Update State ===
      const sortedUsers = mergedUsers.sort((a, b) => b.xp - a.xp); // Sort in descending order of XP

      console.log("Leaderboard Fetch Sequence: Final merged and sorted user list:", sortedUsers);
      setUsers(sortedUsers); // Update the state with the final list
      setError(null); // Clear any previous errors on success

    } catch (fetchError) {
      // --- Comprehensive Error Handling ---
      console.error("Error during leaderboard data fetch sequence:", fetchError);
      let friendlyMessage = "Failed to load leaderboard data. Please try again later."; // Default message

      if (fetchError.message.includes("MetaMask") || fetchError.message.includes("Web3 provider not found")) {
          friendlyMessage = fetchError.message; // Show specific provider error
      } else if (axios.isAxiosError(fetchError)) {
          // Handle errors from the backend API call
          if (fetchError.response) {
              // Error response received from backend
              console.error("Backend API Error:", fetchError.response.status, fetchError.response.data);
              friendlyMessage = `Failed to fetch XP data from server: ${fetchError.response.data?.error || fetchError.response.statusText}`;
          } else if (fetchError.request) {
              // Request made but no response received (network error, backend down?)
              console.error("Backend API Error: No response received.");
              friendlyMessage = "Could not connect to the server to fetch XP data. Please check your network or try again later.";
          } else {
              // Other Axios setup errors
              friendlyMessage = `Error setting up request to fetch XP: ${fetchError.message}`;
          }
      } else if (fetchError.message.includes("contract call") || fetchError.code) {
           // Handle potential Ethers/contract errors (may need more specific checks based on error codes)
           console.error("Smart Contract Error:", fetchError);
           friendlyMessage = `Error communicating with the smart contract: ${fetchError.reason || fetchError.message}`;
      } else {
          // Generic errors
          friendlyMessage = fetchError.message || friendlyMessage;
      }

      setError(friendlyMessage); // Set the user-friendly error message state
      setUsers([]); // Clear potentially stale user data on error

    } finally {
      // Ensure loading state is turned off after initial fetch attempt (success or failure)
      if (isInitialFetch) {
        setLoading(false);
      }
      console.log("Leaderboard Fetch Sequence: Finished.");
    }
  }, []); // Dependency array is empty as it relies on refs and constants


  // --- Effect for Initialization and Contract Event Listening ---
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const setupContractAndListener = async () => {
      try {
        // --- Contract/Provider Setup (mostly handled by fetchUsers now) ---
        // We still need the contract instance for the listener
        if (!window.ethereum) {
            // Set error immediately if provider is missing on mount
            if (isMounted) setError("MetaMask (or other Web3 provider) not detected. Please install it.");
            setLoading(false); // Stop loading indicator
            return;
        }
        // Ensure contractRef is initialized for listener attachment
        if (!contractRef.current) {
             providerRef.current = new ethers.BrowserProvider(window.ethereum);
             contractRef.current = new ethers.Contract(CONTRACT_ADDRESS, UserDatabaseABI.abi, providerRef.current);
             console.log("Contract reference initialized in useEffect for listener setup.");
        }

        // --- Initial Data Fetch ---
        // Call the main fetch function on component mount
        if (isMounted) {
          await fetchUsers(true); // Pass true for initial fetch
        }

        // --- Setup Contract Event Listener ---
        // Listen for the 'UserXPUpdated' event emitted by the contract
        const handleXpUpdate = (userAddress, newTotalXP_ignored, event) => {
          // NOTE: The newTotalXP from the event is now primarily a trigger,
          // as the actual XP displayed comes from the backend GitHub fetch.
          console.log(`✅ Event Received: UserXPUpdated | User: ${userAddress}. Triggering leaderboard refresh...`);
          if (isMounted) {
            // Re-fetch ALL data (contract list + backend XP) when the event occurs
            fetchUsers(false); // Pass false as it's not the initial load
          }
        };

        const eventName = 'UserXPUpdated';
        console.log(`Attaching listener for contract event: '${eventName}'`);
        // Ensure contractRef.current is valid before attaching listener
        if(contractRef.current) {
            contractRef.current.on(eventName, handleXpUpdate);
        } else {
            console.error("Cannot attach listener: Contract reference is not available.");
            // Might set an error state here if listening is critical
        }

      } catch (initError) {
        // Catch errors during the initial setup (provider/contract init)
        console.error("Error during leaderboard initialization or listener setup:", initError);
        if (isMounted) {
          // Set appropriate error state
          setError(initError.message || "Initialization failed. Please ensure MetaMask is connected and refresh.");
          setLoading(false); // Stop loading
        }
      }
    };

    setupContractAndListener();

    // --- Cleanup Function ---
    // This runs when the component unmounts
    return () => {
      isMounted = false; // Set flag to false
      console.log("Cleaning up Leaderboard component: Removing event listener...");
      // Remove the event listener to prevent memory leaks
      if (contractRef.current) {
        try {
          const eventName = 'UserXPUpdated';
          contractRef.current.removeAllListeners(eventName); // Remove listener for the specific event
          console.log(`Listener for '${eventName}' removed.`);
        } catch (cleanupError) {
          console.error("Error removing contract event listener during cleanup:", cleanupError);
        }
      }
    };
  }, [fetchUsers]); // Include fetchUsers in dependency array because it's memoized with useCallback


  // --- Rendering Logic ---
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Include Navbar component */}
      <Navbar />

      {/* Main content container */}
      <div className="container mx-auto p-4 md:p-6 flex-grow">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">Leaderboard</h1>

        {/* --- Conditional Rendering for Loading, Error, and Empty States --- */}
        {loading && (
          <p className="text-center text-lg text-blue-600 dark:text-blue-400">
            <svg aria-hidden="true" className="inline w-6 h-6 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"> {/* Simple spinner */}
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            Loading Leaderboard... Please wait.
          </p>
        )}
        {error && (
          <div className="text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 border border-red-500 dark:border-red-700 p-4 rounded-md shadow-md" role="alert">
             <span className="font-semibold">Error:</span> {error}
          </div>
        )}
        {!loading && !error && users.length === 0 && (
           <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
             No users found on the leaderboard, or data could not be loaded. Ensure users have registered and linked their GitHub account.
           </p>
        )}

        {/* --- Table Display (Only when not loading, no errors, and users exist) --- */}
        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
              {/* Table Head */}
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center w-16 font-semibold">Rank</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Username</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Wallet Address</th>
                  {/* Updated XP Column Header */}
                  <th scope="col" className="px-6 py-3 text-right font-semibold">XP (GitHub)</th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody>
                {/* Map through the sorted users state */}
                {users.map((user, index) => (
                  <tr
                    key={user.wallet || index} // Use wallet as key, fallback to index
                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 ease-in-out"
                  >
                    {/* Rank */}
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-white text-center w-16">
                      {index + 1}
                    </td>
                    {/* Username */}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {user.username}
                    </td>
                    {/* Wallet Address (Truncated for display) */}
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs md:max-w-sm lg:max-w-md">
                      {user.wallet}
                    </td>
                    {/* XP (from backend merge) */}
                    <td className="px-6 py-4 font-bold text-right text-indigo-600 dark:text-indigo-400">
                      {user.xp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div> {/* End container */}
    </div> // End main div
  );
};

export default Leaderboard;