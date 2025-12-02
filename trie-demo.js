/* ============================================================
   TRIE AUTOCOMPLETE DEMO WITH SVG VISUALIZATION
   ============================================================ */

// 1. TRIE DATA STRUCTURES AND METHODS

class TrieNode { // represents each node in the trie
    constructor() {
        this.children = {};
        this.isEnd = false;
        this.freq = 0; // frequency for weighted suggestions
        this.weight = 0; // cumulative weight for subtree
        this.path = ''; // path set during insert
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
                node.children[char].path = path; // store path fragment for tooltip/help
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
            .sort((a, b) => {
                const aw = (a.freq + (a.weight || 0));
                const bw = (b.freq + (b.weight || 0));
                if (bw !== aw) return bw - aw; // weighted frequency
                return a.word.localeCompare(b.word); // alphabetical
            })
            .map(x => x.word);
    }

    _collect(node, prefix) { // helper to collect words from a given node
        let results = [];

        if (node.isEnd) results.push({ word: prefix, freq: node.freq, weight: node.weight });

        for (let char in node.children) {
            results.push(...this._collect(node.children[char], prefix + char));
        }

        return results;
    }

    // get node directly (for highlighting)
    getNode(word) {
        let node = this.root;
        for (let char of word.toLowerCase()) {
            if (!node.children[char]) return null;
            node = node.children[char];
        }
        return node;
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
            if (found) return;
        }
    }

    dfs(root, '');
    return word;
}

// 3. INITIALIZE TRIE WITH SAMPLE WORDS

const trie = new Trie();

// ensure edgeElements exists (used in draw function)

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
    "energy", "engine", "engineer",
    "function", "fun", "fundamental",
    "graph", "graphic", "graphics",
    "hello", "help", "helicopter",
    "internet", "internal", "international",
    "java", "javascript", "jazz",
    "keyboard", "key", "kettle",
    "lambda", "landscape", "language",
    "machine", "machinelearning", "macro",
    "network", "net", "neural",
    "object", "objective", "obstacle",
    "python", "pyramid", "pyrotechnics",
    "query", "queue", "quantum",
    "robot", "robust", "rocket",
    "security", "secure", "segment",
    "tree", "trie", "trigger",
    "user", "usage", "utility",
    "vector", "velocity", "vehicle",
    "web", "website", "webinar",
    "xml", "xylophone", "xenon",
    "yaml", "yacht", "yarn",
    "zebra", "zenith", "zephyr"
];

words.forEach(w => trie.insert(w)); // equal frequency for simplicity

// 4. AUTOCOMPLETE UI LOGIC

const input = document.getElementById('trie-input');
const suggestions = document.getElementById('suggestions');

if (!input) {
    // if demo page is missing input, avoid script errors
    console.warn('trie-demo.js: #trie-input not found in DOM - autocomplete UI will be inactive.');
}

