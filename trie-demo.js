/* ============================================================
   TRIE AUTOCOMPLETE DEMO WITH SVG VISUALIZATION
   ============================================================ */

// 1. TRIE DATA STRUCTURES AND METHODS

class TrieNode { // represents each node in the trie
    constructor() {
        this.children = {};
        this.isEnd = false;
        this.freq = 0; // frequency for weighted suggestions
    }
}

class Trie { // main trie structure
    constructor() {
        this.root = new TrieNode();
    }

    insert(word, frequency = 1) { // insert word with optional frequency
        let node = this.root;
        let path = "";
        for (let char of word.toLowerCase()) {
            path += char;
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
                node.children[char].path = path; // store path for tooltip
            }
            node = node.children[char];
        }
        node.isEnd = true;
        node.freq += frequency;
        node.path = word; // full word at end node
    }

    autocomplete(prefix) { // return list of words with given prefix
        prefix = prefix.toLowerCase();
        let node = this.root;

        for (let char of prefix) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }

        return this._collect(node, prefix) // gather words from this node
            .sort((a, b) => b.freq - a.freq || a.word.localeCompare(b.word))
            .map(x => x.word);
    }

    _collect(node, prefix) { // helper to collect words from a given node
        let results = [];

        if (node.isEnd) results.push({ word: prefix, freq: node.freq });

        for (let char in node.children) {
            results.push(...this._collect(node.children[char], prefix + char));
        }

        return results;
    }
}

// 2. HELPER: GET WORD FROM ROOT TO NODE (FOR TOOLTIP)
// keeping this simple by implementing DFS search
// but big tries may need parent pointers for efficiency and avoid nodes overlapping
// and horizontal overflow explosion
// Not critical for demo performance

function getWordFromNode(targetNode, root) { // DFS to find path from root to targetNode
    let word = '';
    let found = false;

    function dfs(node, path) { // depth-first search
        if (found) return;

        if (node === targetNode) {
            word = path;
            found = true;
            return;
        }

        for (let key in node.children) { // explore children
            dfs(node.children[key], path + key);
        }
    }

    dfs(root, '');
    return word;
}

// 3. INITIALIZE TRIE WITH SAMPLE WORDS

const trie = new Trie();

// Sample words with varying frequencies
const words = [
    "apple", "app", "application", "apply", "approve",
    "banana", "band", "bandwidth", "banter",
    "bat", "ball", "batman",
    "cat", "cater", "caterpillar",
    "cyber", "cybersecurity",
    "coding", "data", "database",
    "developer", "devops",
    "dog", "dodge", "doll",
    "encrypt", "encryption",
    "elephant", "elegant", "elevator",
    "energy", "engine", "engineer"
];

words.forEach(w => trie.insert(w)); // equal frequency for simplicity

// 4. AUTOCOMPLETE UI LOGIC

const input = document.getElementById('trie-input');
const suggestions = document.getElementById('suggestions');

input.addEventListener('input', () => { // on input change
    const query = input.value.trim().toLowerCase();

    suggestions.innerHTML = "";
    if (query.length === 0) return;

    const matches = trie.autocomplete(query).slice(0, 10);

    if (matches.length === 0) { // no matches found
        const li = document.createElement("li");
        li.classList.add("no-results");
        li.textContent = "No matches found";
        suggestions.appendChild(li);
        return;
    }

    matches.forEach(word => { // create suggestion items
        const li = document.createElement("li");

        // Highlight prefix
        li.innerHTML =
            `<strong>${query}</strong>${word.slice(query.length)}`;

        li.addEventListener("click", () => {
            input.value = word;
            suggestions.innerHTML = "";
        });

        suggestions.appendChild(li);
    });
});

// Close suggestions when clicking outside
document.addEventListener("click", (e) => {
    if (!document.querySelector(".autocomplete-box").contains(e.target)) {
        suggestions.innerHTML = "";
    }
});

// 5. SVG TRIE DIAGRAM RENDERING

const svgNS = "http://www.w3.org/2000/svg";
const nodeElementsMap = new Map(); // needed for highlight

