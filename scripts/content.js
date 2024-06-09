chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "reload") {
    window.location.reload();
  }
});

// Functioning of toolbar
function createToolbar() {
  const toolbar = document.createElement("div");
  toolbar.id = "annotator-toolbar";
  toolbar.innerHTML = `
        <button id="highlight-btn">Highlighter</button>
        <button id="pen-btn">Pen</button>
        <button id="note-btn">Add Note</button>
        <button id="export-btn">Export</button>
        <div id="color-picker">
          <button class="color-option" data-color="yellow" style="background-color: yellow;"></button>
          <button class="color-option" data-color="#00ffff" style="background-color: cyan;"></button>
          <button class="color-option" data-color="#7fff00" style="background-color: chartreuse;"></button>
          <button class="color-option" data-color="pink" style="background-color: pink;"></button>
        </div>
    `;
  document.body.appendChild(toolbar);
  makeToolbarDraggable(toolbar);
}

// Creating My Toolbar for smooth annotation on webpage
createToolbar();

document.body.addEventListener("click", (event) => {
  const target = event.target;
  if (target.matches("#highlight-btn")) {
    showColorPicker();
  } else if (target.matches("#pen-btn")) {
    togglePenMode();
  } else if (target.matches("#note-btn")) {
    addNote();
  } else if (target.matches("#export-btn")) {
    exportAnnotations();
  } else if (target.matches(".color-option")) {
    const color = target.getAttribute("data-color");
    activateHighlight(color);
  }
});

// Show color picker
function showColorPicker() {
  const colorPicker = document.getElementById("color-picker");
  colorPicker.classList.toggle("show");
}

// Variable to keep track of pen mode
let isPenModeActive = false;
let isDrawing = false;
let penCanvas, penContext;

// Activate highlight mode
function activateHighlight(color = "yellow") {
  document.addEventListener(
    "mouseup",
    (event) => {
      const selection = window.getSelection();
      if (selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.style.backgroundColor = color;
        range.surroundContents(span);
        saveHighlight(span.outerHTML);
      }
    },
    { once: true }
  );
}

// Toggle pen mode
function togglePenMode() {
  if (isPenModeActive) {
    deactivatePen();
  } else {
    activatePen();
  }
}

// Activate pen mode
function activatePen() {
  isPenModeActive = true;

  penCanvas = document.createElement("canvas");
  penCanvas.id = "pen-canvas";
  penCanvas.width = window.innerWidth;
  penCanvas.height = document.body.scrollHeight;
  penCanvas.style.position = "absolute";
  penCanvas.style.top = "0";
  penCanvas.style.left = "0";
  penCanvas.style.zIndex = "100";
  penCanvas.style.background = "transparent";

  document.body.appendChild(penCanvas);
  penContext = penCanvas.getContext("2d");
  penContext.lineWidth = 5;
  penContext.lineCap = "round";
  penContext.strokeStyle = "#000";

  penCanvas.addEventListener("mousedown", startDrawing);
  penCanvas.addEventListener("mousemove", draw);
  penCanvas.addEventListener("mouseup", stopDrawing);
  penCanvas.addEventListener("mouseleave", stopDrawing);
}

// Start drawing with pen
function startDrawing(event) {
  isDrawing = true;
  penContext.beginPath();
  penContext.moveTo(event.clientX, event.clientY + window.scrollY);
}

// Draw with pen
function draw(event) {
  if (!isDrawing) {
    return;
  }
  penContext.lineTo(event.clientX, event.clientY + window.scrollY);
  penContext.stroke();
}

// Stop drawing with pen
function stopDrawing() {
  isDrawing = false;
  penContext.closePath();
}

// Deactivate pen mode
function deactivatePen() {
  isPenModeActive = false;
  if (penCanvas) {
    penCanvas.remove();
  }
}

// Saving highlight
function saveHighlight(highlightHtml) {
  chrome.storage.local.get(["highlights"], (result) => {
    const highlights = result.highlights || [];
    highlights.push({
      content: highlightHtml,
      timestamp: new Date().toLocaleString(),
    });
    chrome.storage.local.set({ highlights: highlights });
  });
}

// Add note
function addNote() {
  const noteText = prompt("Enter your note:");
  if (noteText) {
    const noteElement = document.createElement("div");
    noteElement.className = "note";
    noteElement.textContent = noteText;
    noteElement.style.position = "absolute";
    noteElement.style.top = "150px";
    noteElement.style.left = "150px";
    noteElement.style.background = "#fff";
    noteElement.style.padding = "10px";
    noteElement.style.fontWeight = "600";
    noteElement.style.fontSize = "15px";
    noteElement.style.border = "1px solid #ccc";
    noteElement.style.borderRadius = "5px";
    noteElement.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    noteElement.style.zIndex = "100";
    document.body.appendChild(noteElement);
    saveNoteToStorage(noteText, { top: 50, left: 50 });

    let isDragging = false;
    let initialX, initialY;
    let xOffset = 0,
      yOffset = 0;

    noteElement.addEventListener("mousedown", startDragging);

    function startDragging(e) {
      isDragging = true;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      document.addEventListener("mousemove", dragNote);
      document.addEventListener("mouseup", stopDragging);
    }

    function dragNote(e) {
      if (isDragging) {
        e.preventDefault();
        xOffset = e.clientX - initialX;
        yOffset = e.clientY - initialY;
        setTranslate(xOffset, yOffset, noteElement);
      }
    }

    function stopDragging() {
      isDragging = false;
      document.removeEventListener("mousemove", dragNote);
      document.removeEventListener("mouseup", stopDragging);
      saveNotePosition(noteElement, { top: yOffset, left: xOffset });
    }

    function setTranslate(xPos, yPos, el) {
      el.style.left = xPos + "px";
      el.style.top = yPos + "px";
    }
  }
}

