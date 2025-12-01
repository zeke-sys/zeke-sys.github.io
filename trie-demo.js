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

// drawing the trie structure in SVG
const svgNS = "http://www.w3.org/2000/svg";

function drawTrieSVG(trie, svgId) {
    const svg = document.getElementById(svgId);
    svg.innerHTML = ""; // Clear previous

    const nodeRadius = 18;
    const horizontalSpacing = 60;
    const verticalSpacing = 60;

    // Recursive function to layout nodes
    function layout(node, depth = 0, x = 0, positions = []) {
        let childrenKeys = Object.keys(node.children);
        if (childrenKeys.length === 0) {
            positions.push({node, x, depth});
            return positions;
        }

        let childX = x;
        for (let key of childrenKeys) {
            positions = layout(node.children[key], depth + 1, childX, positions);
            childX += horizontalSpacing;
        }
        positions.push({node, x: (x + childX - horizontalSpacing)/2, depth});
        return positions;
    }

    const positions = layout(trie.root);

    // Draw lines first
    positions.forEach(pos => {
        const parent = pos.node;
        const parentPos = pos;
        for (let key in parent.children) {
            const childNode = parent.children[key];
            const childPos = positions.find(p => p.node === childNode);
            if (childPos) {
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', parentPos.x);
                line.setAttribute('y1', parentPos.depth * verticalSpacing + nodeRadius);
                line.setAttribute('x2', childPos.x);
                line.setAttribute('y2', childPos.depth * verticalSpacing - nodeRadius);
                line.setAttribute('stroke', '#4da6ff');
                line.setAttribute('stroke-width', 2);
                svg.appendChild(line);
            }
        }
    });

    // Draw nodes
    positions.forEach(pos => {
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.depth * verticalSpacing);
        circle.setAttribute('r', nodeRadius);
        circle.setAttribute('fill', pos.node.isEnd ? '#4da6ff' : '#11141a');
        circle.setAttribute('stroke', '#4da6ff');
        circle.setAttribute('stroke-width', 2);
        svg.appendChild(circle);

        // Label (use letters if not root)
        if (pos.node !== trie.root) {
            const letter = Object.entries(pos.node.children).find(([k, n]) => n === pos.node);
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.depth * verticalSpacing + 5);
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-size', '12');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = letter ? letter[0] : '';
            svg.appendChild(text);
        }
    });
}

// Call after Trie is populated
drawTrieSVG(trie, 'trie-svg');

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