if (input) {
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
            li.innerHTML = `<strong>${query}</strong>${word.slice(query.length)}`;

            li.addEventListener("click", () => {
                // increase weight for clicked word boosting future suggestions
                const node = trie.getNode(word);
                if (node) node.weight = (node.weight || 0) + 1; // increment weight to boost future suggestions

                input.value = word;
                suggestions.innerHTML = "";

                // highlight path in SVG
                highlightWordInSVG(word); // highlight the selected word
                drawTrieSVG(trie, 'trie-svg')
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
}


// 5. SVG TRIE DIAGRAM RENDERING

const svgNS = "http://www.w3.org/2000/svg";
const nodeElementsMap = new Map(); // needed for highlight -- Map<trieNode, {circle, parentLine}>
const edgeElements = []; // store edge elements for animation

function drawTrieSVG(trie, svgId) { // render trie structure as SVG
    const svg = document.getElementById(svgId);
    if (!svg) return; // guard (SVG missing)
    svg.innerHTML = "";
    nodeElementsMap.clear();
    edgeElements.length = 0;

    const nodeRadius = 18;
    const horizontalSpacing = 70;
    const verticalSpacing = 70;

    // Calculate layout positions
    function layout(node, depth = 0, x = 0, parentLetter = '') {
        const keys = Object.keys(node.children).sort();
        const positions = [];

        if (keys.length === 0) {
            positions.push({ node, x, depth, letter: parentLetter });
            return {positions, width: 1};
        }

        let totalWidth = 0;
        let childX = x;

        keys.forEach(key => {
            const child = node.children[key];
            const { positions: childPositions, width: childWidth } = layout(child, depth + 1, childX, key);

            positions.push(...childPositions);
            childX += childWidth * horizontalSpacing; // horizontalSpacing
            totalWidth += childWidth;
        });

        const mid = x + (totalWidth * 70 - 70) / 2; // centering node above its children
        positions.push({ node, x: mid, depth, letter: parentLetter });

        return { positions, width: totalWidth }; // return accumulated positions
    }

    const { positions } = layout(trie.root); // get all node positions

    // fallbadck if positions empty
    if (!positions || positions.length === 0) {
        // create placeholder text
        const placeholder = document.createElementNS(svgNS, 'text');
        placeholder.setAttribute('x', 20);
        placeholder.setAttribute('y', 30);
        placeholder.setAttribute('fill', '#fff');
        placeholder.textContent= 'No nodes to render';
        svg.appendChild(placeholder);
        return;
    }

    // compute extents
    const xs = positions.map(p => Number(p.x) || 0);
    const depths = positions.map(p => Number(p.depth) || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const maxDepth = Math.max(...depths);

    // padding
    const pad = nodeRadius * 3;
    const svgWidth = Math.max(800, Math.ceil(maxX - minX + pad * 2));
    const svgHeight = Math.ceil((maxDepth + 1) * verticalSpacing + pad);

    // set viewBox (scales nicely) and explicit height so wrapper can scroll horizontally
    svg.setAttribute('viewBox', `${minX - pad} 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    svg.style.width = svgWidth + 'px'; // explicit css width so wrapper's horizontal scroll works
    svg.style.height = svgHeight + 'px';

    // temporary map childNode -> its parent line for later node mapping
    const parentLineForNode = new Map();

    // Draw edges first (so nodes sit on top)
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

            line.classList.add("trie-edge");
            svg.appendChild(line);
            edgeElements.push(line); // store for animation

            // map child node to its parent line
            parentLineForNode.set(child, line);
        }
    });

    // Draw nodes
    positions.forEach(pos => {
        const { node, x, depth, letter } = pos;

        const circle = document.createElementNS(svgNS, 'circle');

        // scale radius by weight (safe numeric fallback)
        const r = Math.max(10, nodeRadius + (Number(node.weight) || 0) * 2); // size by weight, keep minimum radius
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', depth * verticalSpacing);
        circle.setAttribute('r', r);

        circle.setAttribute('fill', node.isEnd ? '#4da6ff' : '#11141a');
        circle.setAttribute('stroke', '#4da6ff');
        circle.setAttribute('stroke-width', 2);
        circle.classList.add("trie-node"); // for animation

        // attach node reference for later highlight (store node ref on element)
        circle.__trie_node_ref = node;

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

        // Tooltip for end nodes
        if (node.isEnd) {
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = node.path || getWordFromNode(node, trie.root) || ''; // use stored path (this becomes O(1) and is better for larger tries as opposed to O(N) DFS search)
            circle.appendChild(title);
        }

        // parent line (if any) from the map
        const parentLine = parentLineForNode.get(node) || null;

        // finally setting mapping for this node
        nodeElementsMap.set(node, { circle, parentLine });
    });

    // trigger fade-in of nodes + edges (css classes)
    requestAnimationFrame(() => {
        document.querySelectorAll('.trie-node').forEach(n => n.classList.add('visible'));
        document.querySelectorAll('.trie-edge').forEach(e => e.classList.add('visible'));
    });
}

// Highlighting, keyboard navigation, and load
function getAccentColor() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#ff6b6b';
    return String(raw).trim() || '#ff6b6b';
}

// highlight path for a given word: pulse nodes and color edges
function highlightWordInSVG(word) {
    const accent = getAccentColor();

    // clear previous animation classes quickly
    nodeElementsMap.forEach((data) => {
        if (data && data.circle) {
            data.circle.classList.remove('pulse-highlight', 'active-highlight');
        }
        if (data && data.parentLine) {
            data.parentLine.classList.remove('active-highlight');
            data.parentLine.setAttribute('stroke', '#4da6ff'); // reset base stroke
        }
    });

    let node = trie.root;

    for (let char of word.toLowerCase()) {
        if (!node.children[char]) return; // no path found
        node = node.children[char];

        const nodeData = nodeElementsMap.get(node);
        if (nodeData && nodeData.circle) {
            // color the node and pulse
            nodeData.circle.setAttribute('fill', accent);
            nodeData.circle.classList.add("pulse-highlight"); // add highlight

            // color parent edge if present
            if (nodeData.parentLine) {
                nodeData.parentLine.setAttribute('stroke', accent);
                nodeData.parentLine.classList.add('active-highlight');
            }
        }
    }

    // after a short period, remove pulse but keep accent fill for a short while
    setTimeout(() => {
        nodeElementsMap.forEach((data) => {
            if (data && data.circle) {
                data.circle.classList.remove('pulse-highlight');
            }
        });
    }, 700);
}

// 6. INPUT-BASED PATH HIGHLIGHTING

if (input) {
    input.addEventListener('input', () => { // on input change
        const query = input.value.trim().toLowerCase();

        // reset all nodes and edges to base color
        nodeElementsMap.forEach((data) => {
            if (!data || !data.circle) return;
            data.circle.setAttribute('fill', data.circle.__trie_node_ref && data.circle.__trie_node_ref.isEnd ? '#4da6ff' : '#11141a');
            if (data.parentLine) data.parentLine.setAttribute('stroke', '#4da6ff');
        });

        if (!query) return;

        let node = trie.root;
        for (let char of query) {
            if (!node.children[char]) return;
            node = node.children[char];

            const nodeData = nodeElementsMap.get(node);
            if (nodeData) {
                const accent = getAccentColor();
                nodeData.circle.setAttribute('fill', accent);
                if (nodeData.parentLine) nodeData.parentLine.setAttribute('stroke', accent);
            }
        }
    });    
}

// 7. KEYBOARD NAVIGATION FOR SUGGESTIONS

let selectedIndex = -1;

if (input) {
    input.addEventListener("keydown", (e) => { // handle arrow keys and enter
        const items = Array.from(suggestions.querySelectorAll("li"));

        if (items.length === 0) return;

        if (e.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % items.length;
            e.preventDefault();
        } 
        else if (e.key === "ArrowUp") {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            e.preventDefault();
        } 
        else if (e.key === "Enter" && selectedIndex >= 0) {
            const chosen = items[selectedIndex].innerText;
            input.value = chosen;
            suggestions.innerHTML = "";

            // boost weight and update trie visualization
            const node = trie.getNode(chosen);
            if (node) node.weight = (node.weight || 0) + 1;
            highlightWordInSVG(chosen);
            drawTrieSVG(trie, 'trie-svg');

            selectedIndex = -1;
            e.preventDefault();
            return;
        } 
        else {
            return;
        }

        items.forEach((item, i) => item.classList.toggle("active", i === selectedIndex));
    });
}

// 8. DRAW TRIE SVG ON PAGE LOAD

// run when DOM ready (if file loaded at head, ensure svg exists)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => drawTrieSVG(trie, 'trie-svg'));
} else {
    drawTrieSVG(trie, 'trie-svg'); // render trie diagram
}


// End of trie-demo.js

/* ============================================================
   END OF TRIE AUTOCOMPLETE DEMO WITH SVG VISUALIZATION
   ============================================================ */

