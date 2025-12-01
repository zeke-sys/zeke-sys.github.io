// Simple Trie implementation for demo purposes
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
        this.freq = 0; // Frequency count for predictive modeling
    }
}

// Trie class with insert and autocomplete methods
class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    insert(word, frequency = 1) {
        let node = this.root;
        for (let char of word.toLowerCase()) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEnd = true;
        node.freq += frequency; // Increment frequency count
    }

    // Returns all words in the trie that start with the given prefix
    autocomplete(prefix) {
        let node = this.root;
        prefix = prefix.toLowerCase();

        for (let char of prefix.toLowerCase()) { // Traverse to the end of the prefix
            if (!node.children[char]) return [];
            node = node.children[char];
        }
        return this._collect(node, prefix.toLowerCase())
            .sort((a, b) => b.freq - a.freq || a.word.localeCompare(b.word)) // Sort by frequency and alphabetically
            .map(x => x.word);
    }

    _collect(node, prefix) { // Helper function to collect all words from a given node
        let results = [];
        if (node.isEnd) results.push({word: prefix, freq: node.freq});

        for (let char in node.children) {
            results.push(...this._collect(node.children[char], prefix + char));
        }
        return results;
    }
}

// ----------------------------------------------
// Loading small dictionary and setting up autocomplete demo
// ----------------------------------------------

const trie = new Trie();

// Sample word list for demo purposes
const words = ["apple", "app", "application", "apply", "approve", "banana", "band", 
    "bandwidth", "banter", "bat", "ball", "batman", "cat", "cater", "caterpillar", "cyber", 
    "cybersecurity", "coding", "data", "database", "developer", "devops", "dog", "dodge", "doll",
    "encrypt", "encryption", "elephant", "elegant", "elevator", "energy", "engine", "engineer"
];

words.forEach(w => trie.insert(w));

// DOM Elements
const input = document.getElementById('trie-input');
const suggestions = document.getElementById('suggestions');

input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase(); // Get current input

    suggestions.innerHTML = ""; // Clear previous suggestions
    if (query.length === 0) return;

    const matches = trie.autocomplete(query).slice(0, 10); // Limit to top 10 suggestions

    // Display suggestions
    if (matches.length === 0) {
        const li = document.createElement("li");
        li.classList.add("no-results");
        li.textContent = "No matches found";
        suggestions.appendChild(li);
        return;
    }

    matches.forEach(word => {
        const li = document.createElement("li");
        // highlight matching prefix
        li.innerHTML = `<strong>${query}</strong>{word.slice(query.length)}`; // bold the matching part

        li.addEventListener("click", () => {
            input.value = word;
            suggestions.innerHTML = "";
        });

        suggestions.appendChild(li);
    });
});

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
    if (!document.querySelector(".autocomplete-box").contains(e.target)) {
        suggestions.innerHTML = "";
    }
});

// keyboard navigation for suggestions
let selectedIndex = -1;

input.addEventListener("keydown", (e) => { // handle arrow keys and enter
    const items = Array.from(suggestions.querySelectorAll("li"));
    if (e.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter" && selectedIndex >= 0) {
        input.value = items[selectedIndex].innerText;
        suggestions.innerHTML = "";
        selectedIndex = -1;
        return;
    } else {
        return; // exit if other keys
    }

    items.forEach((item, idx) => // update active class
        item.classList.toggle("active", idx === selectedIndex)
    );
});

// End of Trie demo code