// Saving note
function saveNoteToStorage(noteText, position) {
  chrome.storage.local.get(["notes"], (result) => {
    const notes = result.notes || [];
    notes.push({
      content: noteText,
      position: position,
      timestamp: new Date().toLocaleString(),
    });
    chrome.storage.local.set({ notes: notes });
  });
}

// Load highlights and notes from storage
chrome.storage.local.get(["highlights", "notes"], (result) => {
  const highlights = result.highlights || [];
  const notes = result.notes || [];

  highlights.forEach((highlight) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = highlight.content;
    const span = tempDiv.firstChild;
    document.body.innerHTML = document.body.innerHTML.replace(
      span.innerHTML,
      span.outerHTML
    );
  });

  notes.forEach((note) => {
    const noteElement = document.createElement("div");
    noteElement.className = "note";
    noteElement.textContent = note.content;
    noteElement.style.position = "absolute";
    noteElement.style.top = note.position.top + "px";
    noteElement.style.left = note.position.left + "px";
    noteElement.style.fontWeight = "600";
    noteElement.style.fontSize = "15px";
    noteElement.style.background = "#fff";
    noteElement.style.padding = "10px";
    noteElement.style.border = "1px solid #ccc";
    noteElement.style.borderRadius = "5px";
    noteElement.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";

    document.body.appendChild(noteElement);
    makeNoteDraggable(noteElement, note.position);
  });
});

// Make note draggable
function makeNoteDraggable(noteElement, position) {
  let isDragging = false;
  let initialX, initialY;
  let xOffset = position.left,
    yOffset = position.top;

  noteElement.addEventListener("mousedown", startDragging);

  function startDragging(e) {
    isDragging = true;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    document.addEventListener("mousemove", dragNote);
    document.addEventListener("mouseup", stopDragging);
  }

  function dragNote(e) {
    if (isDragging) {
      e.preventDefault();
      xOffset = e.clientX - initialX;
      yOffset = e.clientY - initialY;
      setTranslate(xOffset, yOffset, noteElement);
    }
  }

  function stopDragging() {
    isDragging = false;
    document.removeEventListener("mousemove", dragNote);
    document.removeEventListener("mouseup", stopDragging);
    saveNotePosition(noteElement, { top: yOffset, left: xOffset });
  }

  function setTranslate(xPos, yPos, el) {
    el.style.left = xPos + "px";
    el.style.top = yPos + "px";
  }
}

// Save note position to storage
function saveNotePosition(noteEl, position) {
  chrome.storage.local.get(["notes"], (result) => {
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(
      (note) => note.content === noteEl.textContent
    );
    if (noteIndex !== -1) {
      notes[noteIndex].position = position;
      chrome.storage.local.set({ notes: notes });
    }
  });
}

// Listen for delete messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "delete") {
    const { index } = request;
    deleteHighlight(index);
  }
});

// Delete highlight
function deleteHighlight(index) {
  chrome.storage.local.get(["highlights"], (result) => {
    let highlights = result.highlights || [];
    if (index >= 0 && index < highlights.length) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = highlights[index].content;
      const span = tempDiv.firstChild;
      const content = span.innerHTML;
      document.body.innerHTML = document.body.innerHTML.replace(
        span.outerHTML,
        content
      );
      highlights.splice(index, 1);
      chrome.storage.local.set({ highlights: highlights });
    }
  });
}

// Export annotations
function exportAnnotations() {
  // Create a new HTML document
  const exportDoc =
    document.implementation.createHTMLDocument("Annotated Page");

  // Clone the head and body of the current document to the new document
  exportDoc.head.innerHTML = document.head.innerHTML;
  exportDoc.body.innerHTML = document.body.innerHTML;

  // Remove toolbar from exported document
  const toolbarElement = exportDoc.getElementById("annotator-toolbar");
  if (toolbarElement) {
    toolbarElement.remove();
  }

  // Create a blob from the HTML content
  const htmlContent = exportDoc.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: "text/html" });

  // Create a download link and trigger the download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "annotated_page.html";
  a.click();

  // Revoke the object URL to free up resources
  URL.revokeObjectURL(url);
}

// Making My toolbar draggable
function makeToolbarDraggable(toolbar) {
  let isDragging = false;
  let initialX, initialY;
  let xOffset = 0,
    yOffset = 0;

  toolbar.addEventListener("mousedown", startDragging);

  function startDragging(e) {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    document.addEventListener("mousemove", dragToolbar);
    document.addEventListener("mouseup", stopDragging);
  }

  function dragToolbar(e) {
    if (isDragging) {
      e.preventDefault();
      xOffset = e.clientX - initialX;
      yOffset = e.clientY - initialY;
      setTranslate(xOffset, yOffset, toolbar);
    }
  }

  function stopDragging() {
    isDragging = false;
    document.removeEventListener("mousemove", dragToolbar);
    document.removeEventListener("mouseup", stopDragging);
  }

  function setTranslate(xPos, yPos, el) {
    el.style.right = "auto";
    el.style.left = xPos + "px";
    el.style.top = yPos + "px";
  }
}