function drawTrieSVG(trie, svgId) { // render trie structure as SVG
    const svg = document.getElementById(svgId);
    svg.innerHTML = "";
    nodeElementsMap.clear();

    const nodeRadius = 18;
    const horizontalSpacing = 60;
    const verticalSpacing = 60;

    // Calculate layout positions
    function layout(node, depth = 0, x = 0, parentLetter = '', positions = []) {
        const keys = Object.keys(node.children);

        if (keys.length === 0) {
            positions.push({ node, x, depth, letter: parentLetter });
            return positions;
        }

        let startX = x;
        let childX = x;

        for (let key of keys) {
            positions = layout(node.children[key], depth + 1, childX, key, positions);
            childX += horizontalSpacing;
        }

        const midX = (startX + childX - horizontalSpacing) / 2;
        positions.push({ node, x: midX, depth, letter: parentLetter });

        return positions;
    }

    const positions = layout(trie.root); // get all node positions

    // Size SVG
    const maxX = Math.max(...positions.map(p => p.x)) + nodeRadius * 3;
    const maxDepth = Math.max(...positions.map(p => p.depth)) + 1;

    svg.setAttribute('width', maxX);
    svg.setAttribute('height', maxDepth * verticalSpacing + nodeRadius * 2);

    // Draw edges
    positions.forEach(pos => {
        for (let key in pos.node.children) { // draw line to each child
            const child = pos.node.children[key];
            const childPos = positions.find(p => p.node === child);

            if (!childPos) continue;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', pos.x);
            line.setAttribute('y1', pos.depth * verticalSpacing + nodeRadius);
            line.setAttribute('x2', childPos.x);
            line.setAttribute('y2', childPos.depth * verticalSpacing - nodeRadius);
            line.setAttribute('stroke', '#4da6ff');
            line.setAttribute('stroke-width', 2);

            svg.appendChild(line);
        }
    });

    // Draw nodes
    positions.forEach(pos => {
        const { node, x, depth, letter } = pos;

        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', depth * verticalSpacing);
        circle.setAttribute('r', nodeRadius);
        circle.setAttribute(
            'fill',
            node.isEnd ? '#4da6ff' : '#11141a'
        );
        circle.setAttribute('stroke', '#4da6ff');
        circle.setAttribute('stroke-width', 2);

        svg.appendChild(circle);

        // Letter label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', depth * verticalSpacing + 5);
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '12');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = letter || '•';

        svg.appendChild(text);

        // Tooltip
        if (node.isEnd) {
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = node.path; // use stored path (this becomes O(1) and is better for larger tries as opposed to O(N) DFS search)
            circle.appendChild(title);
        }

        nodeElementsMap.set(node, circle);
    });
}

// 6. INPUT-BASED PATH HIGHLIGHTING

input.addEventListener('input', () => { // on input change
    const query = input.value.trim().toLowerCase();

    // reset all nodes
    nodeElementsMap.forEach((circle, node) => {
        circle.setAttribute('fill', node.isEnd ? '#4da6ff' : '#11141a');
    });

    if (!query) return;

    let node = trie.root;
    for (let char of query) {
        if (!node.children[char]) return;
        node = node.children[char];

        const circle = nodeElementsMap.get(node);
        if (circle) circle.setAttribute('fill', 'var(--accent)'); // highlight
    }
});

// 7. KEYBOARD NAVIGATION FOR SUGGESTIONS

let selectedIndex = -1;

input.addEventListener("keydown", (e) => { // handle arrow keys and enter
    const items = Array.from(suggestions.querySelectorAll("li"));

    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % items.length;
    } 
    else if (e.key === "ArrowUp") {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    } 
    else if (e.key === "Enter" && selectedIndex >= 0) {
        input.value = items[selectedIndex].innerText;
        suggestions.innerHTML = "";
        selectedIndex = -1;
        return;
    } 
    else {
        return;
    }

    items.forEach((item, i) =>
        item.classList.toggle("active", i === selectedIndex)
    );
});

// 8. DRAW TRIE SVG ON PAGE LOAD

drawTrieSVG(trie, 'trie-svg'); // render trie diagram

